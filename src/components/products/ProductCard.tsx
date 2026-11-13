"use client";

import type { Product } from "@spree/sdk";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { type MouseEvent, memo, useState } from "react";
import { Star } from "@/components/icons";
import { FavoriteButton } from "@/components/products/FavoriteButton";
import { FeaturedCollectionQuickAdd } from "@/components/products/FeaturedCollectionQuickAdd";
import { HiddenPricePrompt } from "@/components/products/HiddenPricePrompt";
import {
  MerchandisingBadges,
  type MerchandisingSignal,
} from "@/components/products/MerchandisingBadges";
import { MerchandisingReason } from "@/components/products/MerchandisingReason";
import { RecommendationDismissButton } from "@/components/products/RecommendationDismissButton";
import { StarSellerAvatar } from "@/components/shops/StarSellerAvatar";
import { ProductImage } from "@/components/ui/product-image";
import { useStoreThemeSettings } from "@/contexts/ThemeSettingsContext";
import { trackSelectItem } from "@/lib/analytics/gtm";
import type { RecommendationClickContext } from "@/lib/analytics/recommendation-click";
import { recordRecommendationProductClick } from "@/lib/analytics/recommendation-click";
import { productDetailPathSegment } from "@/lib/discovery-context";
import {
  filterSignalsForSurface,
  type MerchandisingSurface,
  parseMerchandisingThemeSettings,
  selectProductCardImageBadges,
} from "@/lib/merchandising/presentation";
import { useIsMobile } from "@/lib/merchandising/use-is-mobile";
import { filterMerchandisingSignalsForSellerBadges } from "@/lib/seller-badges/presentation";
import { themeSettingEnabled } from "@/lib/theme/setting-value";

interface ProductCardProps {
  product: Product;
  basePath?: string;
  categoryId?: string;
  index?: number;
  listId?: string;
  listName?: string;
  fetchPriority?: "high" | "low" | "auto";
  currency?: string;
  favorited?: boolean;
  onFavoriteChange?: (productId: string, favorited: boolean) => void;
  showFavorite?: boolean;
  href?: string;
  density?:
    | "default"
    | "standard"
    | "compact"
    | "editorial"
    | "rail"
    /** Full Etsy-style card for PDP “You may also like” grids (ignores theme compact). */
    | "discovery";
  showSecondImageOnHover?: boolean;
  merchandisingSurface?: MerchandisingSurface;
  suppressRelevanceReason?: boolean;
  dismissibleRecommendation?: boolean;
  onDismissRecommendation?: () => void;
  dismissDisabled?: boolean;
  recommendationClick?: RecommendationClickContext;
  /** Paid placement disclosure — skips organic recommendation click tracking. */
  sponsoredDisclosure?: string;
  onSponsoredNavigate?: (event: MouseEvent<HTMLAnchorElement>) => void;
}

export const ProductCard = memo(function ProductCard({
  product,
  basePath = "",
  categoryId,
  index,
  listId,
  listName,
  fetchPriority,
  currency,
  favorited = false,
  onFavoriteChange,
  showFavorite = true,
  href,
  density = "standard",
  showSecondImageOnHover,
  merchandisingSurface = "product_card",
  suppressRelevanceReason = false,
  dismissibleRecommendation = false,
  onDismissRecommendation,
  dismissDisabled = false,
  recommendationClick,
  sponsoredDisclosure,
  onSponsoredNavigate,
}: ProductCardProps) {
  const t = useTranslations("products");
  const {
    products_grid: gridSettings,
    localization,
    product_swatches: swatchSettings,
  } = useStoreThemeSettings();
  const imageRatio =
    gridSettings?.image_ratio && gridSettings.image_ratio !== "adapt"
      ? { aspectRatio: "var(--marketplace-product-image-ratio)" }
      : undefined;
  const useNaturalImageRatio =
    gridSettings?.image_ratio === "adapt" && Boolean(product.thumbnail_url);
  const showVendor = themeSettingEnabled(gridSettings?.show_vendor, true);
  const showRating = themeSettingEnabled(gridSettings?.show_rating, true);
  const showCardFavorite =
    themeSettingEnabled(gridSettings?.show_favorites, true) && showFavorite;
  const showQuickAdd = themeSettingEnabled(gridSettings?.show_quick_add);
  const showSecondImage =
    showSecondImageOnHover ??
    themeSettingEnabled(gridSettings?.show_second_image);
  const imageUrl = product.thumbnail_url || null;
  const [activeCardImage, setActiveCardImage] = useState(0);
  const [activeRailImage, setActiveRailImage] = useState(0);
  const cardImages = Array.from(
    new Set(
      [
        imageUrl,
        ...(product.media || [])
          .filter((item) => item.media_type === "image")
          .map((item) => item.small_url || item.original_url || null),
      ].filter((url): url is string => Boolean(url)),
    ),
  );
  const cardImageUrl = cardImages[activeCardImage] || imageUrl;
  const railImages = Array.from(
    new Set(
      [
        imageUrl,
        ...(product.media || [])
          .filter((item) => item.media_type === "image")
          .map((item) => item.small_url || item.original_url || null),
      ].filter((url): url is string => Boolean(url)),
    ),
  );
  const railImageUrl = railImages[activeRailImage] || imageUrl;
  const secondImageUrl = showSecondImage
    ? product.media?.find(
        (item) => item.media_type === "image" && item.original_url !== imageUrl,
      )?.small_url || null
    : null;
  const rawDisplayPrice = product.price?.display_amount;
  const displayCurrency = currency || product.price?.currency || "";
  const displayPrice =
    rawDisplayPrice &&
    localization?.currency_format === "with_currency" &&
    displayCurrency &&
    !rawDisplayPrice.toUpperCase().includes(displayCurrency.toUpperCase())
      ? `${rawDisplayPrice} ${displayCurrency}`
      : rawDisplayPrice && localization?.currency_format === "without_currency"
        ? rawDisplayPrice.replace(/\s+[A-Z]{3}$/, "")
        : rawDisplayPrice;
  const currentAmountCents = product.price?.amount_in_cents;
  const originalAmountCents = product.original_price?.amount_in_cents;
  const compareAtAmountCents = product.price?.compare_at_amount_in_cents;
  const onSale =
    (currentAmountCents != null &&
      originalAmountCents != null &&
      currentAmountCents < originalAmountCents) ||
    (compareAtAmountCents != null &&
      currentAmountCents != null &&
      currentAmountCents < compareAtAmountCents);
  const strikethroughPrice = onSale
    ? ((product.original_price?.display_amount &&
      product.original_price.display_amount !== displayPrice
        ? product.original_price.display_amount
        : product.price?.display_compare_at_amount) ?? null)
    : null;
  const sellerName = product.seller?.name || product.seller_name;
  const sellerSlug = product.seller?.slug || product.seller_slug;
  const sellerAvatarUrl =
    product.seller?.square_logo_url || product.seller?.logo_url || null;
  const rating = product.average_rating;
  const reviewsCount = product.reviews_count ?? 0;
  const themeDensity = String(gridSettings?.card_density || "default");
  const effectiveDensity =
    density === "standard" || density === "default"
      ? themeDensity === "compact" || themeDensity === "editorial"
        ? themeDensity
        : density
      : density;
  const isCompact = effectiveDensity === "compact";
  const isRail = effectiveDensity === "rail";
  const isEditorial = effectiveDensity === "editorial";
  const isDiscovery = effectiveDensity === "discovery";
  const skuLabel =
    product.default_variant?.sku ||
    product.variants?.find((variant) => variant.sku)?.sku ||
    null;
  const personalizable = (product.personalization_fields?.length ?? 0) > 0;
  const isMobile = useIsMobile();
  const merchTheme = parseMerchandisingThemeSettings(
    gridSettings as Record<string, unknown> | undefined,
  );
  const maxBadges = isMobile
    ? (merchTheme.maxBadgesMobile ?? 1)
    : (merchTheme.maxBadgesDesktop ?? 2);
  const showBadges = Boolean(
    merchTheme.showCommerceBadges || merchTheme.showMarketplaceBadges,
  );
  const badgePosition = merchTheme.badgePosition ?? "top_left";
  const showPersonalizedSignals = merchTheme.showPersonalizedRelevance ?? true;
  const showRelevanceReason = merchTheme.showRelevanceReason ?? true;
  const allowedPersonalizedSignals = merchTheme.allowedPersonalizedSignals;
  const rawMerchandisingSignals =
    (
      product as Product & {
        merchandising_signals?: MerchandisingSignal[];
      }
    ).merchandising_signals ?? [];
  const merchandisingSignals = filterMerchandisingSignalsForSellerBadges(
    filterSignalsForSurface(rawMerchandisingSignals, merchandisingSurface, {
      sellerSlug,
      suppressRelevanceReason,
    }),
    product.seller?.badges,
  );
  const merchandisingProductId =
    product.default_variant?.sku ||
    product.variants?.find((variant) => variant.sku)?.sku ||
    product.slug;
  const productHref =
    href ??
    `${basePath}/products/${productDetailPathSegment(product)}${categoryId ? `?category_id=${categoryId}` : ""}`;
  const swatchOption = String(
    swatchSettings?.option_name || "color",
  ).toLowerCase();
  const productSwatches = themeSettingEnabled(swatchSettings?.enabled)
    ? (product.option_values || []).filter(
        (value) =>
          value.option_type_name.toLowerCase() === swatchOption ||
          value.option_type_label.toLowerCase() === swatchOption,
      )
    : [];
  const swatches = productSwatches.slice(0, 6);
  const swatchStyle = String(swatchSettings?.color_style || "color");
  const swatchSize = String(swatchSettings?.size || "medium");

  const handleClick = (event: MouseEvent) => {
    if (onSponsoredNavigate) {
      onSponsoredNavigate(event as MouseEvent<HTMLAnchorElement>);
      return;
    }
    if (index != null && listId && listName && currency) {
      trackSelectItem(product, listId, listName, index, currency);
    }
    recordRecommendationProductClick(event, {
      productId: product.id,
      context: recommendationClick,
      href: productHref,
    });
  };

  if (isRail) {
    return (
      <article
        className="group/card relative h-full"
        data-merchandising-product={merchandisingProductId}
      >
        <div
          className={`relative overflow-hidden rounded-lg bg-marketplace-surface-subtle ${useNaturalImageRatio ? "" : "aspect-square"}`}
          style={imageRatio}
        >
          <Link
            href={productHref}
            className="absolute inset-0 z-[1]"
            aria-label={product.name}
            onClick={handleClick}
          />
          <ProductImage
            src={railImageUrl}
            alt={product.name}
            {...(useNaturalImageRatio
              ? { width: 1200, height: 1500 }
              : { fill: true })}
            className={
              useNaturalImageRatio
                ? "h-auto w-full object-cover"
                : "object-cover"
            }
            sizes="(max-width: 640px) 48vw, (max-width: 1280px) 20vw, 240px"
            iconClassName="size-10"
            fetchPriority={fetchPriority}
          />
          {showSecondImage && secondImageUrl ? (
            <img
              src={secondImageUrl}
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-200 group-hover/card:opacity-100 motion-reduce:transition-none"
            />
          ) : null}
          <ProductCardBadges
            signals={merchandisingSignals}
            show={showBadges}
            maxBadges={maxBadges}
            merchTheme={merchTheme}
            position={badgePosition}
            onSale={onSale}
            personalizable={personalizable}
            saleLabel={t("sale")}
            personalizableLabel={t("personalizable")}
            clearDismissControl={
              dismissibleRecommendation && Boolean(onDismissRecommendation)
            }
          />
          {dismissibleRecommendation && onDismissRecommendation ? (
            <div className="pointer-events-none absolute left-2 top-2 z-[3]">
              <RecommendationDismissButton
                onClick={onDismissRecommendation}
                disabled={dismissDisabled}
              />
            </div>
          ) : null}
          {showCardFavorite ? (
            <div className="pointer-events-none absolute right-2 top-2 z-[2] opacity-100 transition-opacity duration-150 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/card:opacity-100 [@media(hover:hover)]:group-focus-within/card:opacity-100 motion-reduce:transition-none">
              <FavoriteButton
                productId={product.id}
                variantId={product.default_variant_id}
                favorited={favorited}
                onChange={onFavoriteChange}
                className="pointer-events-auto size-9 !bg-white hover:!bg-white"
              />
            </div>
          ) : null}
          {railImages.length > 1 ? (
            <nav
              className="absolute bottom-2 left-2 z-[3] flex items-center gap-1 rounded-full bg-white/95 px-1.5 py-1 shadow-[var(--marketplace-shadow-card)] backdrop-blur-[2px]"
              aria-label={t("galleryPagination", {
                current: activeRailImage + 1,
                total: railImages.length,
              })}
            >
              {railImages.map((image, imageIndex) => (
                <button
                  key={image}
                  type="button"
                  aria-label={t("galleryPagination", {
                    current: imageIndex + 1,
                    total: railImages.length,
                  })}
                  aria-current={
                    activeRailImage === imageIndex ? "true" : undefined
                  }
                  onClick={() => setActiveRailImage(imageIndex)}
                  className={`size-2 rounded-full border border-black/15 transition-colors ${activeRailImage === imageIndex ? "bg-marketplace-foreground" : "bg-white hover:bg-marketplace-accent"}`}
                />
              ))}
            </nav>
          ) : null}
        </div>
        <div className="pt-1.5">
          {sponsoredDisclosure ? (
            <p
              className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-marketplace-muted-foreground"
              data-sponsored-disclosure
            >
              {sponsoredDisclosure}
            </p>
          ) : null}
          <h3 className="line-clamp-1 text-xs leading-snug text-marketplace-foreground sm:text-sm">
            <Link href={productHref} onClick={handleClick}>
              {product.name}
            </Link>
          </h3>
          {displayPrice ? (
            <span className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5 text-xs font-semibold tabular-nums">
              <span className="text-[#3f6b24]">{displayPrice}</span>
              {onSale && strikethroughPrice ? (
                <span className="font-normal text-marketplace-muted-foreground line-through">
                  {strikethroughPrice}
                </span>
              ) : null}
            </span>
          ) : (
            <div className="mt-0.5 text-xs">
              <HiddenPricePrompt />
            </div>
          )}
        </div>
      </article>
    );
  }

  if (isCompact) {
    return (
      <div
        className="group relative"
        data-merchandising-product={merchandisingProductId}
      >
        <div
          className={`relative overflow-hidden rounded-[var(--marketplace-product-card-radius)] bg-marketplace-surface-subtle ${useNaturalImageRatio ? "" : "aspect-square"}`}
          style={imageRatio}
        >
          <ProductImage
            src={imageUrl}
            alt={product.name}
            {...(useNaturalImageRatio
              ? { width: 1200, height: 1500 }
              : { fill: true })}
            className={`object-cover transition-transform duration-200 ease-out group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100 ${useNaturalImageRatio ? "h-auto w-full" : ""}`}
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
            iconClassName="size-10"
            fetchPriority={fetchPriority}
          />
          {secondImageUrl ? (
            <img
              src={secondImageUrl}
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-200 group-hover:opacity-100 motion-reduce:transition-none"
            />
          ) : null}
          <ProductCardBadges
            signals={merchandisingSignals}
            show={showBadges}
            maxBadges={maxBadges}
            merchTheme={merchTheme}
            position={badgePosition}
            onSale={onSale}
            personalizable={personalizable}
            saleLabel={t("sale")}
            personalizableLabel={t("personalizable")}
            clearDismissControl={
              dismissibleRecommendation && Boolean(onDismissRecommendation)
            }
          />
          {showCardFavorite ? (
            <div className="absolute right-2 top-2 z-[2]">
              <FavoriteButton
                productId={product.id}
                variantId={product.default_variant_id}
                favorited={favorited}
                onChange={onFavoriteChange}
                className="opacity-100 transition-opacity duration-150 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 md:focus-visible:opacity-100 motion-reduce:transition-none"
              />
            </div>
          ) : null}
        </div>
        <div className="pt-2">
          <h3 className="line-clamp-1 text-xs font-medium text-marketplace-foreground transition-colors group-hover:text-marketplace-brand sm:text-sm">
            <Link
              href={productHref}
              className="after:absolute after:inset-0 after:z-0"
              onClick={handleClick}
            >
              {product.name}
            </Link>
          </h3>
          {showPersonalizedSignals && showRelevanceReason ? (
            <MerchandisingReason
              signals={merchandisingSignals}
              allowedSignals={allowedPersonalizedSignals}
              className="relative z-[1]"
            />
          ) : null}
          {displayPrice ? (
            <span className="mt-0.5 text-sm font-semibold text-marketplace-foreground">
              {displayPrice}
            </span>
          ) : (
            <HiddenPricePrompt />
          )}
          {swatches.length > 0 ? (
            <ProductCardSwatches
              options={swatches}
              total={productSwatches.length}
              style={swatchStyle}
              size={swatchSize}
            />
          ) : null}
          {showQuickAdd && product.purchasable && !personalizable ? (
            <div className="relative z-[2] mt-2">
              <FeaturedCollectionQuickAdd
                variantId={product.default_variant_id}
              />
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <article
      className="group/card relative min-w-0"
      data-card-density={effectiveDensity}
      data-merchandising-product={merchandisingProductId}
      data-theme-product-card
    >
      {(showVendor || isDiscovery) && sellerName ? (
        <div className="relative z-[2] mb-2 flex min-w-0 items-center gap-2">
          {product.seller ? (
            <StarSellerAvatar
              seller={product.seller}
              href={
                sellerSlug ? `${basePath}/sellers/${sellerSlug}` : undefined
              }
              sizeClassName={isDiscovery ? "size-7" : "size-9"}
              imageSizes="36px"
            />
          ) : sellerAvatarUrl ? (
            <img
              src={sellerAvatarUrl}
              alt=""
              className="size-7 shrink-0 rounded-full object-cover ring-1 ring-black/5"
            />
          ) : (
            <span
              className="flex size-7 shrink-0 items-center justify-center rounded-full bg-marketplace-surface-subtle text-[11px] font-semibold text-marketplace-foreground ring-1 ring-black/5"
              aria-hidden
            >
              {sellerName.trim().charAt(0).toUpperCase()}
            </span>
          )}
          {sellerSlug ? (
            <Link
              href={`${basePath}/sellers/${sellerSlug}`}
              className="min-w-0 flex-1 truncate text-sm font-medium text-marketplace-foreground hover:text-marketplace-brand hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marketplace-brand"
            >
              {sellerName}
            </Link>
          ) : (
            <p className="min-w-0 flex-1 truncate text-sm font-medium text-marketplace-foreground">
              {sellerName}
            </p>
          )}
        </div>
      ) : null}
      <div
        className={`relative overflow-hidden rounded-[var(--marketplace-product-card-radius,1rem)] bg-marketplace-surface-subtle ${useNaturalImageRatio ? "" : isDiscovery ? "aspect-square" : "aspect-[var(--marketplace-product-image-ratio)]"}`}
        style={isDiscovery ? undefined : imageRatio}
      >
        <Link
          href={productHref}
          className="absolute inset-0 z-[1]"
          aria-label={product.name}
          onClick={handleClick}
        />
        <ProductImage
          src={cardImageUrl}
          alt={product.name}
          {...(useNaturalImageRatio
            ? { width: 1200, height: 1500 }
            : { fill: true })}
          className={`object-cover transition-transform duration-200 ease-out group-hover/card:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover/card:scale-100 ${useNaturalImageRatio ? "h-auto w-full" : ""}`}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          iconClassName="size-14"
          fetchPriority={fetchPriority}
        />
        {showSecondImage && secondImageUrl && cardImages.length <= 1 ? (
          <img
            src={secondImageUrl}
            alt=""
            aria-hidden
            className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-200 group-hover/card:opacity-100 motion-reduce:transition-none"
          />
        ) : null}
        <ProductCardBadges
          signals={merchandisingSignals}
          show={showBadges && !isDiscovery}
          maxBadges={maxBadges}
          merchTheme={merchTheme}
          position={badgePosition}
          onSale={onSale}
          personalizable={personalizable}
          saleLabel={t("sale")}
          personalizableLabel={t("personalizable")}
          clearDismissControl={
            dismissibleRecommendation && Boolean(onDismissRecommendation)
          }
        />
        {dismissibleRecommendation && onDismissRecommendation ? (
          <div className="pointer-events-none absolute left-2 top-2 z-[3]">
            <RecommendationDismissButton
              onClick={onDismissRecommendation}
              disabled={dismissDisabled}
            />
          </div>
        ) : null}
        {showCardFavorite && !isDiscovery ? (
          <div className="pointer-events-none absolute right-2 top-2 z-[2] opacity-100 transition-opacity duration-150 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/card:opacity-100 [@media(hover:hover)]:group-focus-within/card:opacity-100 motion-reduce:transition-none">
            <FavoriteButton
              productId={product.id}
              variantId={product.default_variant_id}
              favorited={favorited}
              onChange={onFavoriteChange}
              className="pointer-events-auto size-9 !bg-white hover:!bg-white"
            />
          </div>
        ) : null}
        {!isDiscovery && cardImages.length > 1 ? (
          <nav
            className="absolute bottom-3 left-3 z-[3] flex items-center gap-1.5"
            aria-label={t("galleryPagination", {
              current: activeCardImage + 1,
              total: cardImages.length,
            })}
          >
            {cardImages.map((image, imageIndex) => (
              <button
                key={image}
                type="button"
                aria-label={t("galleryPagination", {
                  current: imageIndex + 1,
                  total: cardImages.length,
                })}
                aria-current={
                  activeCardImage === imageIndex ? "true" : undefined
                }
                onClick={() => setActiveCardImage(imageIndex)}
                className={`rounded-full border-0 transition-all ${
                  activeCardImage === imageIndex
                    ? "h-1.5 w-4 bg-white/95 shadow-sm"
                    : "size-1.5 bg-white/55 hover:bg-white/80"
                }`}
              />
            ))}
          </nav>
        ) : null}
        <div
          className={
            isDiscovery
              ? "pointer-events-none absolute bottom-2.5 right-2.5 z-[2] flex max-w-[calc(100%-1.25rem)] items-center rounded-md bg-[#fffdf8]/95 px-2 py-1 text-[13px] shadow-[0_1px_2px_rgba(34,34,34,0.1)] backdrop-blur-[2px] ring-1 ring-black/[0.04]"
              : "pointer-events-none absolute bottom-3 right-3 z-[2] flex max-w-[calc(100%-1.5rem)] items-center gap-1 rounded-full bg-white px-2.5 py-1 shadow-[0_1px_3px_rgba(0,0,0,0.12)]"
          }
          data-theme-product-price-pill
          data-price-variant={isDiscovery ? "discovery" : "default"}
        >
          {displayPrice ? (
            <ProductCardPricePill
              amount={displayPrice}
              onSale={onSale}
              strikethroughPrice={strikethroughPrice}
            />
          ) : (
            <HiddenPricePrompt />
          )}
        </div>
      </div>

      <div
        className={`min-w-0 space-y-1 ${isEditorial ? "pt-4" : isDiscovery ? "pt-2" : "pt-2.5"}`}
      >
        {sponsoredDisclosure ? (
          <p
            className="text-[10px] font-semibold uppercase tracking-wide text-marketplace-muted-foreground"
            data-sponsored-disclosure
          >
            {sponsoredDisclosure}
          </p>
        ) : null}
        <h3
          className={`relative z-[1] min-w-0 line-clamp-2 font-normal leading-snug text-marketplace-foreground ${isEditorial ? "text-base" : "text-sm"}`}
        >
          <Link
            href={productHref}
            className="hover:text-marketplace-brand focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marketplace-brand"
            onClick={handleClick}
          >
            {product.name}
          </Link>
        </h3>
        {skuLabel ? (
          <p className="relative z-[1] truncate text-xs text-marketplace-muted-foreground">
            {skuLabel}
          </p>
        ) : null}
        {showPersonalizedSignals && showRelevanceReason && !isDiscovery ? (
          <MerchandisingReason
            signals={merchandisingSignals}
            allowedSignals={allowedPersonalizedSignals}
            className="relative z-[1]"
          />
        ) : null}
        {(showRating || isDiscovery) && rating != null && reviewsCount > 0 ? (
          <div className="relative z-[1] flex flex-wrap items-center gap-x-1 gap-y-0.5 text-xs text-marketplace-muted-foreground">
            <span className="font-medium text-marketplace-foreground">
              {rating.toFixed(1)}
            </span>
            <Star
              className="size-3.5 fill-marketplace-foreground text-marketplace-foreground"
              aria-hidden
            />
            <span>({reviewsCount.toLocaleString()})</span>
          </div>
        ) : null}
        {!isDiscovery && swatches.length > 0 ? (
          <ProductCardSwatches
            options={swatches}
            total={productSwatches.length}
            style={swatchStyle}
            size={swatchSize}
          />
        ) : null}
        {!product.purchasable ? (
          <span className="block text-xs text-marketplace-muted-foreground">
            {t("outOfStock")}
          </span>
        ) : null}
        {!isDiscovery &&
        showQuickAdd &&
        product.purchasable &&
        !personalizable ? (
          <div className="relative z-[2] mt-1">
            <FeaturedCollectionQuickAdd
              variantId={product.default_variant_id}
            />
          </div>
        ) : null}
      </div>
    </article>
  );
});

function ProductCardPricePill({
  amount,
  onSale,
  strikethroughPrice,
}: {
  amount: string;
  onSale: boolean;
  strikethroughPrice: string | null;
}) {
  return (
    <span
      className={`flex flex-wrap items-baseline gap-x-1.5 text-xs font-semibold tabular-nums ${onSale ? "text-marketplace-sale" : "text-marketplace-foreground"}`}
    >
      <span>{amount}</span>
      {onSale && strikethroughPrice ? (
        <span className="text-[10px] font-medium text-marketplace-muted-foreground line-through">
          {strikethroughPrice}
        </span>
      ) : null}
    </span>
  );
}

function ProductCardBadges({
  signals,
  show,
  maxBadges,
  merchTheme,
  position,
  onSale,
  personalizable,
  saleLabel,
  personalizableLabel,
  clearDismissControl = false,
}: {
  signals: MerchandisingSignal[];
  show: boolean;
  maxBadges: number;
  merchTheme: ReturnType<typeof parseMerchandisingThemeSettings>;
  position: "top_left" | "top_right";
  onSale: boolean;
  personalizable: boolean;
  saleLabel: string;
  personalizableLabel: string;
  clearDismissControl?: boolean;
}) {
  if (!show) return null;

  const visibleSignals = selectProductCardImageBadges({
    signals,
    maxBadges,
    allowedCommerceBadges: merchTheme.allowedCommerceBadges,
    allowedMarketplaceBadges: merchTheme.allowedMarketplaceBadges,
    showCommerceBadges: merchTheme.showCommerceBadges,
    showMarketplaceBadges: merchTheme.showMarketplaceBadges,
  });
  const allowedCommerce = merchTheme.allowedCommerceBadges;
  const saleAllowed = !allowedCommerce || allowedCommerce.includes("sale");
  const hasBackendSale = signals.some((signal) => signal.key === "sale");
  const showLegacySale =
    onSale &&
    saleAllowed &&
    !hasBackendSale &&
    visibleSignals.length < maxBadges;
  const showPersonalizable =
    personalizable &&
    visibleSignals.length + (showLegacySale ? 1 : 0) < maxBadges;

  if (visibleSignals.length === 0 && !showLegacySale && !showPersonalizable) {
    return null;
  }

  return (
    <div
      className={`pointer-events-none absolute top-2.5 z-[1] flex max-w-[calc(100%-3rem)] flex-wrap gap-1 ${
        position === "top_right"
          ? "right-2.5 mr-10 justify-end"
          : clearDismissControl
            ? "left-12"
            : "left-2.5"
      }`}
    >
      <MerchandisingBadges
        signals={visibleSignals}
        maxBadges={maxBadges}
        position={position}
        className="!static max-w-none"
      />
      {showLegacySale ? (
        <span className="rounded-full bg-marketplace-sale px-2 py-0.5 text-[11px] font-semibold leading-4 text-white">
          {saleLabel}
        </span>
      ) : null}
      {showPersonalizable ? (
        <span className="rounded-full bg-marketplace-surface/95 px-2 py-0.5 text-[11px] font-medium leading-4 text-marketplace-foreground ring-1 ring-marketplace-border">
          {personalizableLabel}
        </span>
      ) : null}
    </div>
  );
}

export function ProductCardSwatches({
  options,
  total,
  style,
  size,
  label = "Available color options",
}: {
  options: NonNullable<Product["option_values"]>;
  total: number;
  style: string;
  size: string;
  label?: string;
}) {
  const dotSize =
    size === "small" ? "size-3" : size === "large" ? "size-5" : "size-4";
  const labelSize =
    size === "small"
      ? "text-[9px] px-1.5"
      : size === "large"
        ? "text-xs px-2.5"
        : "text-[10px] px-2";
  return (
    <ul
      aria-label={label}
      className="relative z-[1] mt-2 flex flex-wrap items-center gap-1.5"
    >
      {options.map((option) => (
        <li key={option.id}>
          <span
            role="img"
            aria-label={option.label}
            title={option.label}
            className={
              style === "label" || style === "label_color"
                ? `rounded border border-marketplace-border py-0.5 ${labelSize}`
                : `block ${dotSize} rounded-full border border-marketplace-border`
            }
            style={
              style === "image" && option.image_url
                ? {
                    backgroundImage: `url(${option.image_url})`,
                    backgroundSize: "cover",
                  }
                : style !== "label" && option.color_code
                  ? { backgroundColor: option.color_code }
                  : undefined
            }
          >
            {style === "label" || style === "label_color" ? option.label : null}
          </span>
        </li>
      ))}
      {total > options.length ? (
        <li className="text-[10px] text-marketplace-muted-foreground">
          +{total - options.length}
        </li>
      ) : null}
    </ul>
  );
}
