"use client";

import type { Product, ProductPersonalizationField, Variant } from "@spree/sdk";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { createContext, useContext, useEffect, useState } from "react";
import { toast } from "sonner";
import { QuantityPickerField } from "@/components/cart/QuantityPickerField";
import { FavoriteButton } from "@/components/products/FavoriteButton";
import { HiddenPricePrompt } from "@/components/products/HiddenPricePrompt";
import { MadeTogetherBuyBox } from "@/components/products/MadeTogetherBuyBox";
import { MakeOfferButton } from "@/components/products/MakeOfferButton";
import { MediaGallery } from "@/components/products/MediaGallery";
import { PersonalizationProofNotice } from "@/components/products/PersonalizationProofNotice";
import {
  type BundleOffer,
  ProductBundleOffer,
} from "@/components/products/ProductBundleOffer";
import { ProductPersonalizationForm } from "@/components/products/ProductPersonalizationForm";
import { ProductPurchaseDeliveryPanel } from "@/components/products/ProductPurchaseDeliveryPanel";
import { ProductSellerIdentity } from "@/components/products/ProductSellerIdentity";
import { VariantPicker } from "@/components/products/VariantPicker";
import { StarRatingDisplay } from "@/components/reviews/StarRating";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useHiddenPricing } from "@/contexts/HiddenPricingContext";
import { useStore } from "@/contexts/StoreContext";
import { useStoreThemeSettings } from "@/contexts/ThemeSettingsContext";
import { trackAddToCart } from "@/lib/analytics/gtm";
import type { CartDiscoveryInput } from "@/lib/discovery-context";
import type { MadeTogetherPresentation } from "@/lib/made-together/types";
import {
  buildPersonalizationPayload,
  type PersonalizationAnswers,
  type PersonalizationFieldError,
} from "@/lib/personalization";
import { themeSettingEnabled } from "@/lib/theme/setting-value";

type ProductBlockContextValue = {
  selectedVariant: Variant | null;
  setSelectedVariant: (variant: Variant | null) => void;
  quantity?: number;
  setQuantity?: (quantity: number) => void;
  personalizationFields?: ProductPersonalizationField[];
  personalizationAnswers?: PersonalizationAnswers;
  setPersonalizationAnswers?: (answers: PersonalizationAnswers) => void;
  personalizationErrors?: PersonalizationFieldError[];
  personalizationBusy?: boolean;
  personalizationUploading?: (uploading: boolean) => void;
  displayPrice?: string | null;
  currency?: string;
  baseUnitAmount?: number | null;
  onAddToCart?: () => Promise<void>;
  basePath?: string;
  fixedQuantity?: boolean;
  madeTogether?: MadeTogetherPresentation | null;
};

const ProductBlockVariantContext = createContext<ProductBlockContextValue>({
  selectedVariant: null,
  setSelectedVariant: () => undefined,
});

export function ProductPageBlocksProvider({
  product,
  children,
  value,
}: {
  product: Product;
  children: React.ReactNode;
  value?: Partial<ProductBlockContextValue>;
}) {
  const [internalVariant, setInternalVariant] = useState<Variant | null>(
    product.default_variant || product.variants?.[0] || null,
  );
  const contextValue: ProductBlockContextValue = {
    selectedVariant: value?.selectedVariant ?? internalVariant,
    setSelectedVariant: value?.setSelectedVariant ?? setInternalVariant,
    ...value,
  };
  return (
    <ProductBlockVariantContext.Provider value={contextValue}>
      {children}
    </ProductBlockVariantContext.Provider>
  );
}

export function ProductPageBlock({
  type,
  product,
  settings,
  cartDiscovery,
  basePath = "",
}: {
  type: string;
  product: Product;
  settings: Record<string, unknown>;
  cartDiscovery?: CartDiscoveryInput;
  basePath?: string;
}) {
  const blockContext = useContext(ProductBlockVariantContext);
  const { selectedVariant } = blockContext;
  const t = useTranslations("products");
  const tw = useTranslations("wholesale");
  const tc = useTranslations("customOrders");
  const hiddenPricing = useHiddenPricing();
  const componentType: Record<string, string> = {
    product_title: "product_title",
    product_price: "price",
    product_rating: "review_stars",
    product_variants: "swatches",
    product_buy_buttons: "buy_buttons",
  };
  type = componentType[type] || type;
  if (type === "product_seller")
    return product.seller ? (
      <MadeTogetherBuyBox
        productId={product.id}
        basePath={basePath}
        initial={blockContext.madeTogether ?? null}
        fallback={
          <ProductSellerIdentity
            seller={product.seller}
            basePath={basePath}
            showLogo={false}
            showRating={themeSettingEnabled(settings.show_rating, true)}
            showVisitShop={false}
            productId={product.id}
            productName={product.name}
            messagingAvailable={product.messaging_available}
          />
        }
      />
    ) : null;
  if (type === "product_inventory")
    return (selectedVariant?.in_stock ?? product.in_stock) ? (
      <p className="text-sm text-marketplace-muted-foreground">
        {t("inStock")}
      </p>
    ) : (selectedVariant?.backorderable ?? product.backorderable) ? (
      <p className="text-sm text-marketplace-muted-foreground">
        {tw("backorder")}
      </p>
    ) : (
      <p className="text-sm text-marketplace-muted-foreground">
        {t("outOfStock")}
      </p>
    );
  if (type === "product_favorite")
    return (
      <FavoriteButton productId={product.id} variantId={selectedVariant?.id} />
    );
  if (type === "product_quantity")
    return blockContext.setQuantity && !blockContext.fixedQuantity ? (
      <QuantityPickerField
        quantity={blockContext.quantity ?? 1}
        onQuantityChange={blockContext.setQuantity}
        size="lg"
        variant="dropdown"
      />
    ) : null;
  if (type === "product_personalization")
    return blockContext.personalizationFields?.length &&
      blockContext.setPersonalizationAnswers &&
      !hiddenPricing ? (
      <ProductPersonalizationForm
        fields={blockContext.personalizationFields}
        answers={blockContext.personalizationAnswers ?? {}}
        onChange={blockContext.setPersonalizationAnswers}
        errors={blockContext.personalizationErrors}
        disabled={blockContext.personalizationBusy}
        baseDisplayPrice={blockContext.displayPrice}
        currency={blockContext.currency}
        baseUnitAmount={blockContext.baseUnitAmount}
        uploadingChange={blockContext.personalizationUploading}
      />
    ) : null;
  if (type === "product_proof")
    return product.proof_required ? <PersonalizationProofNotice /> : null;
  if (type === "product_custom_order")
    return product.seller?.accepts_custom_orders &&
      product.seller_id &&
      (product as Product & { status?: string }).status !== "private" &&
      (product.custom_order_seller_note ||
        (product.custom_order_processing_weeks_min &&
          product.custom_order_processing_weeks_max)) ? (
      <div className="space-y-2 text-sm text-marketplace-muted-foreground">
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
    ) : null;
  if (["quick_order_list"].includes(type))
    return (
      <QuickOrderList
        product={product}
        settings={settings}
        cartDiscovery={cartDiscovery}
      />
    );
  if (type === "media")
    return (
      <MediaGallery
        images={product.media || []}
        productName={product.name}
        productId={product.id}
        variantId={selectedVariant?.id}
        imageRatio={
          settings.aspect_ratio === "portrait" ? "portrait" : "square"
        }
      />
    );
  if (type === "product_title") {
    const size: Record<string, string> = {
      heading_1: "text-4xl",
      heading_2: "text-3xl",
      heading_3: "text-2xl",
      heading_4: "text-xl",
      heading_5: "text-lg",
      heading_6: "text-base",
    };
    const align =
      settings.alignment === "center"
        ? "text-center"
        : settings.alignment === "right"
          ? "text-right"
          : "text-left";
    const color = blockColor(
      settings.text_color,
      "var(--marketplace-foreground)",
    );
    const backgroundColor =
      settings.background_enabled === true
        ? blockColor(
            settings.background_color,
            "var(--marketplace-surface-warm)",
          )
        : undefined;
    const maxWidth: Record<string, string> = {
      narrow: "max-w-prose",
      normal: "max-w-3xl",
      wide: "max-w-5xl",
      full: "max-w-none",
    };
    return (
      <h1
        className={`${settings.width === "fill" ? "w-full" : "w-fit"} ${maxWidth[String(settings.max_width)] || "max-w-3xl"} ${size[String(settings.preset)] || "text-3xl"} ${align} font-bold`}
        style={{
          color,
          backgroundColor,
          paddingTop: Number(settings.padding_top) || 0,
          paddingBottom: Number(settings.padding_bottom) || 0,
          paddingLeft: Number(settings.padding_left) || 0,
          paddingRight: Number(settings.padding_right) || 0,
        }}
      >
        {product.name}
      </h1>
    );
  }
  if (type === "price")
    return <ProductPriceBlock product={product} settings={settings} />;
  if (type === "review_stars")
    return product.average_rating != null ? (
      <a href="#reviews" className="inline-flex items-center gap-2">
        <StarRatingDisplay rating={product.average_rating} size="sm" />
        {themeSettingEnabled(settings.show_count, true) ? (
          <span className="text-sm text-gray-600">
            {product.reviews_count || 0}
          </span>
        ) : null}
      </a>
    ) : null;
  if (type === "sku") {
    const sku = product.default_variant?.sku;
    return sku ? (
      <p className="text-sm text-gray-600">
        {String(settings.label || "SKU")}: {sku}
      </p>
    ) : null;
  }
  if (type === "swatches")
    return (
      <ProductSwatches
        product={product}
        label={String(settings.label || "Product options")}
      />
    );
  if (type === "buy_buttons")
    return (
      <ProductBuyButton
        product={product}
        cartDiscovery={cartDiscovery}
        basePath={basePath}
      />
    );
  if (
    type === "product_delivery" ||
    type === "product_shipping" ||
    type === "product_shipping_estimate"
  )
    return (
      <ProductPurchaseDeliveryPanel
        product={product}
        selectedVariant={selectedVariant}
      />
    );
  return null;
}

function blockColor(value: unknown, fallback: string): string {
  if (typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value))
    return value;
  if (value === "palette") return fallback;
  return fallback;
}

function ProductPriceBlock({
  product,
  settings,
}: {
  product: Product;
  settings: Record<string, unknown>;
}) {
  const t = useTranslations("products");
  const hiddenPricing = useHiddenPricing();
  const price = product.price;
  const original =
    product.original_price?.display_amount || price?.display_compare_at_amount;
  const onSale = Boolean(original && original !== price?.display_amount);
  const currentFirst = themeSettingEnabled(settings.show_sale_first, true);
  const size: Record<string, string> = {
    heading_1: "text-4xl",
    heading_2: "text-3xl",
    heading_3: "text-2xl",
    heading_4: "text-xl",
    heading_5: "text-lg",
    heading_6: "text-base",
  };
  const align =
    settings.alignment === "center"
      ? "justify-center text-center"
      : settings.alignment === "right"
        ? "justify-end text-right"
        : "justify-start text-left";
  return (
    <div
      className={`${settings.width === "fill" ? "w-full" : "w-fit"} ${align}`}
      style={{
        color: blockColor(settings.text_color, "var(--marketplace-foreground)"),
        paddingTop: Number(settings.padding_top) || 0,
        paddingBottom: Number(settings.padding_bottom) || 0,
        paddingLeft: Number(settings.padding_left) || 0,
        paddingRight: Number(settings.padding_right) || 0,
      }}
    >
      {hiddenPricing ? (
        <HiddenPricePrompt className="inline-flex items-center gap-1.5 text-base font-medium text-slate-600 underline underline-offset-4 hover:text-slate-900" />
      ) : (
        <>
          <div
            className={`flex items-center gap-3 ${size[String(settings.preset)] || "text-xl"}`}
          >
            {onSale && !currentFirst ? (
              <span className="text-gray-500 line-through">{original}</span>
            ) : null}
            <span className="font-semibold">{price?.display_amount}</span>
            {onSale && currentFirst ? (
              <span className="text-gray-500 line-through">{original}</span>
            ) : null}
          </div>
          {themeSettingEnabled(settings.installments) ? (
            <p
              data-theme-product-part="price-installments"
              className="text-xs text-marketplace-muted-foreground"
            >
              {t("installmentOptionsAtCheckout")}
            </p>
          ) : null}
          {themeSettingEnabled(settings.tax_information) ? (
            <p
              data-theme-product-part="price-tax-information"
              className="text-xs text-marketplace-muted-foreground"
            >
              {t("taxesCalculatedAtCheckout")}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}

function ProductSwatches({
  product,
  label,
}: {
  product: Product;
  label: string;
}) {
  const variants = product.variants || [];
  const { selectedVariant, setSelectedVariant } = useContext(
    ProductBlockVariantContext,
  );
  const { product_swatches: swatchSettings } = useStoreThemeSettings();
  if (!variants.length || !product.option_types?.length) return null;
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <VariantPicker
        variants={variants}
        optionTypes={product.option_types}
        selectedVariant={selectedVariant}
        onVariantChange={setSelectedVariant}
        swatchSettings={swatchSettings}
      />
    </div>
  );
}

function ProductBuyButton({
  product,
  cartDiscovery,
  basePath,
}: {
  product: Product;
  cartDiscovery?: CartDiscoveryInput;
  basePath: string;
}) {
  const t = useTranslations("wholesale");
  const { addItem } = useCart();
  const { currency } = useStore();
  const blockContext = useContext(ProductBlockVariantContext);
  const { selectedVariant } = blockContext;
  const hiddenPricing = useHiddenPricing();
  const [busy, setBusy] = useState(false);
  const [purchaseReady, setPurchaseReady] = useState(false);
  useEffect(() => {
    setPurchaseReady(true);
  }, []);
  const variant =
    selectedVariant ||
    product.default_variant ||
    product.variants?.find((item) => item.purchasable) ||
    product.variants?.[0];
  const purchasable = variant?.purchasable ?? product.purchasable ?? false;
  if (hiddenPricing)
    return (
      <Button asChild>
        <Link href={hiddenPricing.signInHref}>
          {t("hiddenPrice.signInToOrder")}
        </Link>
      </Button>
    );
  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        className="w-full"
        disabled={
          !purchaseReady ||
          busy ||
          blockContext.personalizationBusy ||
          !purchasable ||
          !variant
        }
        onClick={async () => {
          if (blockContext.onAddToCart) {
            await blockContext.onAddToCart();
            return;
          }
          if (!variant) return;
          setBusy(true);
          try {
            // Theme buy buttons without a host onAddToCart must still send
            // personalization answers from the product block context.
            const fields = blockContext.personalizationFields ?? [];
            const answers = blockContext.personalizationAnswers ?? {};
            const personalization =
              fields.length > 0
                ? buildPersonalizationPayload(fields, answers)
                : undefined;
            const result = await addItem(
              variant.id,
              1,
              personalization,
              cartDiscovery,
            );
            if (result.success) trackAddToCart(product, variant, 1, currency);
            else
              toast.error(
                result.error || "Could not add this product to your cart.",
              );
          } catch {
            toast.error("Could not add this product to your cart.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Adding…" : purchasable ? "Add to cart" : "Out of stock"}
      </Button>
      <MakeOfferButton
        variantId={variant?.id}
        available={product.buyer_offers_available && purchasable}
        basePath={basePath}
        currency={currency}
      />
      {(product as Product & { bundle_offer?: BundleOffer | null })
        .bundle_offer ? (
        <ProductBundleOffer
          offer={
            (product as Product & { bundle_offer?: BundleOffer | null })
              .bundle_offer!
          }
          currentProductId={product.id}
          basePath={basePath || ""}
        />
      ) : null}
    </div>
  );
}

function QuickOrderList({
  product,
  settings,
  cartDiscovery,
}: {
  product: Product;
  settings: Record<string, unknown>;
  cartDiscovery?: CartDiscoveryInput;
}) {
  const variants = product.variants?.length
    ? product.variants
    : product.default_variant
      ? [product.default_variant]
      : [];
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const { addItem } = useCart();
  if (variants.length < 2) return null;
  const addSelected = async () => {
    setBusy(true);
    try {
      for (const variant of variants) {
        const quantity = quantities[variant.id] || 0;
        if (quantity > 0 && variant.purchasable)
          await addItem(variant.id, quantity, undefined, cartDiscovery);
      }
      setQuantities({});
    } finally {
      setBusy(false);
    }
  };
  return (
    <section
      className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8"
      data-theme-quick-order-list
    >
      <h2 className="mb-4 text-lg font-semibold">
        {String(settings.heading || "Quick order")}
      </h2>
      <div className="divide-y divide-marketplace-border rounded-lg border border-marketplace-border">
        {variants.map((variant) => (
          <div
            key={variant.id}
            className="flex flex-wrap items-center justify-between gap-3 p-3"
          >
            <div>
              <p className="font-medium">
                {variant.options_text || product.name}
              </p>
              {themeSettingEnabled(settings.show_sku, true) && variant.sku ? (
                <p className="text-xs text-marketplace-muted-foreground">
                  {variant.sku}
                </p>
              ) : null}
              <p className="text-sm">{variant.price?.display_amount}</p>
            </div>
            <QuantityPickerField
              disabled={!variant.purchasable}
              quantity={quantities[variant.id] || 0}
              onQuantityChange={(quantity) =>
                setQuantities((current) => ({
                  ...current,
                  [variant.id]: quantity,
                }))
              }
              size="sm"
            />
          </div>
        ))}
      </div>
      <Button
        className="mt-4"
        disabled={
          busy || !Object.values(quantities).some((quantity) => quantity > 0)
        }
        onClick={() => void addSelected()}
      >
        {busy ? "Adding…" : "Add selected to cart"}
      </Button>
    </section>
  );
}
