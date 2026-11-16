"use client";

import type { Product } from "@spree/sdk";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { FavoriteButton } from "@/components/products/FavoriteButton";
import { ProductCardSwatches } from "@/components/products/ProductCard";
import { VerifiedHandmadeBadge } from "@/components/products/VerifiedHandmadeBadge";
import { ProductImage } from "@/components/ui/product-image";
import { useStoreThemeSettings } from "@/contexts/ThemeSettingsContext";
import { productDetailPathSegment } from "@/lib/discovery-context";
import { themeSettingEnabled } from "@/lib/theme/setting-value";
import { FeaturedCollectionQuickAdd } from "./FeaturedCollectionQuickAdd";

type CardPart = {
  type: string;
  settings: Record<string, unknown>;
  disabled?: boolean;
};

function formatPrice(
  amount: string | null | undefined,
  currency: string | undefined,
  format: unknown,
) {
  if (!amount) return amount;
  if (
    format === "with_currency" &&
    currency &&
    !amount.toUpperCase().includes(currency.toUpperCase())
  ) {
    return `${amount} ${currency}`;
  }
  if (format === "without_currency") return amount.replace(/\s+[A-Z]{3}$/, "");
  return amount;
}

function themeColor(value: unknown, role: "background" | "text") {
  if (typeof value === "string" && /^#[0-9a-fA-F]{6}$/i.test(value)) {
    return value;
  }
  if (value === "palette") {
    return role === "background"
      ? "var(--marketplace-surface-warm)"
      : "var(--marketplace-foreground)";
  }
  return undefined;
}

export function FeaturedCollectionProductCard({
  product,
  parts,
  basePath,
  quickAdd,
  mobileQuickAdd,
  currency,
  showSecondImageOnHover,
  transition = "none",
}: {
  product: Product;
  parts: CardPart[];
  basePath: string;
  quickAdd: boolean;
  mobileQuickAdd: boolean;
  currency?: string;
  showSecondImageOnHover?: boolean;
  transition?: string;
}) {
  const t = useTranslations("products");
  const {
    localization,
    products_grid: gridSettings,
    product_swatches: swatchSettings,
  } = useStoreThemeSettings();
  const showVendor = themeSettingEnabled(gridSettings?.show_vendor, true);
  const showFavorites = themeSettingEnabled(gridSettings?.show_favorites, true);
  const media = parts.find((part) => part.type === "media");
  const title = parts.find((part) => part.type === "product_title");
  const price = parts.find((part) => part.type === "price");
  const reviews = parts.find((part) => part.type === "review_stars");
  const sku = parts.find((part) => part.type === "sku");
  const swatches = parts.find((part) => part.type === "swatches");
  const swatchOption = String(
    swatchSettings?.option_name || "color",
  ).toLowerCase();
  const globalSwatches = themeSettingEnabled(swatchSettings?.enabled)
    ? (product.option_values || []).filter(
        (option) =>
          String(option.option_type_name || "").toLowerCase() ===
            swatchOption ||
          String(option.option_type_label || "").toLowerCase() === swatchOption,
      )
    : [];
  const displayedSwatches = swatches
    ? product.option_values || []
    : globalSwatches;
  const buyButtons = parts.find((part) => part.type === "buy_buttons");
  const showQuickAdd = buyButtons
    ? themeSettingEnabled(buyButtons.settings.quick_add)
    : quickAdd ||
      mobileQuickAdd ||
      themeSettingEnabled(gridSettings?.show_quick_add);
  const mobileOnlyQuickAdd =
    !buyButtons &&
    !quickAdd &&
    !themeSettingEnabled(gridSettings?.show_quick_add) &&
    mobileQuickAdd;
  const reviewProduct = product as Product & {
    average_rating?: number | null;
    reviews_count?: number;
  };
  if (
    !media &&
    !title &&
    !price &&
    !reviews &&
    !sku &&
    !swatches &&
    !buyButtons
  )
    return null;

  // Product API image records do not consistently include intrinsic dimensions,
  // so auto/adapt retain a stable card ratio instead of collapsing a fill image.
  const mediaAspect = String(media?.settings.aspect_ratio || "auto");
  const globalAspect = String(gridSettings?.image_ratio || "adapt");
  const effectiveAspect = mediaAspect === "auto" ? globalAspect : mediaAspect;
  const aspect =
    effectiveAspect === "square"
      ? "aspect-square"
      : effectiveAspect === "landscape"
        ? "aspect-[3/2]"
        : effectiveAspect === "portrait"
          ? "aspect-[4/5]"
          : "aspect-[4/5]";
  const image = product.thumbnail_url;
  const secondImage =
    (showSecondImageOnHover ??
    themeSettingEnabled(media?.settings.show_second_image_on_hover))
      ? product.media?.find(
          (item) => item.media_type === "image" && item.original_url !== image,
        )?.small_url
      : null;
  const href = `${basePath}/products/${productDetailPathSegment(product)}`;
  const displayPrice = formatPrice(
    product.price?.display_amount,
    currency,
    localization?.currency_format,
  );
  const compareAtPrice = formatPrice(
    product.original_price?.display_amount,
    currency,
    localization?.currency_format,
  );
  const titleSizes: Record<string, string> = {
    default: "text-sm",
    heading_1: "text-4xl",
    heading_2: "text-3xl",
    heading_3: "text-2xl",
    heading_4: "text-xl",
    heading_5: "text-lg",
    heading_6: "text-base",
  };
  const priceSizes: Record<string, string> = {
    default: "text-sm",
    heading_1: "text-4xl",
    heading_2: "text-3xl",
    heading_3: "text-2xl",
    heading_4: "text-xl",
    heading_5: "text-lg",
    heading_6: "text-base",
  };
  const dimensions = (settings: Record<string, unknown>) => ({
    paddingTop:
      typeof settings.padding_top === "number"
        ? settings.padding_top
        : undefined,
    paddingBottom:
      typeof settings.padding_bottom === "number"
        ? settings.padding_bottom
        : undefined,
    paddingLeft:
      typeof settings.padding_left === "number"
        ? settings.padding_left
        : undefined,
    paddingRight:
      typeof settings.padding_right === "number"
        ? settings.padding_right
        : undefined,
  });
  const cardStyle = {
    backgroundColor: themeColor(
      parts.find((part) => part.type === "product_card")?.settings
        .background_color,
      "background",
    ),
    border:
      parts.find((part) => part.type === "product_card")?.settings
        .border_style === "solid"
        ? "1px solid var(--marketplace-border)"
        : undefined,
    borderRadius:
      Number(
        parts.find((part) => part.type === "product_card")?.settings
          .corner_radius,
      ) || undefined,
    paddingTop:
      Number(
        parts.find((part) => part.type === "product_card")?.settings
          .padding_top,
      ) || undefined,
    paddingBottom:
      Number(
        parts.find((part) => part.type === "product_card")?.settings
          .padding_bottom,
      ) || undefined,
    paddingLeft:
      Number(
        parts.find((part) => part.type === "product_card")?.settings
          .padding_left,
      ) || undefined,
    paddingRight:
      Number(
        parts.find((part) => part.type === "product_card")?.settings
          .padding_right,
      ) || undefined,
    rowGap:
      Number(
        parts.find((part) => part.type === "product_card")?.settings
          .vertical_gap,
      ) || undefined,
  };
  const mediaStyle = {
    ...dimensions(media?.settings || {}),
    border:
      media?.settings.border_style === "solid"
        ? "1px solid var(--marketplace-border)"
        : undefined,
    borderRadius: Number(media?.settings.corner_radius) || undefined,
  };
  const titleStyle = {
    ...dimensions(title?.settings || {}),
    color: themeColor(title?.settings.text_color, "text"),
    backgroundColor: themeSettingEnabled(title?.settings.background_enabled)
      ? themeColor(title?.settings.background_color, "background")
      : undefined,
    width: title?.settings.width === "fit" ? "fit-content" : "100%",
    maxWidth:
      (
        {
          narrow: "36rem",
          normal: "48rem",
          wide: "64rem",
          full: "none",
        } as Record<string, string>
      )[String(title?.settings.max_width)] || undefined,
    textAlign:
      title?.settings.alignment === "center" ||
      title?.settings.alignment === "right"
        ? title.settings.alignment
        : "left",
  } as const;
  const priceStyle = {
    ...dimensions(price?.settings || {}),
    color: themeColor(price?.settings.text_color, "text"),
    width: price?.settings.width === "fit" ? "fit-content" : "100%",
    textAlign:
      price?.settings.alignment === "center" ||
      price?.settings.alignment === "right"
        ? price.settings.alignment
        : "left",
  } as const;
  const cardMotion =
    transition === "slide"
      ? "transition-transform duration-300 hover:-translate-y-1"
      : transition === "fade"
        ? "transition-opacity duration-300 hover:opacity-80"
        : "";

  return (
    <article
      data-theme-product-card
      className={`group flex min-w-0 flex-col ${cardMotion}`}
      style={cardStyle}
    >
      {media && (
        <div data-theme-product-part="media" className="group relative">
          <Link
            href={href}
            className={`relative block ${aspect} overflow-hidden bg-marketplace-muted`}
            style={mediaStyle}
          >
            {image ? (
              <ProductImage
                src={image}
                alt={product.name}
                fill
                className="object-cover"
                sizes="(max-width: 767px) 80vw, 25vw"
              />
            ) : null}
            {secondImage ? (
              <ProductImage
                src={secondImage}
                alt=""
                aria-hidden
                fill
                sizes="(max-width: 767px) 80vw, 25vw"
                className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-200 group-hover:opacity-100"
              />
            ) : null}
          </Link>
          {showFavorites ? (
            <div className="absolute right-2 top-2 z-[2]">
              <FavoriteButton
                productId={product.id}
                variantId={product.default_variant_id}
                className="size-9 bg-white/95 opacity-100 transition-opacity duration-150 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 md:focus-visible:opacity-100 motion-reduce:transition-none"
              />
            </div>
          ) : null}
        </div>
      )}
      {title && (
        <h3
          data-theme-product-part="product_title"
          className={`font-medium ${titleSizes[String(title.settings.preset)] || titleSizes.default}`}
          style={titleStyle}
        >
          <Link href={href} className="hover:underline">
            {product.name}
          </Link>
        </h3>
      )}
      <VerifiedHandmadeBadge
        product={product}
        standardsHref={`${basePath}/handmade-standards`}
      />
      {showVendor && (product.seller?.name || product.seller_name) ? (
        product.seller?.slug || product.seller_slug ? (
          <Link
            href={`${basePath}/sellers/${product.seller?.slug || product.seller_slug}`}
            className="relative z-[1] line-clamp-1 text-xs text-marketplace-muted-foreground hover:text-marketplace-brand hover:underline"
          >
            {product.seller?.name || product.seller_name}
          </Link>
        ) : (
          <p className="line-clamp-1 text-xs text-marketplace-muted-foreground">
            {product.seller?.name || product.seller_name}
          </p>
        )
      ) : null}
      {price && (
        <div
          data-theme-product-part="price"
          className={`flex items-baseline gap-2 font-semibold ${priceSizes[String(price.settings.preset)] || priceSizes.default}`}
          style={priceStyle}
        >
          {!themeSettingEnabled(price.settings.show_sale_first, true) &&
          compareAtPrice &&
          compareAtPrice !== displayPrice ? (
            <span className="text-xs font-normal text-marketplace-muted-foreground line-through">
              {compareAtPrice}
            </span>
          ) : null}
          <span>{displayPrice}</span>
          {themeSettingEnabled(price.settings.show_sale_first, true) &&
          compareAtPrice &&
          compareAtPrice !== displayPrice ? (
            <span className="text-xs font-normal text-marketplace-muted-foreground line-through">
              {compareAtPrice}
            </span>
          ) : null}
        </div>
      )}
      {themeSettingEnabled(price?.settings.installments) ? (
        <p
          data-theme-product-part="price-installments"
          className="text-xs text-marketplace-muted-foreground"
        >
          {t("installmentOptionsAtCheckout")}
        </p>
      ) : null}
      {themeSettingEnabled(price?.settings.tax_information) ? (
        <p
          data-theme-product-part="price-tax-information"
          className="text-xs text-marketplace-muted-foreground"
        >
          {t("taxesCalculatedAtCheckout")}
        </p>
      ) : null}
      {reviews && reviewProduct.average_rating != null ? (
        <p
          data-theme-product-part="review_stars"
          className="text-xs text-marketplace-muted-foreground"
        >
          <span
            role="img"
            aria-label={`${reviewProduct.average_rating} out of 5 stars`}
            className="text-amber-500"
          >
            {"★".repeat(
              Math.max(
                0,
                Math.min(5, Math.round(reviewProduct.average_rating)),
              ),
            )}
          </span>
          {themeSettingEnabled(reviews.settings.show_count, true)
            ? ` ${reviewProduct.average_rating.toFixed(1)} (${reviewProduct.reviews_count ?? 0})`
            : ` ${reviewProduct.average_rating.toFixed(1)}`}
        </p>
      ) : null}
      {sku ? (
        <p
          data-theme-product-part="sku"
          className="text-xs text-marketplace-muted-foreground"
        >
          {sku.settings.label ? `${String(sku.settings.label)} ` : "SKU "}
          {product.default_variant?.sku || product.variants?.[0]?.sku || ""}
        </p>
      ) : null}
      {displayedSwatches.length > 0 ? (
        <div data-theme-product-part="swatches">
          <ProductCardSwatches
            options={displayedSwatches.slice(0, 6)}
            total={displayedSwatches.length}
            style={String(swatchSettings?.color_style || "color")}
            size={String(swatchSettings?.size || "medium")}
            label={String(
              swatches?.settings.label || "Available color options",
            )}
          />
        </div>
      ) : null}
      {showQuickAdd && product.purchasable && (
        <div
          data-theme-product-part="buy_buttons"
          className={mobileOnlyQuickAdd ? "md:hidden" : ""}
        >
          <FeaturedCollectionQuickAdd variantId={product.default_variant_id} />
        </div>
      )}
    </article>
  );
}
