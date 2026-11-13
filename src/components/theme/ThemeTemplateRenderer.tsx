import type { CmsTheme, ThemeTemplateDocument } from "@spree/sdk";
import type { CSSProperties, ReactNode } from "react";
import {
  isMarketplaceSectionType,
  renderMarketplaceSection,
} from "@/components/theme/render-marketplace-sections";
import { renderResourceSection } from "@/components/theme/render-resource-sections";
import { ProductDescriptionTabs } from "@/components/theme/resource/ProductDescriptionTabs";
import { ProductUpsellBundle } from "@/components/theme/resource/ProductUpsellBundle";
import { ThemeBlockRenderer } from "@/components/theme/ThemeBlockRenderer";
import {
  type SlideshowSettings,
  ThemeSlideshow,
} from "@/components/theme/ThemeSlideshow";
import { themeSettingEnabled } from "@/lib/theme/setting-value";
import type {
  ThemeRenderContext,
  ThemeSectionInstance,
} from "@/lib/theme/types";

function toWire(section: ThemeSectionInstance, heroBlocks?: ReactNode) {
  return {
    id: section.section_id,
    type: section.section_type,
    disabled: section.disabled,
    settings: section.settings,
    heroBlocks,
    blocks: section.blocks,
    blockOrder: section.block_order,
  };
}

export async function ThemeTemplateRenderer({
  data,
  context,
  theme,
  editorMode = false,
}: {
  data: ThemeTemplateDocument;
  context: ThemeRenderContext;
  theme?: CmsTheme | null;
  editorMode?: boolean;
}) {
  const sections = data.sections || {};
  const order = data.order || [];
  const deferProductDiscoveryToFooter = context.kind === "product";
  const enabledProductSections = order.filter(
    (id) =>
      ["product", "product_main"].includes(sections[id]?.type || "") &&
      !themeSettingEnabled(sections[id]?.disabled),
  );
  const enabledReviewSections = order.filter(
    (id) =>
      sections[id]?.type === "product_reviews" &&
      !themeSettingEnabled(sections[id]?.disabled),
  );
  const mainSection =
    enabledProductSections.length === 1
      ? sections[enabledProductSections[0]]
      : undefined;
  const mainVisibility =
    (
      mainSection as typeof mainSection & {
        visibility?: { mobile?: boolean; tablet?: boolean; desktop?: boolean };
      }
    )?.visibility ??
    (mainSection?.settings?.visibility as
      | { mobile?: boolean; tablet?: boolean; desktop?: boolean }
      | undefined);
  const mainVisibleEverywhere =
    mainSection &&
    [
      mainVisibility?.mobile ?? mainSection.settings?.mobileVisible,
      mainVisibility?.tablet ?? mainSection.settings?.tabletVisible,
      mainVisibility?.desktop ?? mainSection.settings?.desktopVisible,
    ].every((value) => themeSettingEnabled(value, true));
  // Preserve the editor's section boundaries and avoid guessing when a template
  // contains multiple product or review sections.
  const embeddedReviewId =
    !editorMode &&
    context.kind === "product" &&
    mainVisibleEverywhere &&
    enabledReviewSections.length === 1 &&
    !sections[enabledReviewSections[0]]?.block_order?.length
      ? enabledReviewSections[0]
      : undefined;
  const embeddedReview = embeddedReviewId
    ? sections[embeddedReviewId]
    : undefined;

  const configuredResourceSections = {
    deferToFooterDiscovery: deferProductDiscoveryToFooter,
    hasRelated: order.some((id) =>
      ["related_products", "more_from_shop"].includes(sections[id]?.type || ""),
    ),
    hasRecommended: order.some((id) =>
      ["recommended_products", "product_recommendations"].includes(
        sections[id]?.type || "",
      ),
    ),
    hasRecentlyViewed: order.some(
      (id) => sections[id]?.type === "recently_viewed_products",
    ),
    hasProductReviews: order.some(
      (id) =>
        sections[id]?.type === "product_reviews" &&
        !themeSettingEnabled(sections[id]?.disabled),
    ),
    embeddedProductReview: embeddedReview
      ? {
          settings: embeddedReview.settings || {},
          visibility:
            (
              embeddedReview as typeof embeddedReview & {
                visibility?: {
                  mobile?: boolean;
                  tablet?: boolean;
                  desktop?: boolean;
                };
              }
            ).visibility ??
            (embeddedReview.settings?.visibility as
              | { mobile?: boolean; tablet?: boolean; desktop?: boolean }
              | undefined),
        }
      : undefined,
    hasCollectionBanner: order.some(
      (id) => sections[id]?.type === "collection_banner",
    ),
    hasCollectionBreadcrumbs: order.some(
      (id) => sections[id]?.type === "collection_breadcrumbs",
    ),
  };

  const rendered = await Promise.all(
    order.map(async (sectionId) => {
      const raw = sections[sectionId];
      if (!raw || (themeSettingEnabled(raw.disabled) && !editorMode))
        return null;
      if (
        !editorMode &&
        context.kind === "product" &&
        raw.type === "product_details"
      )
        return null;
      if (sectionId === embeddedReviewId) return null;
      const visibility =
        (
          raw as typeof raw & {
            visibility?: {
              desktop?: boolean;
              tablet?: boolean;
              mobile?: boolean;
            };
          }
        ).visibility ||
        (raw.settings?.visibility as
          | { desktop?: boolean; tablet?: boolean; mobile?: boolean }
          | undefined);
      const deviceVisibility = {
        mobile: themeSettingEnabled(
          visibility?.mobile ?? raw.settings?.mobileVisible,
          true,
        ),
        tablet: themeSettingEnabled(
          visibility?.tablet ?? raw.settings?.tabletVisible,
          true,
        ),
        desktop: themeSettingEnabled(
          visibility?.desktop ?? raw.settings?.desktopVisible,
          true,
        ),
      };

      const section: ThemeSectionInstance = {
        section_id: sectionId,
        section_type: raw.type,
        settings: raw.settings || {},
        blocks: (raw.blocks || {}) as ThemeSectionInstance["blocks"],
        block_order: raw.block_order || [],
        disabled: editorMode ? false : themeSettingEnabled(raw.disabled),
      };

      try {
        const chromeSection =
          section.section_type === "theme_header" ||
          section.section_type === "theme_footer" ||
          section.section_type === "featured_collection";
        const visitedBlocks = new Set<string>();
        const renderedBlockNodes = new Map<string, ReactNode>();
        const renderBlocks = async (
          parentId?: string,
        ): Promise<ReactNode[]> => {
          if (chromeSection) return [];
          const renderedBlocks: ReactNode[] = [];
          for (const blockId of section.block_order.filter(
            (id) => section.blocks[id]?.parent_id === parentId,
          )) {
            const block = section.blocks[blockId];
            if (
              !block ||
              themeSettingEnabled(block.disabled) ||
              visitedBlocks.has(blockId)
            )
              continue;
            if (
              !editorMode &&
              context.kind === "product" &&
              isConditionalProductBlock(block.type) &&
              !supportsProductBlock(block.type, context.product)
            )
              continue;
            if (
              ["slideshow", "slideshow_split"].includes(section.section_type) &&
              block.type === "slideshow_controls"
            )
              continue;
            if (
              [
                "category_tiles",
                "collection_tiles",
                "collections_list",
                "collection_gradient_overlay",
                "collection_text_below",
                "collection_text_hover",
                "collection_text_overlay",
              ].includes(section.section_type) &&
              ["category_card", "collection_card"].includes(block.type)
            )
              continue;
            if (
              ["product_main", "product"].includes(section.section_type) &&
              block.type === "countdown" &&
              !themeSettingEnabled(
                theme?.settings?.product_page?.show_countdown,
              )
            )
              continue;
            visitedBlocks.add(blockId);
            if (
              ["product_main", "product"].includes(section.section_type) &&
              block.type === "media" &&
              !parentId
            )
              continue;
            const children = await renderBlocks(blockId);
            const content =
              block.type === "upsell_bundle" && context.kind === "product" ? (
                await ProductUpsellBundle({
                  productId: context.product.id,
                  heading: String(
                    block.settings.heading || "Frequently bought together",
                  ),
                  count: Number(block.settings.product_count) || 3,
                  basePath: context.basePath,
                  currency: context.product.price?.currency || context.currency,
                })
              ) : block.type === "description_tabs" &&
                context.kind === "product" ? (
                <ProductDescriptionTabs
                  product={context.product}
                  settings={block.settings}
                />
              ) : (
                <ThemeBlockRenderer
                  block={block}
                  context={context}
                  sectionType={section.section_type}
                  blockId={blockId}
                >
                  {children.length ? children : undefined}
                </ThemeBlockRenderer>
              );
            const renderedBlock = (
              <div
                key={blockId}
                className={
                  !editorMode && section.section_type === "product"
                    ? "contents"
                    : undefined
                }
                data-theme-block-id={blockId}
                data-theme-block-type={editorMode ? block.type : undefined}
                data-theme-collection-filter-block={
                  block.type === "collection_sidebar_filters"
                    ? "true"
                    : undefined
                }
                data-theme-collection-filter-heading={
                  block.type === "collection_sidebar_filters" &&
                  typeof block.settings.heading === "string"
                    ? block.settings.heading
                    : undefined
                }
              >
                {!editorMode && section.section_type === "product" ? (
                  content ? (
                    <div className="block">{content}</div>
                  ) : null
                ) : editorMode &&
                  context.kind === "product" &&
                  isConditionalProductBlock(block.type) &&
                  !supportsProductBlock(block.type, context.product) ? (
                  <span
                    className="text-xs text-gray-500"
                    data-editor-only-product-capability="true"
                  >
                    Not available for this preview product
                  </span>
                ) : (
                  content
                )}
              </div>
            );
            renderedBlockNodes.set(blockId, renderedBlock);
            renderedBlocks.push(renderedBlock);
          }
          return renderedBlocks;
        };
        const blocks = await renderBlocks();

        if (["slideshow", "slideshow_split"].includes(section.section_type)) {
          const slideIds = section.block_order.filter(
            (id) =>
              section.blocks[id]?.type === "slide" &&
              !section.blocks[id]?.parent_id &&
              !themeSettingEnabled(section.blocks[id]?.disabled),
          );
          if (slideIds.length) {
            const controls = section.block_order
              .map((id) => section.blocks[id])
              .find(
                (block) =>
                  block?.type === "slideshow_controls" &&
                  !themeSettingEnabled(block.disabled),
              );
            return (
              <div
                key={sectionId}
                data-theme-section-id={editorMode ? sectionId : undefined}
                data-theme-section-type={
                  editorMode ? section.section_type : undefined
                }
                data-theme-section-visibility-mobile={
                  deviceVisibility.mobile ? "true" : "false"
                }
                data-theme-section-visibility-tablet={
                  deviceVisibility.tablet ? "true" : "false"
                }
                data-theme-section-visibility-desktop={
                  deviceVisibility.desktop ? "true" : "false"
                }
                data-theme-section-animation="true"
                style={{
                  ...sectionPresentation(section.settings),
                  ...(section.settings.background_enabled === true
                    ? {}
                    : { backgroundColor: undefined }),
                  ...(themeSettingEnabled(raw.disabled)
                    ? { display: "none" }
                    : {}),
                }}
              >
                <ThemeSlideshow
                  slides={slideIds
                    .map((id) => renderedBlockNodes.get(id))
                    .filter((node): node is ReactNode => Boolean(node))}
                  settings={section.settings as SlideshowSettings}
                  label={
                    section.section_type === "slideshow_split"
                      ? "Split slideshow"
                      : "Slideshow"
                  }
                  controls={
                    controls
                      ? {
                          style: String(controls.settings.style || "arrows"),
                          background: String(
                            controls.settings.background || "none",
                          ),
                        }
                      : undefined
                  }
                />
              </div>
            );
          }
        }

        const productMediaBlockId = ["product_main", "product"].includes(
          section.section_type,
        )
          ? section.block_order.find(
              (id) =>
                section.blocks[id]?.type === "media" &&
                !section.blocks[id]?.parent_id &&
                !themeSettingEnabled(section.blocks[id]?.disabled),
            )
          : undefined;
        const productBlocksActive =
          ["product_main", "product"].includes(section.section_type) &&
          section.block_order.some((id) => Boolean(section.blocks[id]));
        const productDescriptionBlockPresent =
          ["product_main", "product"].includes(section.section_type) &&
          (section.section_type === "product" ||
            section.block_order.some((id) => {
              const block = section.blocks[id];
              return (
                block?.type === "description_tabs" &&
                !themeSettingEnabled(block.disabled)
              );
            }));
        const productPersonalizationBlockPresent =
          ["product_main", "product"].includes(section.section_type) &&
          section.block_order.some((id) => {
            const block = section.blocks[id];
            return (
              block?.type === "product_personalization" &&
              !themeSettingEnabled(block.disabled)
            );
          });
        const resource = await renderResourceSection(
          section,
          context,
          theme,
          configuredResourceSections,
          section.section_type === "collection_main" ? blocks : undefined,
          ["product_main", "product"].includes(section.section_type)
            ? blocks
            : undefined,
          productMediaBlockId
            ? section.blocks[productMediaBlockId]?.settings
            : undefined,
          productBlocksActive,
          editorMode ? productMediaBlockId : undefined,
          productDescriptionBlockPresent,
          productPersonalizationBlockPresent,
        );
        if (resource)
          return (
            <div
              key={sectionId}
              data-theme-section-id={editorMode ? sectionId : undefined}
              data-theme-section-type={
                editorMode ? section.section_type : undefined
              }
              data-theme-section-animation="true"
              data-theme-section-visibility-mobile={
                deviceVisibility.mobile ? "true" : "false"
              }
              data-theme-section-visibility-tablet={
                deviceVisibility.tablet ? "true" : "false"
              }
              data-theme-section-visibility-desktop={
                deviceVisibility.desktop ? "true" : "false"
              }
              style={
                themeSettingEnabled(raw.disabled)
                  ? { display: "none" }
                  : undefined
              }
            >
              {resource}
              {blocks.length > 0 &&
              section.section_type !== "announcement_bar" &&
              section.section_type !== "collection_main" &&
              !["product_main", "product"].includes(section.section_type) ? (
                <div className="space-y-2">{blocks}</div>
              ) : null}
            </div>
          );

        if (
          !editorMode &&
          ["product_description", "product_shipping"].includes(
            section.section_type,
          )
        )
          return null;

        const body = await renderMarketplaceSection(
          toWire(section, blocks.length ? blocks : undefined),
          context,
        );
        if (!body && blocks.length === 0 && !editorMode) return null;

        return (
          <div
            key={sectionId}
            data-theme-section-id={editorMode ? sectionId : undefined}
            data-theme-section-type={
              editorMode ? section.section_type : undefined
            }
            data-theme-section-visibility-mobile={
              deviceVisibility.mobile ? "true" : "false"
            }
            data-theme-section-visibility-tablet={
              deviceVisibility.tablet ? "true" : "false"
            }
            data-theme-section-visibility-desktop={
              deviceVisibility.desktop ? "true" : "false"
            }
            data-theme-section-animation="true"
            style={{
              ...sectionPresentation(section.settings),
              ...(themeSettingEnabled(raw.disabled) ? { display: "none" } : {}),
            }}
            data-theme-section-style={section.section_id.replace(
              /[^a-zA-Z0-9_-]/g,
              "",
            )}
            data-theme-section-width={
              section.settings.width === "full" ||
              section.settings.section_width === "full"
                ? "full"
                : "page"
            }
          >
            {scopedSectionCss(
              section.section_id,
              section.settings.custom_css,
            ) ? (
              <style>
                {scopedSectionCss(
                  section.section_id,
                  section.settings.custom_css,
                )}
              </style>
            ) : null}
            {body ||
              (editorMode ? (
                <div className="border border-dashed p-8 text-sm">
                  {isMarketplaceSectionType(section.section_type)
                    ? "No items are selected yet. Choose content in this section’s settings."
                    : `Unsupported section: ${section.section_type}`}
                </div>
              ) : null)}
            {blocks.length > 0 && section.section_type !== "hero" ? (
              <div className="space-y-3">{blocks}</div>
            ) : null}
          </div>
        );
      } catch (error) {
        console.error(`[theme] section ${sectionId} failed`, error);
        return null;
      }
    }),
  );

  return (
    <>
      <style>{`@media (max-width: 767px) { [data-theme-section-visibility-mobile="false"] { display: none !important; } } @media (min-width: 768px) and (max-width: 1023px) { [data-theme-section-visibility-tablet="false"] { display: none !important; } } @media (min-width: 1024px) { [data-theme-section-visibility-desktop="false"] { display: none !important; } }`}</style>
      {rendered}
    </>
  );
}

function isConditionalProductBlock(type: string) {
  return [
    "product_personalization",
    "product_proof",
    "product_custom_order",
  ].includes(type);
}

function supportsProductBlock(
  type: string,
  product: Extract<ThemeRenderContext, { kind: "product" }>["product"],
) {
  if (type === "product_personalization")
    return (product.personalization_fields?.length || 0) > 0;
  if (type === "product_proof") return Boolean(product.proof_required);
  if (type === "product_custom_order")
    return Boolean(product.seller?.accepts_custom_orders && product.seller_id);
  return true;
}

function sectionPresentation(settings: Record<string, unknown>): CSSProperties {
  const background =
    typeof settings.background_color === "string"
      ? settings.background_color
      : "";
  const text =
    typeof settings.text_color === "string" ? settings.text_color : "";
  return {
    backgroundColor: /^#[0-9a-fA-F]{6}$/.test(background)
      ? background
      : background === "palette" || background === "default"
        ? "var(--marketplace-background, #ffffff)"
        : undefined,
    color: /^#[0-9a-fA-F]{6}$/.test(text)
      ? text
      : text === "palette"
        ? "var(--marketplace-foreground)"
        : undefined,
    textAlign: ["left", "center", "right"].includes(String(settings.alignment))
      ? (settings.alignment as CSSProperties["textAlign"])
      : undefined,
  };
}

function scopedSectionCss(sectionId: string, value: unknown): string {
  if (
    typeof value !== "string" ||
    /@import|url\s*\(|expression\s*\(|<\/style|javascript:/i.test(value)
  )
    return "";
  const safeId = sectionId.replace(/[^a-zA-Z0-9_-]/g, "");
  return value.replace(
    /([^{}]+)\{([^{}]*)\}/g,
    (_rule, selectors: string, declarations: string) => {
      if (selectors.trim().startsWith("@")) return "";
      return `${selectors
        .split(",")
        .map(
          (selector) =>
            `[data-theme-section-style="${safeId}"] ${selector.trim()}`,
        )
        .join(", ")} {${declarations}}`;
    },
  );
}
