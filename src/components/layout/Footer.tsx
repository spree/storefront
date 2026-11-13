import type { Category } from "@spree/sdk";
import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { CSSProperties, ReactNode } from "react";
import {
  PaymentIcon,
  type PaymentType,
} from "react-svg-credit-card-payment-icons";
import { FooterContactForm } from "@/components/layout/FooterContactForm";
import { FooterEmailSignup } from "@/components/layout/FooterEmailSignup";
import { GlobalSocialLinks } from "@/components/layout/GlobalSocialLinks";
import { RegionPreferences } from "@/components/layout/RegionPreferences";
import {
  type CmsNavigationItemWire,
  cmsNavigationHref,
} from "@/lib/cms-navigation-href";
import {
  type CmsNavigationPayload,
  getPublishedNavigation,
} from "@/lib/data/cms-navigation";
import { isWholesaleEnabled } from "@/lib/spree";
import {
  getSellerOnboardingUrl,
  getSellerPanelUrl,
  getStoreDescription,
  getStoreName,
} from "@/lib/store";
import { themeSettingEnabled } from "@/lib/theme/setting-value";
import type { ThemeSectionInstance } from "@/lib/theme/types";
import { CurrentYear } from "./CurrentYear";
import { type SocialNetwork, SocialPlatformIcon } from "./SocialPlatformIcon";

const storeName = getStoreName();
const storeDescription = getStoreDescription();

interface FooterProps {
  basePath: string;
  locale: Locale;
  categoryLinks: ReactNode;
  section?: ThemeSectionInstance;
}

interface FooterCategoryLinksProps {
  rootCategories: Category[];
  basePath: string;
}

const linkClass =
  "text-sm text-marketplace-muted-foreground transition-colors hover:text-marketplace-foreground";

function parseFooterMenuLinks(
  value: unknown,
): Array<{ label: string; url: string }> {
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed))
      return parsed.filter((item): item is { label: string; url: string } =>
        Boolean(
          item &&
            typeof item === "object" &&
            "label" in item &&
            typeof item.label === "string" &&
            "url" in item &&
            typeof item.url === "string",
        ),
      );
  } catch {
    /* Older saved footer links use one Label|/path entry per line. */
  }
  return value
    .split(/\r?\n/)
    .map((line) => {
      const [label = "", ...url] = line.split("|");
      return { label: label.trim(), url: url.join("|").trim() };
    })
    .filter((link) => link.label || link.url);
}

function footerColor(value: unknown, fallback: string): string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value)
    ? value
    : fallback;
}

/** Prefix storefront paths with the locale base path; leave absolute URLs alone. */
function resolveFooterHref(url: string, basePath: string): string {
  const target = url.trim();
  if (!target) return basePath || "/";
  if (/^(https?:|mailto:|tel:)/i.test(target)) return target;
  if (basePath && (target === basePath || target.startsWith(`${basePath}/`))) {
    return target;
  }
  if (target.startsWith("/")) return `${basePath}${target}`;
  return `${basePath}/${target}`;
}

function isLegacyFooterCopyright(block: {
  type?: string;
  settings?: Record<string, unknown>;
}) {
  return (
    block.type === "footer_text" &&
    /\{\{year\}\}|©|all rights reserved|rights reserved/i.test(
      String(block.settings?.text ?? ""),
    )
  );
}

function flattenNavigation(
  items: CmsNavigationItemWire[],
  basePath: string,
): Array<{ label: string; url: string }> {
  return items.flatMap((item) => {
    const href = cmsNavigationHref(item, basePath);
    const current = href ? [{ label: item.label, url: href }] : [];
    return [...current, ...flattenNavigation(item.children ?? [], basePath)];
  });
}

export function FooterCategoryLinks({
  rootCategories,
  basePath,
}: FooterCategoryLinksProps) {
  return rootCategories.slice(0, 4).map((category) => (
    <li key={category.id}>
      <Link href={`${basePath}/c/${category.permalink}`} className={linkClass}>
        {category.name}
      </Link>
    </li>
  ));
}

export async function Footer({
  basePath,
  locale,
  categoryLinks,
  section,
}: FooterProps) {
  const t = await getTranslations({ locale, namespace: "footer" });
  const tp = await getTranslations({ locale, namespace: "policies" });
  const sellerOnboardingUrl = getSellerOnboardingUrl();
  const sellerPanelUrl = getSellerPanelUrl();
  const hasSellerLinks = sellerOnboardingUrl || sellerPanelUrl;
  const settings = section?.settings ?? {};
  const customBlocks =
    section?.block_order
      .map((id) => ({ id, block: section.blocks[id] }))
      .filter((item) => item.block && !item.block.disabled) ?? [];
  const footerMenuKeys = section
    ? [
        String(settings.shop_menu_key ?? "footer_shop"),
        String(settings.sell_menu_key ?? "footer_sell"),
        String(settings.help_menu_key ?? "footer_help"),
        String(settings.marketplace_menu_key ?? "footer_marketplace"),
        ...customBlocks
          .filter(({ block }) => block.type === "footer_menu")
          .map(({ block }) => String(block.settings?.menu_key ?? ""))
          .filter(Boolean),
      ]
    : [];
  const footerNavigationEntries = await Promise.all(
    [...new Set(footerMenuKeys)].map(
      async (key) => [key, await getPublishedNavigation(key)] as const,
    ),
  );
  const footerNavigations = new Map<string, CmsNavigationPayload | null>(
    footerNavigationEntries,
  );
  const footerLinksFor = (key: string) => {
    const navigation = footerNavigations.get(key);
    const links = navigation
      ? flattenNavigation(navigation.items, basePath)
      : [];
    return links.length ? links : null;
  };
  const customMode =
    themeSettingEnabled(settings.footer_blocks_initialized) ||
    customBlocks.length > 0;
  const footerSchemes: Record<string, { background: string; text: string }> = {
    "scheme-1": { background: "#ffffff", text: "#242027" },
    "scheme-2": { background: "#f6f1e8", text: "#6c315d" },
    "scheme-3": { background: "#e8f4ef", text: "#173b32" },
    "scheme-4": { background: "#f0f3fa", text: "#24365f" },
    "scheme-5": { background: "#fff5e8", text: "#804a19" },
  };
  const footerScheme =
    footerSchemes[String(settings.color_scheme || "scheme-1")] ||
    footerSchemes["scheme-1"];
  const background =
    typeof settings.background_color === "string" &&
    /^#[0-9a-fA-F]{6}$/.test(settings.background_color)
      ? settings.background_color
      : footerScheme.background;
  const textColor =
    typeof settings.text_color === "string" &&
    /^#[0-9a-fA-F]{6}$/.test(settings.text_color)
      ? settings.text_color
      : footerScheme.text;
  const spotlightEnabled = settings.footer_spotlight_enabled !== false;
  const spotlightBackground = footerColor(
    settings.footer_spotlight_background_color,
    "#c2522b",
  );
  const spotlightText = footerColor(
    settings.footer_spotlight_text_color,
    "#fffaf6",
  );
  const spotlightButtonBackground = footerColor(
    settings.footer_spotlight_button_background_color,
    "#251e24",
  );
  const spotlightButtonText = footerColor(
    settings.footer_spotlight_button_text_color,
    "#ffffff",
  );
  const sectionId = `theme-footer-${section?.section_id.replace(/[^a-zA-Z0-9_-]/g, "") ?? "default"}`;
  const cssInput =
    typeof settings.custom_css === "string" ? settings.custom_css : "";
  const customCss =
    /@import|url\s*\(|expression\s*\(|<\/style|javascript:/i.test(cssInput)
      ? ""
      : cssInput.replace(
          /([^{}]+)\{([^{}]*)\}/g,
          (_rule, selectors: string, declarations: string) => {
            if (selectors.trim().startsWith("@")) return "";
            return `${selectors
              .split(",")
              .map((selector) => `#${sectionId} ${selector.trim()}`)
              .join(", ")} {${declarations}}`;
          },
        );
  const maxWidth =
    settings.section_width === "full"
      ? "none"
      : "var(--marketplace-page-width, 1200px)";
  const gap = Math.max(0, Math.min(80, Number(settings.gap ?? 24)));
  const paddingTop = Math.max(
    0,
    Math.min(120, Number(settings.padding_top ?? 48)),
  );
  const paddingBottom = Math.max(
    0,
    Math.min(120, Number(settings.padding_bottom ?? 48)),
  );
  const footerStyle: CSSProperties = {
    ...(background ? { backgroundColor: background } : {}),
    ...(textColor ? { color: textColor } : {}),
    ["--marketplace-foreground" as string]: textColor,
    ["--marketplace-muted-foreground" as string]: `color-mix(in srgb, ${textColor} 68%, transparent)`,
    ["--marketplace-border" as string]: `color-mix(in srgb, ${textColor} 18%, transparent)`,
    ["--marketplace-border-subtle" as string]: `color-mix(in srgb, ${textColor} 10%, transparent)`,
    ["--footer-pad-bottom" as string]: `${paddingBottom}px`,
  };
  const copyrights = customBlocks.filter(
    ({ block }) =>
      block.type === "footer_copyright" || isLegacyFooterCopyright(block),
  );
  const paymentIcons = customBlocks.filter(
    ({ block }) => block.type === "footer_payment_icons",
  );
  return (
    <footer
      id={sectionId}
      data-theme-footer
      data-theme-base-path={basePath}
      className="mt-auto border-t border-marketplace-border-subtle bg-marketplace-background text-marketplace-foreground"
      style={footerStyle}
    >
      {customCss && <style>{customCss}</style>}
      {spotlightEnabled && (
        <div
          data-theme-footer-spotlight
          style={{ backgroundColor: spotlightBackground, color: spotlightText }}
        >
          <div
            className="mx-auto flex flex-col items-start justify-between gap-4 px-4 py-5 sm:gap-5 sm:px-6 sm:py-6 md:flex-row md:items-center lg:px-8"
            style={{ maxWidth }}
          >
            <h2
              data-theme-footer-spotlight-title
              className="max-w-xl font-display text-2xl font-semibold leading-tight sm:text-3xl"
            >
              {String(settings.footer_spotlight_text ?? "").trim() ||
                t("footerSpotlight")}
            </h2>
            <Link
              data-theme-footer-spotlight-link
              href={resolveFooterHref(
                String(settings.footer_spotlight_link ?? "/products"),
                basePath,
              )}
              className="group inline-flex min-h-11 items-center gap-3 rounded-md px-4 py-2.5 text-sm font-semibold transition-[filter] duration-200 hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{
                backgroundColor: spotlightButtonBackground,
                color: spotlightButtonText,
              }}
            >
              {String(settings.footer_spotlight_link_label ?? "").trim() ||
                t("footerExplore")}
              <ArrowUpRight
                aria-hidden="true"
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </Link>
          </div>
        </div>
      )}
      <div
        data-theme-footer-content
        className="mx-auto max-w-[1440px] px-4 pt-[min(var(--footer-content-padding-top),2rem)] sm:px-6 md:pt-[var(--footer-content-padding-top)] lg:px-8"
        style={{
          maxWidth,
          ["--footer-content-padding-top" as string]: `${paddingTop}px`,
        }}
      >
        <div
          data-theme-footer-layout
          className={
            customMode
              ? "grid grid-cols-2 gap-x-[var(--footer-gap)] gap-y-8 md:grid-cols-[repeat(4,minmax(0,1fr))_220px] md:gap-y-[var(--footer-gap)]"
              : "grid grid-cols-2 gap-x-8 gap-y-8 md:grid-cols-[repeat(4,minmax(0,1fr))_220px] lg:gap-x-12"
          }
          style={
            customMode
              ? ({
                  ["--footer-gap" as string]: `${gap}px`,
                } as CSSProperties)
              : { columnGap: `${gap}px`, rowGap: `${gap}px` }
          }
        >
          {customMode ? (
            customBlocks
              .filter(
                ({ block }) =>
                  block.type !== "footer_copyright" &&
                  block.type !== "footer_payment_icons" &&
                  !isLegacyFooterCopyright(block),
              )
              .map(({ id, block }) => {
                const blockSettings = block.settings ?? {};
                if (block.type === "footer_brand") {
                  const title =
                    String(blockSettings.title ?? "").trim() || storeName;
                  const description =
                    "description" in blockSettings
                      ? String(blockSettings.description ?? "").trim()
                      : storeDescription;
                  return (
                    <div key={id} className="contents">
                      <div
                        data-theme-footer-block-id={id}
                        data-theme-footer-block-type={block.type}
                        className="col-span-2 flex min-h-28 flex-col justify-center md:col-span-1"
                      >
                        <span
                          data-theme-footer-accent
                          className="mb-3 h-1 w-9 rounded-full"
                          style={{ backgroundColor: spotlightBackground }}
                        />
                        <h2
                          data-theme-footer-brand-title
                          className="font-display text-xl font-semibold leading-tight text-marketplace-foreground"
                        >
                          {title}
                        </h2>
                        {description && (
                          <p
                            data-theme-footer-brand-description
                            className="mt-3 max-w-xs text-sm leading-6 text-marketplace-muted-foreground"
                          >
                            {description}
                          </p>
                        )}
                      </div>
                      <div className="col-span-2 hidden items-end justify-end md:col-span-1 md:col-start-5 md:row-start-1 md:flex">
                        <Image
                          src="/images/footer-maker-still-life.png"
                          alt=""
                          width={640}
                          height={427}
                          sizes="(min-width: 768px) 300px, 0px"
                          className="h-auto max-h-44 w-auto object-contain object-bottom"
                        />
                      </div>
                    </div>
                  );
                }
                if (block.type === "footer_menu") {
                  const title =
                    String(blockSettings.title ?? "Links").trim() || "Links";
                  const navigation = footerNavigations.get(
                    String(blockSettings.menu_key ?? ""),
                  );
                  const links = navigation
                    ? flattenNavigation(navigation.items, basePath)
                    : parseFooterMenuLinks(blockSettings.links);
                  if (!links.length) return null;
                  return (
                    <FooterGroup
                      key={id}
                      title={title}
                      dataBlockId={id}
                      dataMenuKey={String(blockSettings.menu_key ?? "")}
                    >
                      {links.map(({ label, url }) => {
                        const resolvedHref = resolveFooterHref(url, basePath);
                        return (
                          <li key={`${label}-${url}`}>
                            <Link href={resolvedHref} className={linkClass}>
                              {label.trim()}
                            </Link>
                          </li>
                        );
                      })}
                    </FooterGroup>
                  );
                }
                if (block.type === "footer_text") {
                  const title = String(blockSettings.title ?? "").trim();
                  const text = String(blockSettings.text ?? "").trim();
                  return (
                    <div
                      key={id}
                      data-theme-footer-block-id={id}
                      data-theme-footer-block-type={block.type}
                      className="min-w-0"
                    >
                      {title && (
                        <h2 className="font-sans text-sm font-semibold">
                          {title}
                        </h2>
                      )}
                      {text && (
                        <p className="mt-3 whitespace-pre-line text-sm leading-6 text-marketplace-muted-foreground">
                          {text}
                        </p>
                      )}
                    </div>
                  );
                }
                if (block.type === "footer_social") {
                  const title = String(
                    blockSettings.title ?? "Follow us",
                  ).trim();
                  const links = (
                    [
                      "instagram",
                      "facebook",
                      "pinterest",
                      "tiktok",
                      "youtube",
                    ] as const
                  ).filter(
                    (key) =>
                      typeof blockSettings[key] === "string" &&
                      /^https:\/\//i.test(String(blockSettings[key]).trim()),
                  );
                  return (
                    <FooterSocialGroup
                      key={id}
                      title={title}
                      dataBlockId={id}
                      dataBlockType={block.type}
                      links={links.map((network) => ({
                        network,
                        href: String(blockSettings[network]).trim(),
                      }))}
                    />
                  );
                }
                if (block.type === "footer_follow_on_shop") {
                  const title = String(
                    blockSettings.title ?? "Follow on Shop",
                  ).trim();
                  const href = resolveFooterHref(
                    String(blockSettings.link ?? "/shops"),
                    basePath,
                  );
                  return (
                    <div
                      key={id}
                      data-theme-footer-block-id={id}
                      data-theme-footer-block-type={block.type}
                    >
                      <Link
                        href={href}
                        className="inline-flex rounded-md border border-marketplace-border px-3 py-2 text-sm font-medium hover:bg-white"
                      >
                        {title}
                      </Link>
                    </div>
                  );
                }
                if (block.type === "footer_policy_links") {
                  const title =
                    String(blockSettings.title ?? "Policies").trim() ||
                    "Policies";
                  const links = parseFooterMenuLinks(blockSettings.links);
                  if (!links.length) return null;
                  return (
                    <FooterGroup
                      key={id}
                      title={title}
                      dataBlockId={id}
                      dataBlockType={block.type}
                    >
                      {links.map(({ label, url }) => (
                        <li key={`${label}-${url}`}>
                          <Link
                            href={resolveFooterHref(url, basePath)}
                            className={linkClass}
                          >
                            {label}
                          </Link>
                        </li>
                      ))}
                    </FooterGroup>
                  );
                }
                if (block.type === "footer_social_links") {
                  const title = String(
                    blockSettings.title ?? "Follow us",
                  ).trim();
                  const links = (
                    [
                      "instagram",
                      "facebook",
                      "pinterest",
                      "tiktok",
                      "youtube",
                    ] as const
                  ).filter(
                    (key) =>
                      typeof blockSettings[key] === "string" &&
                      /^https:\/\//i.test(String(blockSettings[key]).trim()),
                  );
                  return (
                    <FooterSocialGroup
                      key={id}
                      title={title}
                      dataBlockId={id}
                      dataBlockType={block.type}
                      links={links.map((network) => ({
                        network,
                        href: String(blockSettings[network]).trim(),
                      }))}
                    />
                  );
                }
                if (block.type === "footer_contact_form")
                  return (
                    <div key={id} data-theme-footer-block-id={id}>
                      <FooterContactForm
                        title={String(blockSettings.title ?? "Contact us")}
                        description={String(blockSettings.description ?? "")}
                        recipientEmail={String(
                          blockSettings.recipient_email ?? "",
                        )}
                        submitLabel={String(
                          blockSettings.submit_label ?? "Send message",
                        )}
                      />
                    </div>
                  );
                if (block.type === "footer_email_signup")
                  return (
                    <div key={id} data-theme-footer-block-id={id}>
                      <FooterEmailSignup
                        title={String(
                          blockSettings.title ?? "Subscribe to our emails",
                        )}
                        description={String(blockSettings.description ?? "")}
                        buttonLabel={String(
                          blockSettings.button_label ?? "Subscribe",
                        )}
                        successText={String(
                          blockSettings.success_text ??
                            "Thanks for subscribing!",
                        )}
                      />
                    </div>
                  );
                return null;
              })
          ) : (
            <>
              <div
                className="col-span-2 flex min-h-28 flex-col justify-center md:col-span-1"
                data-theme-footer-block-type="footer_brand"
              >
                <span
                  data-theme-footer-accent
                  className="mb-3 h-1 w-9 rounded-full"
                  style={{ backgroundColor: spotlightBackground }}
                />
                <h2
                  data-theme-footer-brand-title
                  className="font-display text-xl font-semibold leading-tight text-marketplace-foreground"
                >
                  {storeName}
                </h2>
                <p className="mt-3 max-w-xs text-sm leading-6 text-marketplace-muted-foreground">
                  {storeDescription}
                </p>
              </div>

              <div className="col-span-2 hidden items-end justify-end md:col-span-1 md:col-start-5 md:row-start-1 md:flex">
                <Image
                  src="/images/footer-maker-still-life.png"
                  alt=""
                  width={640}
                  height={427}
                  sizes="(min-width: 768px) 300px, 0px"
                  className="h-auto max-h-44 w-auto object-contain object-bottom"
                />
              </div>

              <FooterGroup title={t("shop")}>
                {footerLinksFor(
                  String(settings.shop_menu_key ?? "footer_shop"),
                )?.map(({ label, url }) => (
                  <li key={`${label}-${url}`}>
                    <Link href={url} className={linkClass}>
                      {label}
                    </Link>
                  </li>
                )) ?? (
                  <>
                    <li>
                      <Link href={`${basePath}/products`} className={linkClass}>
                        {t("allProducts")}
                      </Link>
                    </li>
                    <li>
                      <Link href={`${basePath}/shops`} className={linkClass}>
                        {t("shops")}
                      </Link>
                    </li>
                    {categoryLinks}
                    {isWholesaleEnabled() ? (
                      <li>
                        <Link
                          href={`${basePath}/wholesale`}
                          className={linkClass}
                        >
                          {t("wholesale")}
                        </Link>
                      </li>
                    ) : null}
                  </>
                )}
              </FooterGroup>

              {hasSellerLinks ||
              footerLinksFor(
                String(settings.sell_menu_key ?? "footer_sell"),
              ) ? (
                <FooterGroup title={t("sell")}>
                  {footerLinksFor(
                    String(settings.sell_menu_key ?? "footer_sell"),
                  )?.map(({ label, url }) => (
                    <li key={`${label}-${url}`}>
                      <Link href={url} className={linkClass}>
                        {label}
                      </Link>
                    </li>
                  ))}
                  {!footerLinksFor(
                    String(settings.sell_menu_key ?? "footer_sell"),
                  ) && (
                    <>
                      {sellerOnboardingUrl ? (
                        <li>
                          <Link
                            href={sellerOnboardingUrl}
                            className={linkClass}
                          >
                            {t("sellOnMarketplace", { marketplace: storeName })}
                          </Link>
                        </li>
                      ) : null}
                      {sellerPanelUrl ? (
                        <li>
                          <Link href={sellerPanelUrl} className={linkClass}>
                            {t("sellerSignIn")}
                          </Link>
                        </li>
                      ) : null}
                    </>
                  )}
                </FooterGroup>
              ) : null}

              <FooterGroup title={t("help")}>
                {footerLinksFor(
                  String(settings.help_menu_key ?? "footer_help"),
                )?.map(({ label, url }) => (
                  <li key={`${label}-${url}`}>
                    <Link href={url} className={linkClass}>
                      {label}
                    </Link>
                  </li>
                )) ?? (
                  <>
                    <li>
                      <Link
                        href={`${basePath}/account/orders`}
                        className={linkClass}
                      >
                        {t("ordersAndHelp")}
                      </Link>
                    </li>
                    <li>
                      <Link
                        href={`${basePath}/policies/shipping-policy`}
                        className={linkClass}
                      >
                        {tp("shippingPolicy")}
                      </Link>
                    </li>
                    <li>
                      <Link
                        href={`${basePath}/policies/returns-policy`}
                        className={linkClass}
                      >
                        {tp("returnsPolicy")}
                      </Link>
                    </li>
                  </>
                )}
              </FooterGroup>

              <FooterGroup
                title={t("marketplace")}
                className="col-span-2 md:col-span-1"
                listClassName="mt-3 flex flex-wrap gap-x-5 gap-y-2"
              >
                {footerLinksFor(
                  String(settings.marketplace_menu_key ?? "footer_marketplace"),
                )?.map(({ label, url }) => (
                  <li key={`${label}-${url}`}>
                    <Link href={url} className={linkClass}>
                      {label}
                    </Link>
                  </li>
                )) ?? (
                  <>
                    <li>
                      <Link
                        href={`${basePath}/policies/privacy-policy`}
                        className={linkClass}
                      >
                        {tp("privacyPolicy")}
                      </Link>
                    </li>
                    <li>
                      <Link
                        href={`${basePath}/policies/terms-of-service`}
                        className={linkClass}
                      >
                        {tp("termsOfService")}
                      </Link>
                    </li>
                  </>
                )}
              </FooterGroup>
            </>
          )}
        </div>
      </div>
      <div
        data-theme-footer-bottom
        className="w-full border-t border-marketplace-border"
      >
        <div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-4 py-4 pb-[var(--footer-pad-bottom,3rem)] sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:gap-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div
              data-theme-footer-region
              className="shrink-0"
              style={{
                display:
                  settings.footer_show_region_selector === false
                    ? "none"
                    : undefined,
              }}
            >
              <RegionPreferences variant="menu" showCountryName />
            </div>
            <div
              data-theme-footer-social-links
              style={{
                display:
                  settings.footer_show_social_links === false
                    ? "none"
                    : undefined,
              }}
            >
              {(!customMode ||
                !customBlocks.some(({ block }) =>
                  ["footer_social", "footer_social_links"].includes(block.type),
                )) && <GlobalSocialLinks compact />}
            </div>
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-3 lg:justify-end">
            <div
              data-theme-footer-payment-icons
              className="contents"
              style={{
                display:
                  settings.footer_show_payment_icons === true &&
                  paymentIcons.length
                    ? "contents"
                    : "none",
              }}
            >
              {paymentIcons.map(({ id, block }) => (
                <div
                  key={id}
                  data-theme-footer-payment-block-id={id}
                  className="flex min-w-0 flex-col gap-1"
                >
                  {String(block.settings.title ?? "").trim() && (
                    <p className="text-[10px] font-semibold uppercase text-marketplace-muted-foreground">
                      {String(block.settings.title).trim()}
                    </p>
                  )}
                  <ul
                    aria-label={String(
                      block.settings.title ?? "Accepted payment methods",
                    )}
                    className="flex flex-wrap items-center gap-1.5"
                  >
                    {String(block.settings.payment_methods ?? "")
                      .split(/,|\r?\n/)
                      .map((method) => method.trim())
                      .filter(Boolean)
                      .map((method) => (
                        <PaymentMethodMark key={method} method={method} />
                      ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
              <div
                data-theme-footer-copyright
                className="flex flex-wrap text-marketplace-muted-foreground"
                style={{
                  display:
                    settings.footer_show_copyright === false ||
                    (customMode && !copyrights.length)
                      ? "none"
                      : undefined,
                }}
              >
                {copyrights.length ? (
                  copyrights.map(({ id, block }) => (
                    <p key={id} data-theme-footer-copyright-block-id={id}>
                      {String(block.settings.text ?? "")
                        .replace("{{year}}", String(new Date().getFullYear()))
                        .replace("{{store}}", storeName)
                        .replace("All rights reserved.", t("rightsReserved"))}
                    </p>
                  ))
                ) : (
                  <p>
                    &copy; <CurrentYear /> {storeName}. {t("rightsReserved")}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterSocialGroup({
  title,
  dataBlockId,
  dataBlockType,
  links,
}: {
  title: string;
  dataBlockId: string;
  dataBlockType: string;
  links: Array<{ network: SocialNetwork; href: string }>;
}) {
  return (
    <div
      data-theme-footer-block-id={dataBlockId}
      data-theme-footer-block-type={dataBlockType}
    >
      <h2 className="font-sans text-sm font-semibold">{title}</h2>
      <ul className="mt-4 flex flex-wrap items-center gap-4">
        {links.map(({ network, href }) => (
          <li key={network}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={network[0].toUpperCase() + network.slice(1)}
              className={linkClass}
            >
              <SocialPlatformIcon network={network} />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PaymentMethodMark({ method }: { method: string }) {
  const normalized = method.toLowerCase().replace(/[^a-z]/g, "");
  const paymentTypes: Record<string, PaymentType> = {
    visa: "Visa",
    mastercard: "Mastercard",
    americanexpress: "AmericanExpress",
    amex: "AmericanExpress",
    paypal: "PayPal",
    discover: "Discover",
    dinersclub: "DinersClub",
    jcb: "JCB",
    maestro: "Maestro",
    unionpay: "UnionPay",
  };
  const paymentType = paymentTypes[normalized];
  return (
    <li
      aria-label={method}
      title={method}
      className="flex h-8 min-w-10 items-center justify-center rounded border border-marketplace-border bg-white px-1.5"
    >
      {paymentType ? (
        <PaymentIcon type={paymentType} format="flatRounded" width={36} />
      ) : (
        <span className="text-[10px] font-semibold text-marketplace-foreground">
          {method}
        </span>
      )}
    </li>
  );
}

function FooterGroup({
  title,
  children,
  className,
  listClassName,
  dataBlockId,
  dataBlockType = "footer_menu",
  dataMenuKey,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  listClassName?: string;
  dataBlockId?: string;
  dataBlockType?: string;
  dataMenuKey?: string;
}) {
  return (
    <div
      data-theme-footer-block-id={dataBlockId}
      data-theme-footer-block-type={dataBlockId ? dataBlockType : undefined}
      data-theme-footer-menu-key={dataMenuKey}
      className={`min-w-0 ${className ?? ""}`}
    >
      <h2 className="font-sans text-sm font-semibold">{title}</h2>
      <ul className={listClassName ?? "mt-4 space-y-3"}>{children}</ul>
    </div>
  );
}
