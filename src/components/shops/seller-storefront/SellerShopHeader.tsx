import type { Seller } from "@spree/sdk";
import {
  MailCheck,
  MapPin,
  PackageCheck,
  Star,
  Plane as VacationMode,
} from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import type { CSSProperties } from "react";
import { SellerBadgeRow } from "@/components/seller-badges/SellerBadgeRow";
import { ContactShopButton } from "@/components/shops/ContactShopButton";
import { FollowShopButton } from "@/components/shops/FollowShopButton";
import { StarSellerAvatar } from "@/components/shops/StarSellerAvatar";
import type { SellerShopBannerPayload } from "@/lib/data/seller-storefront-types";
import {
  maxBadgesForSurface,
  selectVisibleSellerBadges,
} from "@/lib/seller-badges/presentation";
import {
  getSellerAccentMutedTextColor,
  getSellerAccentTextColor,
  sellerShopShellClass,
} from "@/lib/utils/seller-storefront";
import { SellerShopBanner } from "./SellerShopBanner";
import { SellerShopEditorReadyBeacon } from "./SellerShopEditorReadyBeacon";
import { SellerShopEditorThemeBridge } from "./SellerShopEditorThemeBridge";
import { ShopEditorAction } from "./ShopEditorAction";

type SellerProfile = Seller & {
  tagline?: string | null;
  on_vacation?: boolean;
  sellable?: boolean;
  vacation_announcement?: string | null;
  vacation_announcement_html?: string | null;
  accepts_custom_orders?: boolean;
  shop_accent_color?: string | null;
};

interface SellerShopHeaderProps {
  seller: SellerProfile;
  basePath: string;
  following: boolean;
  followersCount?: number;
  messagingAvailable?: boolean;
  shopPath: string;
  shopBanner?: SellerShopBannerPayload | null;
  marketplaceName?: string;
  editorPreview?: boolean;
}
export async function SellerShopHeader({
  seller,
  basePath,
  following,
  followersCount = 0,
  messagingAvailable = true,
  shopPath,
  shopBanner,
  editorPreview = false,
}: SellerShopHeaderProps) {
  const t = await getTranslations("sellers");
  const locale = await getLocale();
  const cover = seller.cover_photo_url;
  const onVacation = seller.on_vacation === true;
  const rawSalesCount = Number(seller.sales_count ?? 0);
  const salesCount =
    Number.isFinite(rawSalesCount) && rawSalesCount > 0
      ? new Intl.NumberFormat(locale, {
          notation: "compact",
          maximumFractionDigits: 1,
        })
          .format(rawSalesCount)
          .replace(/K$/, "k")
      : null;
  const visibleSellerBadges = selectVisibleSellerBadges(seller.badges, {
    showSellerBadges: true,
    allowedSellerBadges: null,
    maxSellerBadges: maxBadgesForSurface(
      { showSellerBadges: true, allowedSellerBadges: null, maxSellerBadges: 8 },
      "seller_shop",
    ),
  });
  const bannerHasImages = shopBanner?.slides.some((slide) =>
    Boolean(slide.image_url?.trim()),
  );
  const bannerHidden = shopBanner?.layout === "none";
  const accentColor = seller.shop_accent_color?.trim() || null;
  const accentText = accentColor ? getSellerAccentTextColor(accentColor) : null;
  const lightAccent = accentText === "#222222";
  const actionBackground = "#ffffff";
  const actionBorder = "#29252d";
  const actionText = "#29252d";
  const sellerStyle = accentColor
    ? ({
        "--marketplace-seller-accent": accentColor,
        "--marketplace-seller-accent-text": accentText,
        "--marketplace-seller-accent-muted": getSellerAccentMutedTextColor(
          accentText ?? "#222222",
        ),
        "--marketplace-seller-action-bg": actionBackground,
        "--marketplace-seller-action-border": actionBorder,
        "--marketplace-seller-action-text": actionText,
        "--marketplace-seller-rating-star": lightAccent ? "#5a3c12" : "#ffffff",
        "--marketplace-seller-rating-empty": lightAccent
          ? "var(--marketplace-border)"
          : "rgb(255 255 255 / 55%)",
      } as CSSProperties)
    : ({
        "--marketplace-seller-action-bg": actionBackground,
        "--marketplace-seller-action-border": actionBorder,
        "--marketplace-seller-action-text": actionText,
      } as CSSProperties);

  return (
    <header
      className="bg-marketplace-surface"
      data-theme-seller-banner
      data-theme-seller-identity
      style={sellerStyle}
    >
      <SellerShopEditorThemeBridge enabled={editorPreview} />
      {editorPreview ? <SellerShopEditorReadyBeacon /> : null}
      {bannerHidden ? null : shopBanner && bannerHasImages ? (
        <SellerShopBanner
          banner={shopBanner}
          basePath={basePath}
          editorPreview={editorPreview}
        />
      ) : cover ? (
        <div
          data-seller-shop-cover-fallback
          className="relative h-[var(--marketplace-seller-cover-height-mobile)] w-full overflow-hidden bg-marketplace-surface-warm md:h-[var(--marketplace-seller-cover-height-desktop)]"
        >
          {/* biome-ignore lint/performance/noImgElement: remote seller cover URLs */}
          <img src={cover} alt="" className="h-full w-full object-cover" />
          {editorPreview ? (
            <>
              <div className="absolute left-3 top-3 z-10">
                <ShopEditorAction
                  action="banner-layout"
                  label="Change layout"
                  showLabel
                  className="inline-flex h-8 items-center gap-2 rounded-full bg-white px-3 text-xs font-semibold text-[#222] shadow hover:bg-white/90"
                />
              </div>
              <ShopEditorAction
                action="banner"
                label="Edit banner"
                className="absolute bottom-3 right-3 z-10 inline-flex size-9 items-center justify-center rounded-full bg-white text-[#222] shadow hover:bg-white/90"
              />
            </>
          ) : null}
        </div>
      ) : editorPreview ? (
        <section
          aria-label="Shop banner"
          className="relative flex h-[var(--marketplace-seller-cover-height-mobile)] w-full items-end bg-marketplace-surface-warm px-4 pb-4 md:h-[var(--marketplace-seller-cover-height-desktop)]"
        >
          <p className="text-sm font-medium text-[#766f78]">{seller.name}</p>
          <div className="absolute left-3 top-3 z-10">
            <ShopEditorAction
              action="banner-layout"
              label="Change layout"
              showLabel
              className="inline-flex h-8 items-center gap-2 rounded-full bg-white px-3 text-xs font-semibold text-[#222] shadow hover:bg-white/90"
            />
          </div>
          <ShopEditorAction
            action="banner"
            label="Edit banner"
            className="absolute bottom-3 right-3 z-10 inline-flex size-9 items-center justify-center rounded-full bg-white text-[#222] shadow hover:bg-white/90"
          />
        </section>
      ) : null}

      <div
        className="bg-white"
        style={{
          backgroundColor: "var(--marketplace-seller-accent, #ffffff)",
        }}
      >
        <div className={sellerShopShellClass}>
          <div className="flex flex-col gap-5 py-6 sm:min-h-[152px] sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:py-7">
            <div className="flex min-w-0 items-center gap-4">
              <StarSellerAvatar
                seller={seller}
                href={shopPath}
                sizeClassName="size-[88px] sm:size-[94px]"
                imageSizes="94px"
              />
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <h1 className="truncate text-xl font-medium leading-tight text-[var(--marketplace-seller-accent-text,#29252d)] sm:text-2xl">
                    {seller.name}
                  </h1>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--marketplace-seller-accent-muted,#766f78)]">
                  {seller.average_rating != null && seller.reviews_count > 0 ? (
                    <span className="inline-flex items-center gap-1 font-medium text-[var(--marketplace-seller-accent-text,#29252d)]">
                      <Star
                        className="size-3.5 fill-current"
                        aria-hidden="true"
                      />
                      {seller.average_rating.toFixed(1)}
                      <span className="font-normal text-[var(--marketplace-seller-accent-muted,#766f78)]">
                        ({seller.reviews_count.toLocaleString(locale)})
                      </span>
                    </span>
                  ) : null}
                  {seller.average_rating != null && seller.reviews_count > 0 ? (
                    <span aria-hidden="true">·</span>
                  ) : null}
                  {salesCount ? (
                    <>
                      <span>
                        {t("salesCountCompact", { count: salesCount })}
                      </span>
                      <span aria-hidden="true">·</span>
                    </>
                  ) : null}
                  <span>{t("followersCount", { count: followersCount })}</span>
                </div>
                {seller.ships_from?.trim() ? (
                  <div className="mt-1.5 inline-flex items-center gap-1 text-sm text-[var(--marketplace-seller-accent-muted,#766f78)]">
                    <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                    <span>
                      {t("shipsFrom", { location: seller.ships_from.trim() })}
                    </span>
                  </div>
                ) : null}
                {visibleSellerBadges.length > 0 ? (
                  <SellerBadgeRow
                    badges={visibleSellerBadges}
                    surface="seller_shop"
                    className="mt-2"
                  />
                ) : (
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-[var(--marketplace-seller-accent-text,#29252d)]">
                    {seller.badges?.some(
                      (badge) =>
                        badge.key === "on_time_shipping" &&
                        badge.awarded_at != null,
                    ) ? (
                      <span className="inline-flex items-center gap-1">
                        <PackageCheck className="size-3.5" aria-hidden="true" />
                        {t("smoothShipping")}
                      </span>
                    ) : null}
                    {seller.badges?.some(
                      (badge) =>
                        badge.key === "fast_responder" &&
                        badge.awarded_at != null,
                    ) ? (
                      <span className="inline-flex items-center gap-1">
                        <MailCheck className="size-3.5" aria-hidden="true" />
                        {t("speedyReplies")}
                      </span>
                    ) : null}
                  </div>
                )}
              </div>
            </div>

            <div className="flex w-full shrink-0 flex-col gap-2 sm:w-40">
              {editorPreview && bannerHidden ? (
                <ShopEditorAction
                  action="banner-layout"
                  label="Change layout"
                  showLabel
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-[#29252d] bg-white px-3 text-xs font-semibold text-[#29252d] shadow-none hover:bg-[#f8f6f4]"
                />
              ) : null}
              <FollowShopButton
                sellerId={seller.id}
                sellerSlug={seller.slug}
                initialFollowing={following}
                prominent
                followLabel={t("headerFollow")}
                className="h-11 w-full justify-center border-[#29252d] bg-white text-[#29252d] shadow-none hover:bg-[#f8f6f4]"
              />
              <ContactShopButton
                basePath={basePath}
                sellerSlug={seller.slug}
                returnTo={shopPath}
                messagingAvailable={messagingAvailable}
                prominent
                label="contact"
                className="h-11 w-full justify-center border-[#29252d] bg-white text-[#29252d] shadow-none hover:bg-[#f8f6f4]"
              />
            </div>
          </div>

          {onVacation ? (
            <div
              role="status"
              className="mb-4 rounded-[var(--marketplace-radius-sm)] border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-950"
            >
              <p className="flex items-center gap-2 font-medium">
                <VacationMode className="size-4 shrink-0" aria-hidden />
                {t("vacationTitle")}
              </p>
              {seller.vacation_announcement_html ||
              seller.vacation_announcement ? (
                <div
                  className="prose prose-sm mt-1 max-w-none text-amber-900"
                  dangerouslySetInnerHTML={{
                    __html:
                      seller.vacation_announcement_html ||
                      seller.vacation_announcement ||
                      "",
                  }}
                />
              ) : (
                <p className="mt-1 text-amber-900/90">{t("vacationDefault")}</p>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
