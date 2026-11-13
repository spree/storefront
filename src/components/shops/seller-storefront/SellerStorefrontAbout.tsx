import { getTranslations } from "next-intl/server";
import type { CSSProperties } from "react";
import type { SellerShopPagePayload } from "@/lib/data/seller-storefront-types";
import {
  getSellerAccentMutedTextColor,
  getSellerAccentTextColor,
  sellerShopShellClass,
} from "@/lib/utils/seller-storefront";
import { SellerAboutContent } from "./SellerAboutContent";
import { SellerShopEditorAboutFocusBridge } from "./SellerShopEditorAboutFocusBridge";
import { SellerStorefrontAboutInlineEdit } from "./SellerStorefrontAboutInlineEdit";
import { ShopEditorAction } from "./ShopEditorAction";
import { ShopLinkIcon } from "./ShopLinkIcon";
import { ShopStoryMediaCarousel } from "./ShopStoryMediaCarousel";

interface SellerStorefrontAboutProps {
  shopName: string;
  marketplaceName: string;
  tagline?: string | null;
  aboutHtml?: string | null;
  about?: string | null;
  salesCount?: number;
  sellerSince?: string | null;
  accentColor?: string | null;
  shopPage?: SellerShopPagePayload | null;
  editorPreview?: boolean;
  aboutEditMode?: boolean;
}

export async function SellerStorefrontAbout({
  shopName,
  marketplaceName,
  tagline,
  aboutHtml,
  about,
  salesCount = 0,
  sellerSince,
  accentColor,
  shopPage,
  editorPreview = false,
  aboutEditMode = false,
}: SellerStorefrontAboutProps) {
  const t = await getTranslations("sellers");
  const hasAbout = Boolean(aboutHtml?.trim() || about?.trim());

  const plainTextLength = aboutHtml
    ? aboutHtml.replace(/<[^>]+>/g, "").length
    : (about ?? "").length;
  const formattedSales =
    salesCount > 0 ? new Intl.NumberFormat().format(salesCount) : null;
  const accentText = accentColor ? getSellerAccentTextColor(accentColor) : null;
  const foreground = accentText
    ? `var(--marketplace-seller-accent-text, ${accentText})`
    : "#29252d";
  const muted = accentText
    ? `var(--marketplace-seller-accent-muted, ${accentText === "#ffffff" ? "#ffffff" : getSellerAccentMutedTextColor(accentText)})`
    : "#514b53";
  const editActionClass =
    "inline-flex size-8 items-center justify-center rounded-sm text-[var(--marketplace-seller-accent-text,#29252d)] hover:bg-black/10";
  const themedStyle: CSSProperties = accentColor
    ? ({
        "--marketplace-seller-accent": accentColor,
        "--marketplace-seller-accent-text": accentText,
        "--marketplace-seller-accent-muted":
          accentText === "#ffffff"
            ? "#ffffff"
            : getSellerAccentMutedTextColor(accentText ?? "#222222"),
        "--marketplace-seller-field-background": `color-mix(in srgb, ${accentColor} 14%, #ffffff)`,
        "--marketplace-seller-action-background":
          accentText === "#ffffff" ? "#29252d" : accentColor,
        "--marketplace-seller-action-foreground":
          accentText === "#ffffff" ? "#ffffff" : accentText,
        backgroundColor: "var(--marketplace-seller-accent, #faf9f7)",
        color: foreground,
      } as CSSProperties)
    : {
        // Keep the section bound to the live theme variable even when the
        // page initially has no saved accent. The editor preview updates this
        // variable without reloading the storefront iframe.
        backgroundColor: "var(--marketplace-seller-accent, #faf9f7)",
      };
  const hasShopMedia = Boolean(
    shopPage?.video_url || shopPage?.photos.some((photo) => photo.url?.trim()),
  );
  const media = hasShopMedia ? (
    <ShopStoryMediaCarousel
      videoUrl={shopPage?.video_url}
      videoCaption={shopPage?.video_caption}
      videoCaptionsUrl={shopPage?.video_captions_url}
      photos={shopPage?.photos ?? []}
      shopName={shopName}
    />
  ) : editorPreview ? (
    <div className="mt-4 flex min-h-32 items-center justify-center border border-dashed border-current/30 px-4 text-center">
      <div>
        <p className="text-sm font-medium">Shop photos and video</p>
        <p className="mt-1 text-xs" style={{ color: muted }}>
          Add a video and up to five photos to show your process and workspace.
        </p>
        <ShopEditorAction
          action="shop-content"
          label="Add shop photos or video"
          className="mt-2 inline-flex items-center underline underline-offset-4"
        />
      </div>
    </div>
  ) : null;

  const previewContent = (
    <>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-xs font-medium">
          {shopPage?.story_headline || shopName}
        </h3>
        {editorPreview ? (
          <ShopEditorAction
            action="shop-content"
            label="Edit About, media and shop details"
            className={editActionClass}
          />
        ) : null}
      </div>
      {media}
      {tagline ? (
        <p
          className="mt-2 text-sm leading-relaxed"
          data-seller-accent-story-tagline
          style={{ color: accentText ?? "#29252d" }}
        >
          {tagline}
        </p>
      ) : null}
      {aboutHtml ? (
        <SellerAboutContent
          html={aboutHtml}
          accentTextColor={accentText ?? undefined}
          plainTextLength={plainTextLength}
          readMoreLabel={t("readMore")}
          readLessLabel={t("readLess")}
        />
      ) : hasAbout ? (
        <p
          className="mt-5 max-w-3xl whitespace-pre-wrap text-sm font-semibold leading-6"
          style={{ color: accentText ?? "#29252d" }}
        >
          {about}
        </p>
      ) : (
        <p
          className="mt-5 max-w-3xl text-sm leading-6"
          style={{ color: muted }}
        >
          {t("aboutEmpty")}
        </p>
      )}
      {shopPage?.links.length || editorPreview ? (
        <nav
          aria-label="Shop links"
          className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs"
        >
          {shopPage?.links.map((link) => (
            <a
              key={`${link.label}-${link.url}`}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex max-w-full items-center gap-1.5 underline underline-offset-4 hover:no-underline"
            >
              <ShopLinkIcon label={link.label} url={link.url} />
              {link.label}
            </a>
          ))}
          {editorPreview ? (
            <ShopEditorAction
              action="shop-content"
              label="Edit shop links"
              className={editActionClass}
            />
          ) : null}
          {!shopPage?.links.length && editorPreview ? (
            <span style={{ color: muted }}>Add a shop link</span>
          ) : null}
        </nav>
      ) : null}
      {shopPage?.member_bios.length || editorPreview ? (
        <section className="mt-10 border-t border-current/20 pt-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">Shop members</h3>
            {editorPreview ? (
              <ShopEditorAction
                action="shop-content"
                label="Edit shop members"
                className={editActionClass}
              />
            ) : null}
          </div>
          <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
            {shopPage?.member_bios.map((member, index) => (
              <article
                key={`${member.name}-${index}`}
                className="flex min-w-0 items-start gap-3"
              >
                {member.photo_url ? (
                  <img
                    src={member.photo_url}
                    alt=""
                    className="size-9 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    className="flex size-9 shrink-0 items-center justify-center rounded-full bg-black/10 text-xs font-semibold"
                  >
                    {member.name.trim().slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <h4 className="text-xs font-semibold">{member.name}</h4>
                  {member.role ? (
                    <p className="mt-0.5 text-xs" style={{ color: muted }}>
                      {member.role}
                    </p>
                  ) : null}
                  <p
                    className="mt-1 break-words text-xs leading-relaxed [overflow-wrap:anywhere]"
                    style={{ color: muted }}
                  >
                    {member.bio}
                  </p>
                </div>
              </article>
            ))}
          </div>
          {!shopPage?.member_bios.length && editorPreview ? (
            <p className="text-sm" style={{ color: muted }}>
              Add a shop member and introduce the people behind your business.
            </p>
          ) : null}
        </section>
      ) : null}
      {shopPage?.faqs.length || editorPreview ? (
        <section className="mt-8 border-t border-current/20 pt-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">
              Frequently asked questions
            </h3>
            {editorPreview ? (
              <ShopEditorAction
                action="shop-content"
                label="Edit frequently asked questions"
                className={editActionClass}
              />
            ) : null}
          </div>
          <div className="divide-y divide-current/20">
            {shopPage?.faqs.map((faq, index) => (
              <details key={`${faq.question}-${index}`} className="group py-3">
                <summary className="cursor-pointer list-none text-sm font-semibold marker:hidden [&::-webkit-details-marker]:hidden">
                  {faq.question}
                </summary>
                <p
                  className="mt-2 whitespace-pre-wrap text-sm leading-relaxed"
                  style={{ color: muted }}
                >
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
          {!shopPage?.faqs.length && editorPreview ? (
            <p className="text-sm" style={{ color: muted }}>
              Answer common questions about your products and shop.
            </p>
          ) : null}
        </section>
      ) : null}
      {(shopPage?.seller_details_public &&
        Object.values(shopPage.seller_details).some(Boolean)) ||
      editorPreview ? (
        <section className="mt-8 border-t border-current/20 pt-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">Seller details</h3>
            {editorPreview ? (
              <ShopEditorAction
                action="shop-content"
                label="Edit seller details"
                className={editActionClass}
              />
            ) : null}
          </div>
          {shopPage?.seller_details_public &&
          Object.values(shopPage.seller_details).some(Boolean) ? (
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              {Object.entries(shopPage.seller_details)
                .filter(([, value]) => value)
                .map(([key, value]) => (
                  <div key={key}>
                    <dt className="text-xs capitalize" style={{ color: muted }}>
                      {key.replaceAll("_", " ")}
                    </dt>
                    <dd className="mt-1 whitespace-pre-wrap">{value}</dd>
                  </div>
                ))}
            </dl>
          ) : (
            <p className="text-sm" style={{ color: muted }}>
              Seller details are private unless you choose to display them.
            </p>
          )}
        </section>
      ) : null}
    </>
  );

  return (
    <section
      className="bg-[#faf9f7]"
      data-theme-seller-about
      style={themedStyle}
    >
      <div className={`${sellerShopShellClass} py-9 md:py-12`}>
        <div className="grid gap-8 lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-10">
          <aside className="pt-1" style={{ color: foreground }}>
            <h2 className="text-sm font-semibold">
              {t("aboutShopHeading", { name: shopName })}
            </h2>
            <dl className="mt-8 flex gap-7 text-xs sm:block sm:space-y-4">
              <div>
                <dt style={{ color: muted }}>{t("aboutSalesLabel")}</dt>
                <dd className="mt-1 text-base font-semibold tabular-nums">
                  {formattedSales ?? "0"}
                </dd>
              </div>
              {sellerSince ? (
                <div>
                  <dt style={{ color: muted }}>
                    {t("aboutOnMarketplaceSinceLabel", {
                      marketplace: marketplaceName,
                    })}
                  </dt>
                  <dd className="mt-1 text-base font-semibold">
                    {sellerSince.slice(0, 4)}
                  </dd>
                </div>
              ) : null}
            </dl>
          </aside>

          <div className="min-w-0 max-w-3xl" style={{ color: foreground }}>
            {editorPreview ? (
              <>
                <SellerShopEditorAboutFocusBridge enabled />
                <SellerStorefrontAboutInlineEdit
                  about={about}
                  shopPage={shopPage}
                  marketplaceName={marketplaceName}
                  mutedColor={muted}
                />
              </>
            ) : aboutEditMode ? (
              <SellerStorefrontAboutInlineEdit
                about={about}
                shopPage={shopPage}
                marketplaceName={marketplaceName}
                mutedColor={muted}
              />
            ) : (
              previewContent
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
