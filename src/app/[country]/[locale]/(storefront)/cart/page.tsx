"use client";

import type { LineItem } from "@spree/sdk";
import { Lock, ShieldCheck, Tag } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import {
  PaymentIcon,
  type PaymentType,
} from "react-svg-credit-card-payment-icons";
import { toast } from "sonner";
import { SponsoredDiscoveryRail } from "@/components/ads/SponsoredDiscoveryRail";
import { CartAddOns } from "@/components/cart/CartAddOns";
import { CartLineItems } from "@/components/cart/CartLineItems";
import { CartRecommendations } from "@/components/cart/CartRecommendations";
import { CartSavedForLater } from "@/components/cart/CartSavedForLater";
import { CouponCode } from "@/components/checkout/CouponCode";
import { EmptyStateIllustration } from "@/components/empty-states/EmptyStateIllustration";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useStore } from "@/contexts/StoreContext";
import { useStoreThemeSettings } from "@/contexts/ThemeSettingsContext";
import { useCartShippingPresentation } from "@/hooks/useCartShippingPresentation";
import { trackRemoveFromCart, trackViewCart } from "@/lib/analytics/gtm";
import { updateCartCustomerNote } from "@/lib/data/cart";
import {
  applyCode,
  removeDiscountCode,
  removeGiftCard,
} from "@/lib/data/checkout";
import { addFavorite } from "@/lib/data/favorites";
import { getProduct } from "@/lib/data/products";
import {
  themeSettingColor,
  themeSettingEnabled,
} from "@/lib/theme/setting-value";
import { extractBasePath } from "@/lib/utils/path";

const ExpressCheckoutButton = dynamic(
  () =>
    import("@/components/checkout/ExpressCheckoutButton").then((m) => ({
      default: m.ExpressCheckoutButton,
    })),
  { ssr: false },
);

const CART_PAYMENT_MARKS: Array<{ label: string; type: PaymentType }> = [
  { label: "Visa", type: "Visa" },
  { label: "Mastercard", type: "Mastercard" },
  { label: "American Express", type: "AmericanExpress" },
  { label: "Discover", type: "Discover" },
  { label: "PayPal", type: "PayPal" },
  { label: "JCB", type: "JCB" },
  { label: "UnionPay", type: "UnionPay" },
  { label: "Diners Club", type: "DinersClub" },
];

export default function CartPage() {
  const { cart, loading, updating, updateItem, removeItem, refreshCart } =
    useCart();
  const { isAuthenticated } = useAuth();
  const [expressProcessing, setExpressProcessing] = useState(false);
  const [couponOpen, setCouponOpen] = useState(false);
  const [savedRefreshKey, setSavedRefreshKey] = useState(0);
  const pathname = usePathname();
  const basePath = extractBasePath(pathname);
  const { country } = useStore();
  const viewCartFiredRef = useRef(false);
  const t = useTranslations("cart");
  const tc = useTranslations("common");
  const themeSettings = useStoreThemeSettings();
  const cartSettings = themeSettings.cart || {};
  const checkoutSettings = themeSettings.checkout || {};
  const cartPageStyle: CSSProperties = {
    backgroundColor: themeSettingColor(
      cartSettings.background_color,
      "--marketplace-canvas",
    ),
    color: themeSettingColor(
      cartSettings.text_color,
      "--marketplace-foreground",
    ),
  };
  const cartSummaryStyle: CSSProperties = {
    backgroundColor: themeSettingColor(
      cartSettings.background_color,
      "--marketplace-surface",
    ),
    color: themeSettingColor(
      cartSettings.text_color,
      "--marketplace-foreground",
    ),
    borderColor: themeSettingColor(
      cartSettings.border_color,
      "--marketplace-border",
    ),
  };

  useEffect(() => {
    if (
      !loading &&
      cart &&
      cart.total_quantity > 0 &&
      !viewCartFiredRef.current
    ) {
      trackViewCart(cart);
      viewCartFiredRef.current = true;
    }
  }, [cart, loading]);

  const {
    shippingFree,
    shippingAmount,
    pending: shippingPending,
    addOnsShowFreeShipping,
  } = useCartShippingPresentation(cart ?? null, country);

  const handleRemove = async (item: LineItem) => {
    await removeItem(item.id);
    if (cart) {
      trackRemoveFromCart(item, cart.currency);
    }
  };

  const handleSaveForLater = async (item: LineItem) => {
    try {
      const product = await getProduct(item.slug);
      const result = await addFavorite({
        productId: product.id,
        variantId: item.variant_id,
      });
      if (!result.success) {
        toast.error(result.error || t("saveForLaterFailed"));
        return;
      }
      await removeItem(item.id);
      setSavedRefreshKey((value) => value + 1);
      toast.success(t("savedForLater"));
    } catch {
      toast.error(t("saveForLaterFailed"));
    }
  };

  const handleSaveCustomerNote = async (note: string) => {
    const result = await updateCartCustomerNote(note);
    if (!result.success) {
      return { success: false as const, error: result.error };
    }
    await refreshCart();
    toast.success(t("orderNoteSaved"));
    return { success: true as const };
  };

  const handleApplyCode = async (code: string) => {
    if (!cart) return { success: false as const };
    const result = await applyCode(cart.id, code);
    if (result.success) {
      await refreshCart();
      setCouponOpen(true);
    }
    return { success: result.success, error: result.error };
  };

  const handleRemoveDiscount = async (code: string) => {
    if (!cart) return { success: false as const, error: undefined };
    const result = await removeDiscountCode(cart.id, code);
    if (result.success) {
      await refreshCart();
      return { success: true as const };
    }
    return { success: false as const, error: result.error };
  };

  const handleRemoveGiftCard = async (giftCardId: string) => {
    if (!cart) return { success: false as const, error: undefined };
    const result = await removeGiftCard(cart.id, giftCardId);
    if (result.success) {
      await refreshCart();
      return { success: true as const };
    }
    return { success: false as const, error: result.error };
  };

  if (loading) {
    return (
      <div data-theme-cart-page style={cartPageStyle}>
        <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-10">
          <div className="animate-pulse">
            <div className="mb-8 h-9 w-40 rounded bg-marketplace-muted/60" />
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-6">
                <div className="h-6 w-36 rounded bg-marketplace-muted/50" />
                <div className="flex gap-5">
                  <div className="size-32 shrink-0 rounded-md bg-marketplace-muted/60" />
                  <div className="flex-1 space-y-3 pt-1">
                    <div className="h-4 w-4/5 rounded bg-marketplace-muted/60" />
                    <div className="h-3 w-1/3 rounded bg-marketplace-muted/40" />
                    <div className="h-9 w-16 rounded-md bg-marketplace-muted/40" />
                  </div>
                </div>
              </div>
              <div className="h-80 rounded-lg border border-marketplace-border bg-marketplace-muted/30" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!cart?.items || cart.items.length === 0) {
    return (
      <div data-theme-cart-page style={cartPageStyle}>
        <div className="mx-auto flex max-w-[1400px] flex-col items-center px-4 py-24 sm:px-6 lg:px-10">
          <div className="mx-auto max-w-md text-center">
            <EmptyStateIllustration
              name="empty-cart"
              size={96}
              className="mx-auto text-marketplace-muted-foreground"
            />
            <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight text-marketplace-foreground">
              {t("emptyCart")}
            </h1>
            <p className="mt-2 text-sm text-marketplace-muted-foreground">
              {t("emptyCartDescription")}
            </p>
            {themeSettingEnabled(cartSettings.show_continue_shopping, true) && (
              <div className="mt-8">
                <Button
                  size="lg"
                  asChild
                  className="h-12 rounded-full px-8 bg-marketplace-foreground text-marketplace-surface hover:bg-marketplace-foreground/90"
                >
                  <Link href={`${basePath}/products`}>
                    {tc("continueShopping")}
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const shippingAddress = cart.shipping_address;
  const shippingDestination = shippingAddress
    ? [shippingAddress.country_name, shippingAddress.postal_code]
        .map((part) => part?.trim())
        .filter(Boolean)
        .join(", ")
    : null;
  const taxTotal = cart.tax_total ? Number.parseFloat(cart.tax_total) : 0;
  const hasCoupon =
    (cart.discounts ?? []).some((discount) => !!discount.code) ||
    !!cart.gift_card;

  const sellerCount = new Set(
    cart.items.map(
      (item) => item.seller?.id || item.seller_id || "marketplace",
    ),
  ).size;

  return (
    <div data-theme-cart-page style={cartPageStyle}>
      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 sm:py-10 lg:px-10">
        <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:grid-rows-[auto_auto] lg:items-start lg:gap-x-10 lg:gap-y-5 xl:gap-x-14">
          <header className="lg:col-start-1 lg:row-start-1">
            <h1 className="font-display text-3xl font-semibold tracking-tight text-marketplace-foreground sm:text-[2.125rem]">
              {t("shoppingCart")}
            </h1>
            {sellerCount > 1 ? (
              <p className="mt-2 text-sm text-marketplace-muted-foreground">
                {t("multiSellerShipNote")}
              </p>
            ) : null}
          </header>

          <section
            aria-label={t("shoppingCart")}
            className="min-w-0 lg:col-start-1 lg:row-start-2"
          >
            <CartLineItems
              items={cart.items}
              basePath={basePath}
              updating={updating}
              customerNote={cart.customer_note}
              shippingFree={shippingFree}
              shippingAmount={shippingAmount}
              shippingPending={shippingPending}
              onRemove={handleRemove}
              onSaveForLater={isAuthenticated ? handleSaveForLater : undefined}
              onUpdateQuantity={(itemId, quantity) =>
                updateItem(itemId, quantity)
              }
              onSaveCustomerNote={handleSaveCustomerNote}
            />
            <CartAddOns
              basePath={basePath}
              cartSlugs={cart.items.map((item) => item.slug)}
              showFreeShipping={addOnsShowFreeShipping}
            />
          </section>

          <aside
            aria-label={tc("orderSummary")}
            className="min-w-0 lg:col-start-2 lg:row-start-2"
          >
            <div
              data-theme-cart-summary
              className="sticky top-24 space-y-5 rounded-xl border border-marketplace-border bg-marketplace-surface p-5 sm:p-6"
              style={cartSummaryStyle}
            >
              {themeSettingEnabled(
                checkoutSettings.show_order_summary,
                true,
              ) && (
                <dl className="space-y-3 text-sm">
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-marketplace-foreground">
                      {t("itemsTotal")}
                    </dt>
                    <dd className="tabular-nums text-marketplace-foreground">
                      {cart.display_item_total}
                    </dd>
                  </div>
                  {cart.discount_total &&
                    parseFloat(cart.discount_total) < 0 && (
                      <div className="flex items-baseline justify-between gap-4 text-emerald-600">
                        <dt>{tc("discount")}</dt>
                        <dd className="tabular-nums">
                          {cart.display_discount_total}
                        </dd>
                      </div>
                    )}
                  {(cart.fees ?? [])
                    .filter((fee) => fee.kind === "personalization")
                    .map((fee) => (
                      <div
                        key={fee.id}
                        className="flex items-baseline justify-between gap-4"
                      >
                        <dt className="text-marketplace-foreground">
                          {fee.label}
                        </dt>
                        <dd className="tabular-nums text-marketplace-foreground">
                          {fee.display_amount}
                        </dd>
                      </div>
                    ))}
                  <div className="flex items-start justify-between gap-4">
                    <dt className="min-w-0 text-marketplace-foreground">
                      <span>{tc("shipping")}</span>
                      {shippingDestination ? (
                        <span className="mt-0.5 block text-xs text-marketplace-muted-foreground">
                          {t("shippingTo", {
                            destination: shippingDestination,
                          })}
                        </span>
                      ) : null}
                    </dt>
                    <dd className="shrink-0 tabular-nums text-right">
                      {shippingPending ? (
                        <span className="text-marketplace-muted-foreground">
                          {t("shippingEstimateLoading")}
                        </span>
                      ) : shippingFree ? (
                        <span className="font-bold text-emerald-600">
                          {t("shippingFree")}
                        </span>
                      ) : shippingAmount ? (
                        <span className="text-marketplace-foreground">
                          {shippingAmount}
                        </span>
                      ) : (
                        <span className="text-marketplace-muted-foreground">
                          {t("shippingCalculatedAtCheckout")}
                        </span>
                      )}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-marketplace-foreground">
                      {t("estimatedTax")}
                    </dt>
                    <dd className="tabular-nums text-marketplace-foreground">
                      {taxTotal > 0 ? (
                        cart.display_tax_total
                      ) : (
                        <span className="text-marketplace-muted-foreground">
                          {t("taxCalculatedAtCheckout")}
                        </span>
                      )}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4 border-t border-marketplace-border pt-3.5">
                    <dt className="font-bold text-marketplace-foreground">
                      {t("totalWithCount", { count: cart.total_quantity })}
                    </dt>
                    <dd className="font-bold tabular-nums text-marketplace-foreground">
                      {cart.display_total}
                    </dd>
                  </div>

                  {cart.gift_card &&
                  parseFloat(cart.gift_card_total ?? "0") > 0 ? (
                    <div className="flex items-baseline justify-between gap-4 text-emerald-600">
                      <dt>{t("giftCard")}</dt>
                      <dd>-{cart.display_gift_card_total}</dd>
                    </div>
                  ) : cart.store_credit_total &&
                    parseFloat(cart.store_credit_total) > 0 ? (
                    <div className="flex items-baseline justify-between gap-4 text-emerald-600">
                      <dt>{t("storeCredit")}</dt>
                      <dd>-{cart.display_store_credit_total}</dd>
                    </div>
                  ) : null}

                  {cart.amount_due &&
                    cart.amount_due !== cart.total &&
                    parseFloat(cart.amount_due) > 0 && (
                      <div className="flex items-baseline justify-between gap-4 border-t border-marketplace-border pt-3">
                        <dt className="font-bold text-marketplace-foreground">
                          {t("amountDue")}
                        </dt>
                        <dd className="font-bold tabular-nums text-marketplace-foreground">
                          {cart.display_amount_due}
                        </dd>
                      </div>
                    )}
                </dl>
              )}

              <p className="flex items-start gap-2 text-sm leading-5 text-marketplace-foreground">
                <ShieldCheck
                  className="mt-0.5 size-4 shrink-0 text-marketplace-foreground"
                  aria-hidden
                />
                <span className="min-w-0">
                  {t.rich("purchaseProtection", {
                    protection: (chunks) => (
                      <Link
                        href={`${basePath}/policies/terms-of-service`}
                        className="underline decoration-dashed underline-offset-2 hover:text-marketplace-brand"
                      >
                        {chunks}
                      </Link>
                    ),
                  })}
                </span>
              </p>

              <div className="space-y-3">
                {!expressProcessing &&
                  themeSettingEnabled(
                    cartSettings.show_checkout_button,
                    true,
                  ) && (
                    <Button
                      size="lg"
                      asChild
                      className="h-12 w-full rounded-md border-transparent bg-marketplace-brand text-base font-semibold text-marketplace-brand-foreground hover:opacity-90"
                    >
                      <Link href={`${basePath}/checkout/${cart.id}`}>
                        {t("proceedToCheckout")}
                      </Link>
                    </Button>
                  )}

                {themeSettingEnabled(
                  checkoutSettings.show_express_checkout,
                  true,
                ) &&
                  parseFloat(cart.total ?? "0") > 0 && (
                    <ExpressCheckoutButton
                      cart={cart}
                      basePath={basePath}
                      maxColumns={2}
                      showDivider={false}
                      onComplete={() => {}}
                      onProcessingChange={setExpressProcessing}
                    />
                  )}
              </div>

              <p className="text-center text-[11px] leading-relaxed text-marketplace-muted-foreground">
                {t.rich("checkoutAgreement", {
                  terms: (chunks) => (
                    <Link
                      href={`${basePath}/policies/terms-of-service`}
                      className="text-marketplace-brand underline underline-offset-2 hover:opacity-80"
                    >
                      {chunks}
                    </Link>
                  ),
                  privacy: (chunks) => (
                    <Link
                      href={`${basePath}/policies/privacy-policy`}
                      className="text-marketplace-brand underline underline-offset-2 hover:opacity-80"
                    >
                      {chunks}
                    </Link>
                  ),
                })}
              </p>

              <div>
                <p className="mb-2.5 flex items-center gap-1.5 text-sm font-bold text-marketplace-foreground">
                  <Lock className="size-3.5" aria-hidden />
                  {t("secureCheckoutOptions")}
                </p>
                <ul className="flex flex-wrap gap-1.5">
                  {CART_PAYMENT_MARKS.map((method) => (
                    <li
                      key={method.label}
                      aria-label={method.label}
                      title={method.label}
                      className="flex h-7 min-w-9 items-center justify-center rounded border border-marketplace-border bg-white px-1"
                    >
                      <PaymentIcon
                        type={method.type}
                        format="flatRounded"
                        width={32}
                      />
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                {!couponOpen && !hasCoupon ? (
                  <button
                    type="button"
                    onClick={() => setCouponOpen(true)}
                    className="inline-flex items-center gap-2 text-sm font-bold text-marketplace-foreground hover:underline"
                  >
                    <Tag
                      className="size-4 fill-emerald-600 text-emerald-600"
                      aria-hidden
                    />
                    {t("applyCouponCode")}
                  </button>
                ) : (
                  <CouponCode
                    cart={cart}
                    onApply={handleApplyCode}
                    onRemoveDiscount={handleRemoveDiscount}
                    onRemoveGiftCard={handleRemoveGiftCard}
                  />
                )}
              </div>
            </div>
          </aside>
        </div>

        <SponsoredDiscoveryRail
          placement="cart_recommendations"
          title={t("sponsoredPicks")}
          basePath={basePath}
          currency={cart.currency}
          limit={6}
          className="mt-10"
        />
        <CartRecommendations
          basePath={basePath}
          cartSlugs={cart.items.map((item) => item.slug)}
          showFreeShipping={addOnsShowFreeShipping}
        />
        <CartSavedForLater basePath={basePath} refreshKey={savedRefreshKey} />
      </div>
    </div>
  );
}
