"use client";

import type { Media, Product, Variant } from "@spree/sdk";
import {
  Calendar,
  Loader2,
  MapPin,
  Package,
  Plus,
  Share2,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { QuantityPickerField } from "@/components/cart/QuantityPickerField";
import { Check, ChevronDown } from "@/components/icons";
import { RegionPreferences } from "@/components/layout/RegionPreferences";
import { FavoriteButton } from "@/components/products/FavoriteButton";
import { HiddenPricePrompt } from "@/components/products/HiddenPricePrompt";
import { MadeTogetherBuyBox } from "@/components/products/MadeTogetherBuyBox";
import { MadeTogetherCollective } from "@/components/products/MadeTogetherCollective";
import { MakeOfferButton } from "@/components/products/MakeOfferButton";
import { MediaGallery } from "@/components/products/MediaGallery";
import {
  MerchandisingBadges,
  type MerchandisingSignal,
} from "@/components/products/MerchandisingBadges";
import { MerchandisingReason } from "@/components/products/MerchandisingReason";
import { PersonalizationProofNotice } from "@/components/products/PersonalizationProofNotice";
import {
  type BundleOffer,
  ProductBundleOffer,
} from "@/components/products/ProductBundleOffer";
import { ProductCustomFields } from "@/components/products/ProductCustomFields";
import { ProductMobileStickyPurchaseBar } from "@/components/products/ProductMobileStickyPurchaseBar";
import {
  type OrderMinimumDeal,
  ProductOrderMinimumDeal,
} from "@/components/products/ProductOrderMinimumDeal";
import { ProductPersonalizationForm } from "@/components/products/ProductPersonalizationForm";
import { ProductShippingCost } from "@/components/products/ProductShippingCost";
import { ReportListingButton } from "@/components/products/ReportListingButton";
import { useProductStickyPurchaseBar } from "@/components/products/useProductStickyPurchaseBar";
import { VariantPicker } from "@/components/products/VariantPicker";
import { StarRatingDisplay } from "@/components/reviews/StarRating";
import { StarSellerAvatar } from "@/components/shops/StarSellerAvatar";
import { ProductPageBlocksProvider } from "@/components/theme/resource/ProductPageBlocks";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useHiddenPricing } from "@/contexts/HiddenPricingContext";
import { useStore } from "@/contexts/StoreContext";
import { useStoreThemeSettings } from "@/contexts/ThemeSettingsContext";
import { trackAddToCart, trackViewItem } from "@/lib/analytics/gtm";
import type { CartDiscoveryInput } from "@/lib/discovery-context";
import type { MadeTogetherPresentation } from "@/lib/made-together/types";
import { selectPdpSignals } from "@/lib/merchandising/presentation";
import {
  buildPersonalizationPayload,
  mapServerPersonalizationErrors,
  type PersonalizationAnswers,
  type PersonalizationFieldError,
  validatePersonalizationAnswers,
} from "@/lib/personalization";
import { themeSettingEnabled } from "@/lib/theme/setting-value";
import { sellerDisplayName } from "@/lib/utils/seller-display";

function formatCompactCount(count: number, locale: string): string {
  if (count < 1000) return count.toLocaleString(locale);
  return new Intl.NumberFormat(locale, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(count);
}

interface ProductDetailsProps {
  product: Product;
  basePath: string;
  cartDiscovery?: CartDiscoveryInput;
  fixedQuantity?: boolean;
  appearance?: Record<string, unknown>;
  globalSettings?: Record<string, string | boolean>;
  productNavigation?: {
    previous?: { name: string; slug: string };
    next?: { name: string; slug: string };
  };
  templateBlocks?: ReactNode[];
  templateDescriptionBlockPresent?: boolean;
  templatePersonalizationBlockPresent?: boolean;
  templateMediaSettings?: Record<string, unknown>;
  templateMediaBlockId?: string;
  madeTogether?: MadeTogetherPresentation | null;
  hasFollowingDiscovery?: boolean;
  /**
   * Classic PDP: server-rendered content under the gallery (reviews).
   * Must be `children` so Next can pass Server Components into this client tree.
   */
  children?: ReactNode;
}

export function ProductDetails({
  product,
  basePath,
  cartDiscovery,
  fixedQuantity = false,
  appearance = {},
  globalSettings = {},
  productNavigation,
  templateBlocks,
  templateDescriptionBlockPresent = false,
  templatePersonalizationBlockPresent = false,
  templateMediaSettings,
  templateMediaBlockId,
  madeTogether = null,
  hasFollowingDiscovery = false,
  children,
}: ProductDetailsProps) {
  const { addItem, updating } = useCart();
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const { currency } = useStore();
  const {
    social,
    product_swatches: swatchSettings,
    size_chart: sizeChartSettings,
  } = useStoreThemeSettings();
  const isClassicLayout = templateBlocks === undefined;
  const galleryStyle =
    appearance.gallery_style === "thumbnails_bottom" ||
    appearance.gallery_style === "bottom"
      ? "bottom"
      : "left";
  const classicGalleryStyle = "bottom" as const;
  const imageRatio =
    appearance.image_ratio === "portrait" ? "portrait" : "square";
  const stickyCart =
    themeSettingEnabled(appearance.sticky_cart) ||
    themeSettingEnabled(globalSettings.sticky_cart);
  const productStatus = (product as Product & { status?: string }).status;
  const locale = useLocale();
  const t = useTranslations("products");
  const tp = useTranslations("personalization");
  const tc = useTranslations("customOrders");
  const tw = useTranslations("wholesale");
  const tCommon = useTranslations("common");
  const hiddenPricing = useHiddenPricing();
  const pricesHidden = hiddenPricing !== null;

  const variants = useMemo(() => {
    return (product.variants || []).filter(Boolean);
  }, [product.variants]);

  const hasVariants = variants.length > 0;
  const optionTypes = product.option_types || [];
  const merchandisingSignals =
    (
      product as Product & {
        merchandising_signals?: MerchandisingSignal[];
      }
    ).merchandising_signals ?? [];
  const bundleOffer =
    (
      product as Product & {
        bundle_offer?: BundleOffer | null;
      }
    ).bundle_offer ?? null;
  const orderMinimumDeal =
    (
      product as Product & {
        order_minimum_deal?: OrderMinimumDeal | null;
      }
    ).order_minimum_deal ?? null;
  const hasSaleMerchandisingSignal = merchandisingSignals.some(
    (signal) => signal.key === "sale",
  );
  const merchandisingProductId =
    product.default_variant?.sku ||
    product.variants?.find((variant) => variant.sku)?.sku ||
    product.slug;
  const personalizationFields = product.personalization_fields ?? [];
  const hasPersonalization = personalizationFields.length > 0;
  const personalizationOptional =
    hasPersonalization &&
    personalizationFields.every((field) => !field.required);
  const showVendor = themeSettingEnabled(appearance.show_vendor, true);
  const seller = product.seller;
  const sellerShopHref = seller?.slug
    ? `${basePath}/sellers/${seller.slug}`
    : null;
  const hasReturnPolicyDisclosure =
    product.accepts_returns != null || product.accepts_exchanges != null;
  const returnsSummaryCompact = (() => {
    if (!hasReturnPolicyDisclosure) return null;
    if (product.accepts_returns && product.accepts_exchanges) {
      return t("returnsAndExchangesAccepted");
    }
    if (product.accepts_returns) return t("returnsAcceptedShort");
    if (product.accepts_exchanges) return t("exchangesAccepted");
    return t("returnsAndExchangesNotAccepted");
  })();
  const estimatedDeliveryRange = useMemo(() => {
    const minimum = product.estimated_delivery_date_min;
    const maximum = product.estimated_delivery_date_max;
    if (!minimum || !maximum) return null;

    const minimumDate = new Date(`${minimum}T12:00:00`);
    const maximumDate = new Date(`${maximum}T12:00:00`);
    if (
      Number.isNaN(minimumDate.getTime()) ||
      Number.isNaN(maximumDate.getTime())
    ) {
      return null;
    }

    if (minimum === maximum) {
      return new Intl.DateTimeFormat(locale, {
        month: "short",
        day: "numeric",
      }).format(minimumDate);
    }

    const sameMonth =
      minimumDate.getFullYear() === maximumDate.getFullYear() &&
      minimumDate.getMonth() === maximumDate.getMonth();
    const sameYear = minimumDate.getFullYear() === maximumDate.getFullYear();

    if (sameMonth) {
      const monthDay = new Intl.DateTimeFormat(locale, {
        month: "short",
        day: "numeric",
      }).format(minimumDate);
      return `${monthDay}–${maximumDate.getDate()}`;
    }

    const startFormatter = new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      ...(sameYear ? {} : { year: "numeric" }),
    });
    const endFormatter = new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      ...(sameYear ? {} : { year: "numeric" }),
    });
    return `${startFormatter.format(minimumDate)}–${endFormatter.format(maximumDate)}`;
  }, [
    locale,
    product.estimated_delivery_date_max,
    product.estimated_delivery_date_min,
  ]);

  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(() => {
    if (product.default_variant) {
      return product.default_variant;
    }
    if (hasVariants) {
      return variants.find((v) => v.purchasable) || variants[0];
    }
    return product.default_variant || null;
  });

  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  // The server-rendered button is clickable before React attaches this handler.
  // Keep it inactive until mount so an early click cannot look successful while doing nothing.
  const [purchaseReady, setPurchaseReady] = useState(false);
  useEffect(() => {
    setPurchaseReady(true);
  }, []);
  const [personalizationOpen, setPersonalizationOpen] = useState(
    () => !personalizationOptional,
  );
  const [personalizationAnswers, setPersonalizationAnswers] =
    useState<PersonalizationAnswers>({});
  const [personalizationErrors, setPersonalizationErrors] = useState<
    PersonalizationFieldError[]
  >([]);

  useEffect(() => {
    trackViewItem(product, currency);
  }, [product, currency]);

  const galleryImages = useMemo((): Media[] => {
    return product.media || [];
  }, [product.media]);

  const variantImageIndex = useMemo((): number | null => {
    if (!selectedVariant) return null;
    const index = galleryImages.findIndex((m) =>
      m.variant_ids.includes(selectedVariant.id),
    );
    return index >= 0 ? index : null;
  }, [selectedVariant, galleryImages]);

  const price = selectedVariant?.price ?? product.price;
  const originalPrice =
    selectedVariant?.original_price ?? product.original_price;
  const displayPrice = price?.display_amount;

  const currentAmountCents = price?.amount_in_cents;
  const originalAmountCents = originalPrice?.amount_in_cents;
  const compareAtAmountCents = price?.compare_at_amount_in_cents;
  const onSale =
    (currentAmountCents != null &&
      originalAmountCents != null &&
      currentAmountCents < originalAmountCents) ||
    (compareAtAmountCents != null &&
      currentAmountCents != null &&
      currentAmountCents < compareAtAmountCents);

  const strikethroughPrice = onSale
    ? ((originalPrice?.display_amount &&
      originalPrice.display_amount !== displayPrice
        ? originalPrice.display_amount
        : price?.display_compare_at_amount) ?? null)
    : null;

  const salePercent = (() => {
    if (!onSale || currentAmountCents == null) return null;
    const baseline =
      originalAmountCents != null && originalAmountCents > currentAmountCents
        ? originalAmountCents
        : compareAtAmountCents != null &&
            compareAtAmountCents > currentAmountCents
          ? compareAtAmountCents
          : null;
    if (baseline == null || baseline <= 0) return null;
    return Math.max(1, Math.round((1 - currentAmountCents / baseline) * 100));
  })();

  const pdpMerchandising = useMemo(() => {
    const usedKeys: string[] = [];
    const pick = (
      zone: "title" | "price" | "availability" | "seller" | "relevance",
      options: { suppressSaleBadge?: boolean } = {},
    ) => {
      const picked = selectPdpSignals({
        signals: merchandisingSignals,
        zone,
        excludeKeys: usedKeys,
        suppressSaleBadge: options.suppressSaleBadge,
      });
      usedKeys.push(...picked.map((signal) => signal.key));
      return picked;
    };
    return {
      title: pick("title"),
      price: pick("price", { suppressSaleBadge: salePercent != null }),
      availability: pick("availability"),
      seller: pick("seller"),
      relevance: pick("relevance"),
    };
  }, [merchandisingSignals, salePercent]);

  // Under-price seller card: shop-wide rating only (never this listing's).
  const sellerRating =
    seller?.average_rating != null && (seller.reviews_count ?? 0) > 0
      ? Number(seller.average_rating)
      : null;
  const sellerReviewCount =
    sellerRating != null ? (seller?.reviews_count ?? 0) : 0;
  const sellerReviewsHref = seller?.slug
    ? `${basePath}/sellers/${seller.slug}?tab=reviews`
    : null;

  const sku = selectedVariant?.sku ?? product.default_variant?.sku;

  const isPurchasable = hasVariants
    ? (selectedVariant?.purchasable ?? false)
    : (product.purchasable ?? false);

  const busy = loading || uploading || updating;

  const addConfiguredItem = async (): Promise<string | null> => {
    const variantId =
      selectedVariant?.id ||
      product.default_variant?.id ||
      product.default_variant_id;
    if (!variantId) return null;

    if (hasPersonalization) {
      const clientErrors = validatePersonalizationAnswers(
        personalizationFields,
        personalizationAnswers,
      );
      if (clientErrors.length > 0) {
        setPersonalizationOpen(true);
        setPersonalizationErrors(clientErrors);
        toast.error(tp("fixErrors"));
        return null;
      }
      setPersonalizationErrors([]);
    }

    const payload = hasPersonalization
      ? buildPersonalizationPayload(
          personalizationFields,
          personalizationAnswers,
        )
      : undefined;

    setLoading(true);
    const result = await addItem(variantId, quantity, payload, cartDiscovery);
    setLoading(false);

    if (!result.success) {
      if (hasPersonalization) {
        const mapped = mapServerPersonalizationErrors(
          personalizationFields,
          result.details as Record<string, unknown> | undefined,
          result.error,
        );
        if (mapped.length > 0) {
          setPersonalizationOpen(true);
          setPersonalizationErrors(mapped);
        }
      }
      toast.error(result.error || tp("addFailed"));
      return null;
    }

    trackAddToCart(product, selectedVariant, quantity, currency);
    return result.cart?.id ?? null;
  };

  const handleAddToCart = async () => {
    await addConfiguredItem();
  };

  const handleBuyNow = async () => {
    const cartId = await addConfiguredItem();
    if (cartId) router.push(`${basePath}/checkout/${cartId}`);
  };

  const shareProduct = () => {
    const url = window.location.href;
    if (navigator.share) {
      void navigator.share({ title: product.name, url }).catch(() => undefined);
    } else if (navigator.clipboard) {
      void navigator.clipboard
        .writeText(url)
        .then(() => toast.success(t("shareProductCopied")));
    }
  };

  const showShareControl =
    themeSettingEnabled(appearance.show_share, true) &&
    themeSettingEnabled(social?.share_products);
  const productReviewCount = product.reviews_count ?? 0;
  const productAverageRating =
    product.average_rating != null ? Number(product.average_rating) : null;
  const showProductReviewLink =
    productReviewCount > 0 &&
    productAverageRating != null &&
    Number.isFinite(productAverageRating);
  const mobileClassicPdp = templateBlocks === undefined;
  const { purchaseRef, showSticky: showMobileStickyPurchase } =
    useProductStickyPurchaseBar(mobileClassicPdp);

  const baseUnitAmount =
    currentAmountCents != null ? currentAmountCents / 100 : null;

  return (
    <div
      data-theme-product-sticky-cart={stickyCart ? "true" : "false"}
      className={`mx-auto w-full px-4 ${hasFollowingDiscovery ? "pb-0" : "pb-28"} pt-0 sm:px-6 sm:pt-8 md:pb-12 lg:px-10 lg:pb-16 ${appearance.layout === "wide" ? "max-w-none" : "max-w-[1400px]"}`}
    >
      {themeSettingEnabled(appearance.product_navigation) &&
      (productNavigation?.previous || productNavigation?.next) ? (
        <nav
          aria-label="Product navigation"
          data-theme-product-navigation
          className="mb-6 flex items-center justify-between gap-4 border-b border-marketplace-border/70 pb-4 text-sm"
        >
          {productNavigation.previous ? (
            <Link
              href={`${basePath}/products/${productNavigation.previous.slug}`}
              rel="prev"
              className="min-w-0 truncate text-marketplace-muted-foreground hover:text-marketplace-foreground"
            >
              ← Previous: {productNavigation.previous.name}
            </Link>
          ) : (
            <span />
          )}
          {productNavigation.next ? (
            <Link
              href={`${basePath}/products/${productNavigation.next.slug}`}
              rel="next"
              className="min-w-0 truncate text-right text-marketplace-muted-foreground hover:text-marketplace-foreground"
            >
              Next: {productNavigation.next.name} →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
      <div
        className="product-theme-grid grid grid-cols-1 items-start"
        style={
          {
            "--product-media-width": `${Math.max(35, Math.min(75, Number(appearance.product_media_width) || (isClassicLayout ? 60 : 62)))}%`,
            "--product-column-gap": `${Math.max(0, Number(appearance.product_desktop_spacing) || (isClassicLayout ? 40 : 24))}px`,
            "--product-mobile-gap": `${Math.max(0, Number(appearance.product_mobile_spacing) || 16)}px`,
          } as CSSProperties
        }
      >
        {(templateBlocks === undefined ||
          templateMediaSettings !== undefined) && (
          <div className="min-w-0 space-y-4 md:space-y-10">
            <div
              className={
                isClassicLayout
                  ? "min-w-0 -mx-4 w-[calc(100%+2rem)] sm:-mx-6 sm:w-[calc(100%+3rem)] md:mx-0 md:w-full"
                  : "min-w-0 lg:sticky lg:top-24 lg:self-start"
              }
              data-theme-product-media-block={
                templateBlocks !== undefined ? "true" : undefined
              }
              data-pdp-mobile-media-frame={isClassicLayout ? "true" : undefined}
              data-theme-block-id={templateMediaBlockId}
              data-theme-block-type={templateMediaBlockId ? "media" : undefined}
              style={{
                border:
                  templateMediaSettings?.border_style === "solid"
                    ? "1px solid var(--marketplace-border)"
                    : undefined,
                backgroundColor:
                  appearance.media_background === "default"
                    ? "var(--marketplace-surface-subtle)"
                    : typeof appearance.media_background === "string" &&
                        /^#[0-9a-fA-F]{6}$/.test(appearance.media_background)
                      ? appearance.media_background
                      : undefined,
                borderRadius:
                  typeof appearance.media_radius === "number"
                    ? `${appearance.media_radius}px`
                    : typeof templateMediaSettings?.corner_radius === "number"
                      ? `${templateMediaSettings.corner_radius}px`
                      : undefined,
                paddingTop:
                  typeof templateMediaSettings?.padding_top === "number"
                    ? templateMediaSettings.padding_top
                    : undefined,
                paddingBottom:
                  typeof templateMediaSettings?.padding_bottom === "number"
                    ? templateMediaSettings.padding_bottom
                    : undefined,
                paddingLeft:
                  typeof templateMediaSettings?.padding_left === "number"
                    ? templateMediaSettings.padding_left
                    : undefined,
                paddingRight:
                  typeof templateMediaSettings?.padding_right === "number"
                    ? templateMediaSettings.padding_right
                    : undefined,
              }}
            >
              <MediaGallery
                images={galleryImages}
                productName={product.name}
                productId={product.id}
                variantId={selectedVariant?.id}
                activeIndex={
                  themeSettingEnabled(globalSettings.show_variant_gallery, true)
                    ? variantImageIndex
                    : undefined
                }
                thumbnailPosition={
                  isClassicLayout ? classicGalleryStyle : galleryStyle
                }
                imageRatio={
                  templateMediaSettings?.aspect_ratio === "portrait"
                    ? "portrait"
                    : templateMediaSettings?.aspect_ratio === "square"
                      ? "square"
                      : imageRatio
                }
                edgeToEdgeMobile={isClassicLayout}
                showShare={showShareControl}
                onShare={shareProduct}
                overlayTopLeft={
                  isClassicLayout ? (
                    <MerchandisingBadges
                      signals={pdpMerchandising.title}
                      maxBadges={1}
                      layout="pdp-title"
                      signalDataAttribute="data-merchandising-pdp-signal"
                    />
                  ) : null
                }
                collageLayout={isClassicLayout}
              />
            </div>
            <div className="hidden justify-end px-0 md:flex md:px-0">
              <ReportListingButton productId={product.id} />
            </div>
          </div>
        )}

        <div
          className={`mx-auto w-full min-w-0 max-w-xl lg:ml-0 lg:max-w-none lg:pt-0 ${isClassicLayout ? "lg:col-start-2 lg:row-start-1 lg:row-span-2" : ""}`}
          data-theme-product-sticky-info={
            isClassicLayout || themeSettingEnabled(appearance.sticky_info)
              ? "true"
              : "false"
          }
        >
          {templateBlocks !== undefined ? (
            <ProductPageBlocksProvider
              product={product}
              value={{
                selectedVariant,
                setSelectedVariant,
                quantity,
                setQuantity,
                personalizationFields,
                personalizationAnswers,
                setPersonalizationAnswers,
                personalizationErrors,
                personalizationBusy: busy,
                personalizationUploading: setUploading,
                displayPrice,
                currency,
                baseUnitAmount,
                onAddToCart: handleAddToCart,
                basePath,
                fixedQuantity,
                madeTogether,
              }}
            >
              <div data-theme-product-block-layout className="space-y-5">
                {templateBlocks}
              </div>
              {hasPersonalization && !templatePersonalizationBlockPresent ? (
                <ProductPersonalizationForm
                  fields={personalizationFields}
                  answers={personalizationAnswers}
                  onChange={setPersonalizationAnswers}
                  errors={personalizationErrors}
                  disabled={busy}
                  baseDisplayPrice={displayPrice}
                  currency={currency}
                  baseUnitAmount={baseUnitAmount}
                  uploadingChange={setUploading}
                />
              ) : null}
              {sizeChartSettings &&
              themeSettingEnabled(sizeChartSettings.enabled) &&
              themeSettingEnabled(globalSettings.show_size_chart, true) &&
              optionTypes.some(
                (option) =>
                  option.label.toLowerCase() ===
                  String(sizeChartSettings.option_name || "size").toLowerCase(),
              ) ? (
                <details className="rounded-lg border border-gray-200 p-4">
                  <summary className="cursor-pointer font-medium">
                    {String(sizeChartSettings.title || "Size chart")}
                  </summary>
                  {sizeChartSettings.image_url ? (
                    <img
                      src={String(sizeChartSettings.image_url)}
                      alt={String(sizeChartSettings.title || "Size chart")}
                      className="mt-3 max-h-96 w-auto"
                    />
                  ) : null}
                  {sizeChartSettings.content ? (
                    <p className="mt-3 whitespace-pre-line text-sm text-gray-600">
                      {String(sizeChartSettings.content)}
                    </p>
                  ) : null}
                </details>
              ) : null}
              {!templateDescriptionBlockPresent && product.description_html ? (
                <div className="border-t pt-6">
                  <h2 className="mb-4 text-lg font-medium text-gray-900">
                    {t("description")}
                  </h2>
                  <div
                    className="prose prose-sm max-w-none text-gray-600"
                    dangerouslySetInnerHTML={{
                      __html: product.description_html,
                    }}
                  />
                </div>
              ) : null}
              {!templateDescriptionBlockPresent ? (
                <ProductCustomFields customFields={product.custom_fields} />
              ) : null}
              {!templateDescriptionBlockPresent &&
              (sku || selectedVariant?.options_text) ? (
                <div className="border-t pt-6">
                  <h2 className="mb-4 text-lg font-medium text-gray-900">
                    {t("details")}
                  </h2>
                  <dl className="space-y-3">
                    {sku ? (
                      <div className="flex">
                        <dt className="w-32 text-sm text-gray-500">
                          {t("sku")}
                        </dt>
                        <dd className="text-sm text-gray-900">{sku}</dd>
                      </div>
                    ) : null}
                    {selectedVariant?.options_text ? (
                      <div className="flex">
                        <dt className="w-32 text-sm text-gray-500">
                          {t("options")}
                        </dt>
                        <dd className="text-sm text-gray-900">
                          {selectedVariant.options_text}
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                </div>
              ) : null}
              {themeSettingEnabled(appearance.show_share, true) &&
              themeSettingEnabled(social?.share_products) ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-2 text-sm font-medium text-marketplace-brand hover:underline"
                  onClick={() => {
                    const url = window.location.href;
                    if (navigator.share)
                      void navigator
                        .share({ title: product.name, url })
                        .catch(() => undefined);
                    else if (navigator.clipboard)
                      void navigator.clipboard
                        .writeText(url)
                        .then(() => toast.success("Product link copied"));
                  }}
                >
                  <Share2 className="size-4" aria-hidden="true" />
                  Share product
                </button>
              ) : null}
            </ProductPageBlocksProvider>
          ) : (
            <div className="space-y-5 md:space-y-6">
              <div
                className="flex flex-col gap-2.5 md:gap-4"
                data-merchandising-product={merchandisingProductId}
              >
                {pdpMerchandising.availability[0] ? (
                  <p
                    className="text-sm font-normal text-[#a12828] md:hidden"
                    data-merchandising-pdp-signal={
                      pdpMerchandising.availability[0].key
                    }
                  >
                    {pdpMerchandising.availability[0].label}
                  </p>
                ) : null}

                <div className="order-1 space-y-0.5 md:order-2">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    {displayPrice ? (
                      <span className="text-[1.625rem] font-bold leading-none tracking-tight text-[#222] md:text-[28px]">
                        {displayPrice}
                        {hasPersonalization ? "+" : ""}
                      </span>
                    ) : (
                      <HiddenPricePrompt className="inline-flex items-center gap-1.5 text-base font-medium text-slate-600 underline underline-offset-4 hover:text-slate-900" />
                    )}
                    {onSale && strikethroughPrice ? (
                      <span className="text-[15px] text-[#757575] line-through md:text-lg">
                        {strikethroughPrice}
                        {hasPersonalization ? "+" : ""}
                      </span>
                    ) : null}
                  </div>
                  {salePercent != null ? (
                    <p
                      className="text-sm font-normal text-[#258635]"
                      {...(hasSaleMerchandisingSignal
                        ? { "data-merchandising-pdp-signal": "sale" }
                        : {})}
                    >
                      {t("limitedTimeSale", { percent: salePercent })}
                    </p>
                  ) : null}
                  <div className="hidden md:block">
                    <MerchandisingBadges
                      signals={pdpMerchandising.price}
                      maxBadges={1}
                      layout="pdp-detail"
                      signalDataAttribute="data-merchandising-pdp-signal"
                    />
                  </div>
                </div>

                <div className="order-2 md:order-1">
                  <h1 className="min-w-0 text-base font-medium leading-snug text-[#222] md:font-display md:text-[1.65rem] md:font-normal md:leading-[1.2] md:tracking-tight lg:text-[1.85rem]">
                    {product.name}
                  </h1>
                  <div className="mt-1.5 hidden md:block">
                    <MerchandisingBadges
                      signals={pdpMerchandising.title}
                      maxBadges={1}
                      layout="pdp-title"
                      signalDataAttribute="data-merchandising-pdp-signal"
                    />
                  </div>
                  {pdpMerchandising.relevance[0] ? (
                    <div className="mt-1">
                      <MerchandisingReason
                        signals={pdpMerchandising.relevance}
                        followedShopLabel={
                          isAuthenticated ? t("youFollowThisShop") : undefined
                        }
                      />
                    </div>
                  ) : null}
                </div>

                {showVendor && seller && sellerShopHref ? (
                  <>
                    <div className="order-3 flex flex-wrap items-center gap-x-2 gap-y-1 md:hidden">
                      <Link
                        href={sellerShopHref}
                        className="text-sm font-normal text-[#222] hover:underline"
                      >
                        {sellerDisplayName(seller.name)}
                      </Link>
                      {sellerRating != null ? (
                        <StarRatingDisplay
                          rating={sellerRating}
                          size="sm"
                          tone="dark"
                        />
                      ) : showProductReviewLink ? (
                        <a
                          href="#reviews"
                          className="inline-flex items-center gap-1.5 hover:underline"
                        >
                          <StarRatingDisplay
                            rating={productAverageRating}
                            size="sm"
                            tone="dark"
                          />
                        </a>
                      ) : null}
                    </div>
                    {returnsSummaryCompact ? (
                      <p className="order-4 flex items-center gap-1.5 text-sm text-[#222] md:hidden">
                        <Check
                          className="size-4 shrink-0 text-[#258635]"
                          aria-hidden
                        />
                        {returnsSummaryCompact}
                      </p>
                    ) : null}
                    <div className="order-3 hidden md:block">
                      <MadeTogetherBuyBox
                        productId={product.id}
                        basePath={basePath}
                        initial={madeTogether}
                        fallback={
                          <div className="flex items-center gap-3">
                            <StarSellerAvatar
                              seller={{
                                ...seller,
                                name: sellerDisplayName(seller.name),
                              }}
                              href={sellerShopHref}
                              sizeClassName="size-10"
                              imageSizes="40px"
                            />
                            <div className="min-w-0 space-y-1.5">
                              <p className="text-sm leading-snug text-marketplace-muted-foreground">
                                <Link
                                  href={sellerShopHref}
                                  className="font-medium text-marketplace-foreground hover:underline"
                                >
                                  {sellerDisplayName(seller.name)}
                                </Link>
                              </p>
                              {sellerRating != null && sellerReviewsHref ? (
                                <Link
                                  href={sellerReviewsHref}
                                  className="inline-flex text-sm text-marketplace-foreground hover:underline"
                                >
                                  {t("ratingCompact", {
                                    rating: Number.isFinite(sellerRating)
                                      ? sellerRating.toFixed(1)
                                      : String(sellerRating),
                                    count: formatCompactCount(
                                      sellerReviewCount,
                                      locale,
                                    ),
                                  })}
                                </Link>
                              ) : null}
                            </div>
                          </div>
                        }
                      />
                    </div>
                  </>
                ) : null}

                {orderMinimumDeal ? (
                  <ProductOrderMinimumDeal
                    deal={orderMinimumDeal}
                    shopHref={sellerShopHref}
                  />
                ) : null}
              </div>

              {hasVariants && optionTypes.length > 0 ? (
                <VariantPicker
                  variants={variants}
                  optionTypes={optionTypes}
                  selectedVariant={selectedVariant}
                  onVariantChange={setSelectedVariant}
                  preferDropdown
                  swatchSettings={{
                    ...swatchSettings,
                    enabled:
                      themeSettingEnabled(swatchSettings?.enabled) &&
                      themeSettingEnabled(globalSettings.show_swatches, true),
                  }}
                />
              ) : null}

              {sizeChartSettings &&
              themeSettingEnabled(sizeChartSettings.enabled) &&
              themeSettingEnabled(globalSettings.show_size_chart, true) &&
              optionTypes.some(
                (option) =>
                  option.label.toLowerCase() ===
                  String(sizeChartSettings.option_name || "size").toLowerCase(),
              ) ? (
                <details className="rounded-lg border border-[#d3d3d3] px-3 py-2.5">
                  <summary className="cursor-pointer text-sm font-semibold text-[#222]">
                    {String(sizeChartSettings.title || "Size chart")}
                  </summary>
                  {sizeChartSettings.image_url ? (
                    <img
                      src={String(sizeChartSettings.image_url)}
                      alt={String(sizeChartSettings.title || "Size chart")}
                      className="mt-3 max-h-96 w-auto"
                    />
                  ) : null}
                  {sizeChartSettings.content ? (
                    <p className="mt-3 whitespace-pre-line text-sm text-[#595959]">
                      {String(sizeChartSettings.content)}
                    </p>
                  ) : null}
                </details>
              ) : null}

              {hasPersonalization ? (
                <div className="space-y-3">
                  {product.proof_required && !personalizationOptional ? (
                    <PersonalizationProofNotice />
                  ) : null}
                  {personalizationOptional ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setPersonalizationOpen((open) => !open)}
                        className="inline-flex min-h-11 items-center gap-1.5 text-sm font-normal text-[#222] hover:underline md:text-[15px] md:font-semibold"
                        aria-expanded={personalizationOpen}
                      >
                        <Plus className="size-4" aria-hidden />
                        {personalizationOpen
                          ? t("hidePersonalizationOptionalLabel")
                          : t("addPersonalizationOptionalLabel")}
                      </button>
                      {personalizationOpen ? (
                        <>
                          {product.proof_required ? (
                            <PersonalizationProofNotice />
                          ) : null}
                          <ProductPersonalizationForm
                            fields={personalizationFields}
                            answers={personalizationAnswers}
                            onChange={setPersonalizationAnswers}
                            errors={personalizationErrors}
                            disabled={busy}
                            baseDisplayPrice={displayPrice}
                            currency={currency}
                            baseUnitAmount={baseUnitAmount}
                            uploadingChange={setUploading}
                            compact
                          />
                        </>
                      ) : null}
                    </>
                  ) : (
                    <ProductPersonalizationForm
                      fields={personalizationFields}
                      answers={personalizationAnswers}
                      onChange={setPersonalizationAnswers}
                      errors={personalizationErrors}
                      disabled={busy}
                      baseDisplayPrice={displayPrice}
                      currency={currency}
                      baseUnitAmount={baseUnitAmount}
                      uploadingChange={setUploading}
                      compact
                    />
                  )}
                </div>
              ) : null}

              <ul className="hidden space-y-2.5 border-t border-marketplace-border-subtle pt-5 text-sm leading-relaxed text-marketplace-foreground md:block">
                <li className="flex items-start gap-2.5">
                  <Check
                    className="mt-0.5 size-4 shrink-0 text-marketplace-brand-accent"
                    aria-hidden
                  />
                  <span>
                    {estimatedDeliveryRange
                      ? t.rich("arrivesSoon", {
                          range: estimatedDeliveryRange,
                          date: (chunks) => (
                            <span className="font-semibold underline decoration-dashed decoration-[#222]/40 underline-offset-[3px]">
                              {chunks}
                            </span>
                          ),
                        })
                      : t("deliveryBody")}
                  </span>
                </li>
                {returnsSummaryCompact ? (
                  <li className="flex items-start gap-2.5">
                    <Check
                      className="mt-0.5 size-4 shrink-0 text-marketplace-brand-accent"
                      aria-hidden
                    />
                    <span>{returnsSummaryCompact}</span>
                  </li>
                ) : null}
                {product.ships_from ? (
                  <li className="flex items-start gap-2.5">
                    <Check
                      className="mt-0.5 size-4 shrink-0 text-marketplace-brand-accent"
                      aria-hidden
                    />
                    <span>
                      {t.rich("shipsFromLabel", {
                        location: product.ships_from,
                        place: (chunks) => (
                          <span className="font-semibold">{chunks}</span>
                        ),
                      })}
                    </span>
                  </li>
                ) : null}
              </ul>

              <div
                ref={purchaseRef}
                data-theme-product-purchase
                className="flex flex-col gap-3 pt-1"
              >
                <div className="hidden md:block">
                  <MerchandisingBadges
                    signals={pdpMerchandising.availability}
                    maxBadges={1}
                    layout="pdp-detail"
                    signalDataAttribute="data-merchandising-pdp-signal"
                  />
                </div>
                {pricesHidden ? (
                  <Button asChild size="lg">
                    <Link href={hiddenPricing.signInHref}>
                      {tw("hiddenPrice.signInToOrder")}
                    </Link>
                  </Button>
                ) : (
                  <>
                    {!fixedQuantity ? (
                      <div className="hidden space-y-1.5 md:block">
                        <span className="text-sm font-medium text-marketplace-foreground">
                          {tCommon("quantity")}
                        </span>
                        <QuantityPickerField
                          quantity={quantity}
                          onQuantityChange={setQuantity}
                          variant="dropdown"
                          disabled={!purchaseReady || busy || !isPurchasable}
                          className="pdp-reference-select"
                        />
                      </div>
                    ) : null}
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      onClick={() => void handleBuyNow()}
                      disabled={!purchaseReady || busy || !isPurchasable}
                      className="hidden h-12 w-full rounded-full border-[2px] border-[#222] bg-white text-[16px] font-semibold text-[#222] hover:bg-[#f5f5f5] md:inline-flex"
                    >
                      {t("buyItNow")}
                    </Button>
                    <Button
                      type="button"
                      size="lg"
                      onClick={() => void handleAddToCart()}
                      disabled={!purchaseReady || busy || !isPurchasable}
                      className="h-12 w-full rounded-full border-transparent bg-[#222] text-[16px] font-semibold text-white hover:bg-black"
                    >
                      {busy ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          {uploading ? tp("uploading") : t("adding")}
                        </>
                      ) : isPurchasable ? (
                        t("addToCart")
                      ) : (
                        t("outOfStock")
                      )}
                    </Button>
                    <div className="hidden flex-col gap-2 md:flex">
                      <MakeOfferButton
                        variantId={
                          selectedVariant?.id || product.default_variant_id
                        }
                        available={
                          product.buyer_offers_available && isPurchasable
                        }
                        basePath={basePath}
                        currency={currency}
                      />
                      <FavoriteButton
                        productId={product.id}
                        variantId={selectedVariant?.id}
                        layout="collection"
                      />
                    </div>
                  </>
                )}
                {bundleOffer ? (
                  <ProductBundleOffer
                    offer={bundleOffer}
                    currentProductId={product.id}
                    basePath={basePath}
                  />
                ) : null}
              </div>

              <div className="space-y-0 border-t border-[#e1e3df]">
                <details className="group border-b border-[#e1e3df] py-4">
                  <summary className="cursor-pointer list-none text-[16px] font-semibold text-[#222] marker:hidden [&::-webkit-details-marker]:hidden">
                    <span className="flex items-center justify-between gap-3">
                      {t("itemDetails")}
                      <ChevronDown
                        aria-hidden
                        className="size-5 shrink-0 text-[#222] transition-transform group-open:rotate-180"
                      />
                    </span>
                  </summary>
                  <div className="mt-4 space-y-4">
                    {product.custom_fields?.length ? (
                      <ProductCustomFields
                        customFields={product.custom_fields}
                      />
                    ) : null}
                    {sku || selectedVariant?.options_text ? (
                      <dl className="space-y-2 text-sm">
                        {selectedVariant?.options_text ? (
                          <div className="flex gap-4">
                            <dt className="w-24 shrink-0 text-[#595959]">
                              {t("options")}
                            </dt>
                            <dd className="text-[#222]">
                              {selectedVariant.options_text}
                            </dd>
                          </div>
                        ) : null}
                        {sku ? (
                          <div className="flex gap-4">
                            <dt className="w-24 shrink-0 text-[#595959]">
                              {t("sku")}
                            </dt>
                            <dd className="text-[#222]">{sku}</dd>
                          </div>
                        ) : null}
                      </dl>
                    ) : null}
                    {product.description_html ? (
                      <div
                        className="prose prose-sm max-w-none leading-6 text-[#595959] prose-headings:font-display prose-headings:font-medium prose-headings:text-[#222] prose-a:text-[#3B67D4]"
                        dangerouslySetInnerHTML={{
                          __html: product.description_html,
                        }}
                      />
                    ) : null}
                  </div>
                </details>

                <details className="group border-b border-[#e1e3df] py-4">
                  <summary className="cursor-pointer list-none text-[16px] font-semibold text-[#222] marker:hidden [&::-webkit-details-marker]:hidden">
                    <span className="flex items-center justify-between gap-3">
                      {t("shippingAndReturnPolicies")}
                      <ChevronDown
                        aria-hidden
                        className="size-5 shrink-0 text-[#222] transition-transform group-open:rotate-180"
                      />
                    </span>
                  </summary>
                  <div className="mt-4 space-y-3.5 text-[15px] leading-snug text-[#222]">
                    <div className="flex items-start gap-3">
                      <Calendar
                        className="mt-0.5 size-[18px] shrink-0 text-[#222]"
                        aria-hidden
                      />
                      <p>
                        {estimatedDeliveryRange
                          ? t.rich("orderTodayGetBy", {
                              range: estimatedDeliveryRange,
                              date: (chunks) => (
                                <span className="font-semibold underline decoration-dashed decoration-[#222]/40 underline-offset-[3px]">
                                  {chunks}
                                </span>
                              ),
                            })
                          : t("deliveryBody")}
                      </p>
                    </div>
                    {hasReturnPolicyDisclosure ? (
                      <div className="flex items-start gap-3">
                        <Package
                          className="mt-0.5 size-[18px] shrink-0 text-[#222]"
                          aria-hidden
                        />
                        <p>
                          {product.accepts_returns || product.accepts_exchanges
                            ? t.rich("returnsAcceptedWithin", {
                                days: product.return_window_days ?? 30,
                                policy: (chunks) => (
                                  <span className="font-semibold underline decoration-dashed decoration-[#222]/40 underline-offset-[3px]">
                                    {chunks}
                                  </span>
                                ),
                              })
                            : t("returnsAndExchangesNotAccepted")}
                        </p>
                      </div>
                    ) : null}
                    <div className="flex items-start gap-3">
                      <Truck
                        className="mt-0.5 size-[18px] shrink-0 text-[#222]"
                        aria-hidden
                      />
                      <ProductShippingCost
                        productId={product.id}
                        variantId={selectedVariant?.id}
                        fallbackCost={product.shipping_cost}
                        fallbackFree={Boolean(product.free_shipping)}
                      />
                    </div>
                    {product.ships_from ? (
                      <div className="flex items-start gap-3">
                        <MapPin
                          className="mt-0.5 size-[18px] shrink-0 text-[#222]"
                          aria-hidden
                        />
                        <p>
                          {t.rich("shipsFromLabel", {
                            location: product.ships_from,
                            place: (chunks) => (
                              <span className="font-semibold">{chunks}</span>
                            ),
                          })}
                        </p>
                      </div>
                    ) : null}
                    <div className="pt-1">
                      <RegionPreferences variant="deliver" />
                    </div>
                  </div>
                </details>

                {madeTogether ? (
                  <MadeTogetherCollective presentation={madeTogether} />
                ) : null}
              </div>

              {product.seller?.accepts_custom_orders &&
              product.seller_id &&
              productStatus !== "private" &&
              (product.custom_order_seller_note ||
                (product.custom_order_processing_weeks_min &&
                  product.custom_order_processing_weeks_max)) ? (
                <div className="space-y-2 border-t border-marketplace-border/70 pt-4 text-sm text-marketplace-muted-foreground">
                  {product.custom_order_seller_note ? (
                    <p className="whitespace-pre-wrap">
                      {product.custom_order_seller_note}
                    </p>
                  ) : null}
                  {product.custom_order_processing_weeks_min &&
                  product.custom_order_processing_weeks_max ? (
                    <p>
                      {tc("processingTime", {
                        min: product.custom_order_processing_weeks_min,
                        max: product.custom_order_processing_weeks_max,
                      })}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}
        </div>
        {isClassicLayout && children ? (
          <div
            data-classic-below-media="true"
            className="min-w-0 -mx-4 w-[calc(100%+2rem)] sm:-mx-6 sm:w-[calc(100%+3rem)] md:mx-0 md:w-full lg:col-start-1 lg:row-start-2"
          >
            {children}
          </div>
        ) : null}
      </div>
      {templateBlocks === undefined && product.categories?.length ? (
        <nav
          aria-label="Related categories"
          className="mt-8 border-t border-marketplace-border/70 pt-6"
        >
          <ul className="flex flex-wrap gap-2">
            {product.categories.map((category) => (
              <li key={category.id}>
                <Link
                  href={`${basePath}/c/${category.permalink}`}
                  className="inline-flex min-h-9 items-center rounded-md border border-marketplace-border bg-marketplace-surface px-3 text-xs font-medium text-marketplace-foreground transition-colors hover:border-marketplace-brand hover:text-marketplace-brand"
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
      {mobileClassicPdp ? (
        <ProductMobileStickyPurchaseBar
          visible={showMobileStickyPurchase && !pricesHidden}
          displayPrice={displayPrice}
          busy={busy}
          isPurchasable={isPurchasable}
          purchaseReady={purchaseReady}
          onAddToCart={() => void handleAddToCart()}
        />
      ) : null}
    </div>
  );
}
