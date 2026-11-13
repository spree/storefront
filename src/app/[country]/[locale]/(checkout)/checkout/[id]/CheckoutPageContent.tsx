"use client";

import type { Address, AddressParams, Cart, Country } from "@spree/sdk";
import { CircleAlert, Loader2, LockKeyhole, Store } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { AddressSection } from "@/components/checkout/AddressSection";
import { DeliveryMethodSection } from "@/components/checkout/DeliveryMethodSection";
import {
  type PaymentCompleteResult,
  PaymentSection,
  type PaymentSectionHandle,
} from "@/components/checkout/PaymentSection";
import { PolicyConsent } from "@/components/policy/PolicyConsent";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useCheckout } from "@/contexts/CheckoutContext";
import { useStoreThemeSettings } from "@/contexts/ThemeSettingsContext";
import {
  trackAddPaymentInfo,
  trackAddShippingInfo,
  trackBeginCheckout,
} from "@/lib/analytics/gtm";
import { getAddresses, updateAddress } from "@/lib/data/addresses";
import {
  getCheckoutOrder,
  selectDeliveryRate,
  updateOrderAddresses,
} from "@/lib/data/checkout";
import { isAuthenticated as checkAuth } from "@/lib/data/cookies";
import { getCountry } from "@/lib/data/countries";
import { getMarketCountries, resolveMarket } from "@/lib/data/markets";
import {
  completeCheckoutOrder,
  completeCheckoutPaymentSession,
} from "@/lib/data/payment";
import { themeSettingEnabled } from "@/lib/theme/setting-value";
import { extractBasePath } from "@/lib/utils/path";
import { CheckoutSidebar } from "./CheckoutSidebar";
import type { CheckoutInitialData } from "./page";

const ExpressCheckoutButton = dynamic(
  () =>
    import("@/components/checkout/ExpressCheckoutButton").then((m) => ({
      default: m.ExpressCheckoutButton,
    })),
  { ssr: false },
);

// Fingerprint of line-item state only. Used to detect when CartContext
// has a different set of line items than our local checkout cart —
// happens when Next's router cache restores a prior /checkout/[id] view
// after the user went back, added/removed/changed quantities, and
// returned.
//
// Intentionally excludes discount/total/tax/delivery fields: those
// change as a result of checkout-page mutations (apply discount, select
// shipping, etc.) that update local `cart` but not `contextCart`, and
// we don't want those legitimate divergences to trigger an overwrite.
// Line items don't change from checkout-page mutations.
function cartItemsFingerprint(cart: Cart | null): string {
  if (!cart) return "";
  return (cart.items ?? []).map((i) => `${i.id}:${i.quantity}`).join(",");
}

interface CheckoutPageContentProps {
  cartId: string;
  urlCountry: string;
  initialData: CheckoutInitialData | null;
}

function CheckoutPageContentInner({
  cartId,
  urlCountry,
  initialData,
}: CheckoutPageContentProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const basePath = extractBasePath(pathname);
  const { setSummaryContent } = useCheckout();
  const { cart: contextCart } = useCart();
  const t = useTranslations("checkout");
  const tExpress = useTranslations("expressCheckout");
  const tc = useTranslations("common");
  const { user, loading: authLoading } = useAuth();
  const { checkout: checkoutSettings } = useStoreThemeSettings();

  // Pick up payment errors from the confirm-payment redirect
  const paymentError = searchParams.get("payment_error");

  // Initialize state from server-fetched data — no loading skeleton needed
  const [cart, setCart] = useState<Cart | null>(initialData?.cart ?? null);
  const [countries, setCountries] = useState<Country[]>(
    initialData?.countries ?? [],
  );
  const [savedAddresses, setSavedAddresses] = useState<Address[]>(
    initialData?.savedAddresses ?? [],
  );
  const [isAuthenticated, setIsAuthenticated] = useState(
    initialData?.isAuthenticated ?? false,
  );
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(paymentError);
  const [processing, setProcessing] = useState(false);
  const [expressAvailable, setExpressAvailable] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sectionErrors, setSectionErrors] = useState<Record<string, string[]>>(
    {},
  );
  const [policyConsent, setPolicyConsent] = useState(false);
  const [policyError, setPolicyError] = useState(false);
  const [isSessionPayment, setIsSessionPayment] = useState(true);

  const fulfillments = cart?.fulfillments ?? [];
  const sellerCount = new Set(
    (cart?.items ?? [])
      .map((item) => item.seller_id ?? item.seller_name)
      .filter(Boolean),
  ).size;

  const cartRef = useRef(cart);
  cartRef.current = cart;
  const routerRef = useRef(router);
  routerRef.current = router;
  const tRef = useRef(t);
  tRef.current = t;
  const beginCheckoutFiredRef = useRef(false);
  const paymentRef = useRef<PaymentSectionHandle>(null);

  // useLayoutEffect so the sidebar renders on the first paint (before the
  // browser paints the empty slot). Always re-publish when `cart` changes.
  useLayoutEffect(() => {
    if (cart) {
      setSummaryContent(<CheckoutSidebar cart={cart} />);
    } else {
      setSummaryContent(null);
    }
  }, [cart, setSummaryContent]);

  // Refresh cart data (used after coupon changes, express checkout, etc.)
  const loadOrder = useCallback(async () => {
    setLoading(true);
    if (!paymentError) setError(null);

    try {
      const [cartData, market, addressesData, authStatus] = await Promise.all([
        getCheckoutOrder(cartId),
        resolveMarket(urlCountry).catch(() => null),
        getAddresses(),
        checkAuth(),
      ]);

      const countriesData = market
        ? await getMarketCountries(market.id).catch(() => ({
            data: [] as Country[],
          }))
        : { data: [] as Country[] };

      if (!cartData) {
        setError(tRef.current("orderNotFound"));
        setLoading(false);
        return;
      }

      if (cartData.current_step === "complete") {
        routerRef.current.push(`${basePath}/order-placed/${cartId}`);
        return;
      }

      setCart(cartData);
      setCountries(countriesData.data);
      setSavedAddresses(addressesData.data);
      setIsAuthenticated(authStatus);

      return cartData;
    } catch {
      setError(tRef.current("failedToLoadCheckout"));
      return null;
    } finally {
      setLoading(false);
    }
  }, [cartId, urlCountry, basePath, paymentError]);

  // Only fetch on mount if we don't have initial data (e.g. client-side navigation)
  useEffect(() => {
    if (initialData) {
      // Fire begin_checkout analytics for SSR-loaded data
      if (!beginCheckoutFiredRef.current && initialData.cart) {
        try {
          trackBeginCheckout(initialData.cart);
        } catch {
          // Analytics should never break checkout flow
        }
        beginCheckoutFiredRef.current = true;
      }
      return;
    }
    loadOrder().then((cartData) => {
      if (cartData && !beginCheckoutFiredRef.current) {
        try {
          trackBeginCheckout(cartData);
        } catch {
          // Analytics should never break checkout flow
        }
        beginCheckoutFiredRef.current = true;
      }
    });
  }, [initialData, loadOrder]);

  // When the router cache restores a stale /checkout/[id] view (e.g. the
  // user added an item, went to checkout, went back, changed quantity,
  // and returned), our local `cart` keeps the old line items. CartContext
  // refreshes on every pathname change, so when its line-item fingerprint
  // disagrees with ours, refetch the checkout cart so we get the new
  // items plus recalculated totals — `contextCart` itself doesn't carry
  // the checkout-side discount/shipping calculations, so we use it only
  // as a staleness signal, not as the source of truth.
  //
  // We compare line items only, not totals — checkout-page mutations
  // (apply discount, select shipping, etc.) change totals locally but
  // don't reach CartContext, so we'd ping-pong if we keyed on those.
  // Line items only change via cart-page mutations, which CartContext
  // does see.
  //
  // Only `cart` is touched — addresses / countries / auth state are left
  // alone, so the address form keeps typed input.
  useEffect(() => {
    if (!contextCart || contextCart.id !== cartId) return;
    if (cartItemsFingerprint(contextCart) === cartItemsFingerprint(cart))
      return;
    let cancelled = false;
    getCheckoutOrder(cartId)
      .then((fresh) => {
        if (cancelled || !fresh) return;
        if (fresh.current_step === "complete") {
          routerRef.current.push(`${basePath}/order-placed/${cartId}`);
          return;
        }
        setCart(fresh);
      })
      .catch(() => {
        // Best-effort refresh — keep the current cart on failure rather
        // than wiping checkout state.
      });
    return () => {
      cancelled = true;
    };
  }, [contextCart, cartId, cart, basePath]);

  // Handle email blur — persist email as the first backend call
  const handleEmailBlur = useCallback(async (email: string) => {
    const currentOrder = cartRef.current;
    if (!currentOrder || !email.trim()) return;

    // Only persist email if it changed
    if (email === currentOrder.email) return;

    try {
      const result = await updateOrderAddresses(currentOrder.id, { email });
      if (result.success && result.cart) {
        setCart(result.cart);
      }
    } catch {
      // Email save failure is not critical — will be caught on "Pay now"
    }
  }, []);

  // Handle auto-save (address + email on blur)
  const handleAutoSave = useCallback(
    async (addressData: {
      email: string;
      shipping_address?: AddressParams;
      shipping_address_id?: string;
    }): Promise<boolean> => {
      const currentOrder = cartRef.current;
      if (!currentOrder) return false;

      setSaving(true);
      setError(null);

      try {
        const updateResult = await updateOrderAddresses(currentOrder.id, {
          email: addressData.email,
          ...(addressData.shipping_address && {
            shipping_address: addressData.shipping_address,
          }),
          ...(addressData.shipping_address_id && {
            shipping_address_id: addressData.shipping_address_id,
          }),
        });

        if (!updateResult.success) {
          setError(updateResult.error || tRef.current("failedToSaveAddress"));
          return false;
        }

        if (updateResult.cart) {
          setCart(updateResult.cart);
        }
        return Boolean(updateResult.cart);
      } catch {
        setError(tRef.current("generalError"));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  // Handle delivery rate selection
  const handleDeliveryRateSelect = useCallback(
    async (fulfillmentId: string, rateId: string) => {
      const currentOrder = cartRef.current;
      if (!currentOrder) return;

      setProcessing(true);
      setError(null);

      let trackingOrder: Cart | null = null;
      let trackingRateName: string | undefined;

      try {
        const result = await selectDeliveryRate(
          currentOrder.id,
          fulfillmentId,
          rateId,
        );
        if (!result.success) {
          setError(result.error || tRef.current("failedToSelectRate"));
        } else if (result.cart) {
          setCart(result.cart);

          const selectedRate = result.cart.fulfillments
            ?.flatMap((s) => s.delivery_rates || [])
            ?.find((r) => r.id === rateId);
          trackingOrder = result.cart;
          trackingRateName = selectedRate?.name;
        }
      } catch {
        setError(tRef.current("generalError"));
      } finally {
        setProcessing(false);
      }

      if (trackingOrder) {
        try {
          trackAddShippingInfo(trackingOrder, trackingRateName);
        } catch {
          // Analytics should never break checkout flow
        }
      }
    },
    [],
  );

  // Handle billing address update (called by PaymentSection before gateway confirmation)
  const handleUpdateBillingAddress = useCallback(
    async (data: {
      billing_address?: AddressParams;
      use_shipping?: boolean;
    }): Promise<boolean> => {
      const currentOrder = cartRef.current;
      if (!currentOrder) return false;

      setError(null);

      try {
        const updateResult = await updateOrderAddresses(currentOrder.id, {
          ...(data.billing_address && {
            billing_address: data.billing_address,
          }),
          ...(data.use_shipping && { use_shipping: data.use_shipping }),
        });

        if (!updateResult.success) {
          setError(updateResult.error || tRef.current("failedToSaveBilling"));
          return false;
        }

        return true;
      } catch {
        setError(tRef.current("failedToSaveBillingRetry"));
        return false;
      }
    },
    [],
  );

  // Handle payment completion (called by PaymentSection after payment is confirmed)
  const handlePaymentComplete = useCallback(
    async (result: PaymentCompleteResult) => {
      const currentOrder = cartRef.current;
      if (!currentOrder) return;

      setError(null);

      try {
        // For session-based payments, complete the payment session first
        if (result.type === "session") {
          const sessionResult = await completeCheckoutPaymentSession(
            currentOrder.id,
            result.sessionId,
            result.sessionResult
              ? { session_result: result.sessionResult }
              : undefined,
          );

          if (!sessionResult.success) {
            setError(
              sessionResult.error ||
                tRef.current("failedToCompletePaymentSession"),
            );
            setProcessing(false);
            return;
          }
        }
        // For direct payments, the payment was already created in PaymentSection

        try {
          trackAddPaymentInfo(currentOrder);
        } catch {
          // Analytics should never break checkout flow
        }

        // Complete the order — if the backend already completed it during
        // session completion, completeCheckoutOrder handles 403/422 gracefully.
        const completeResult = await completeCheckoutOrder(currentOrder.id);
        if (!completeResult.success) {
          setError(
            completeResult.error || tRef.current("failedToCompleteOrder"),
          );
          setProcessing(false);
          return;
        }

        // Cache the completed order for the thank-you page
        if (completeResult.order) {
          const { cacheCompletedOrder } = await import(
            "@/lib/utils/completed-order-cache"
          );
          cacheCompletedOrder(currentOrder.id, completeResult.order);
        }

        routerRef.current.push(`${basePath}/order-placed/${currentOrder.id}`);
      } catch {
        setError(tRef.current("generalError"));
        setProcessing(false);
      }
    },
    [basePath],
  );

  // Fetch states for a country
  const fetchStates = useCallback(async (countryIso: string) => {
    try {
      const country = await getCountry(countryIso);
      return country.states || [];
    } catch {
      return [];
    }
  }, []);

  // Update a saved address
  const handleUpdateSavedAddress = useCallback(
    async (id: string, data: AddressParams): Promise<Address> => {
      const result = await updateAddress(id, data);

      if (!result.success) {
        throw new Error(result.error || tRef.current("failedToSaveAddress"));
      }

      if (!result.address) {
        throw new Error(tRef.current("generalError"));
      }

      return result.address;
    },
    [],
  );

  // Validate and pay — single "Pay now" action
  const validateAndPay = async () => {
    if (!cart) return;

    setSectionErrors({});
    setError(null);

    if (!isAuthenticated && !policyConsent) {
      setPolicyError(true);
      setError(t("policyConsentRequired"));
      document
        .getElementById("policy-consent")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      document.getElementById("policy-consent")?.focus();
      return;
    }

    // Refresh cart to get latest requirements
    const freshOrder = await getCheckoutOrder(cart.id);
    if (!freshOrder) {
      setError(t("failedToLoadCheckout"));
      return;
    }
    setCart(freshOrder);

    // Check requirements — skip "payment" since we handle that via
    // the PaymentSection imperative submit (payment is created at confirmation time)
    const prePaymentReqs = (freshOrder.requirements || []).filter(
      (req) => req.step !== "payment",
    );

    if (prePaymentReqs.length > 0) {
      const errorsBySection: Record<string, string[]> = {};

      for (const req of prePaymentReqs) {
        // Map requirement steps to section IDs
        const sectionId =
          req.step === "address"
            ? "address"
            : req.step === "delivery"
              ? "shipping"
              : req.step;
        if (!errorsBySection[sectionId]) {
          errorsBySection[sectionId] = [];
        }
        errorsBySection[sectionId].push(req.message);
      }

      setSectionErrors(errorsBySection);

      // Scroll to first error section
      const firstSection = Object.keys(errorsBySection)[0];
      const el = document.getElementById(`checkout-section-${firstSection}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }

      return;
    }

    // All requirements met — submit payment
    if (!paymentRef.current) {
      setError(t("failedToInitPayment"));
      return;
    }

    setProcessing(true);
    await paymentRef.current.submit();
    // PaymentSection handles setProcessing(false) on error internally
  };

  // Loading state — only shown when no initial data (client-side navigation).
  // When initialData is provided (SSR), skip the authLoading check since
  // we already know isAuthenticated from the server.
  if (loading || (!initialData && authLoading)) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-4 bg-gray-200 rounded w-1/4" />
        <div className="space-y-4 mt-8">
          <div className="h-12 bg-gray-200 rounded" />
          <div className="h-12 bg-gray-200 rounded" />
          <div className="h-12 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  // Error state (no cart loaded)
  if (error && !cart) {
    return (
      <div className="text-center py-12">
        <h1 className="mb-4 font-display text-3xl font-semibold text-marketplace-foreground">
          {t("checkoutError")}
        </h1>
        <p className="mb-6 text-marketplace-muted-foreground">{error}</p>
        <Link
          href={`${basePath}/cart`}
          className="inline-flex min-h-11 items-center rounded-md bg-marketplace-brand px-5 text-sm font-semibold text-marketplace-brand-foreground hover:opacity-90"
        >
          {t("returnToCart")}
        </Link>
      </div>
    );
  }

  if (!cart) return null;

  // Empty cart
  if (!cart.items || cart.items.length === 0) {
    return (
      <div className="text-center py-12">
        <h1 className="mb-4 font-display text-3xl font-semibold text-marketplace-foreground">
          {t("emptyCart")}
        </h1>
        <p className="mb-6 text-marketplace-muted-foreground">
          {t("emptyCartDescription")}
        </p>
        <Link
          href={`${basePath}/products`}
          className="inline-flex min-h-11 items-center rounded-md bg-marketplace-brand px-5 text-sm font-semibold text-marketplace-brand-foreground hover:opacity-90"
        >
          {tc("continueShopping")}
        </Link>
      </div>
    );
  }

  const hasDistinctAmountDue = Boolean(
    cart.amount_due &&
      cart.amount_due !== cart.total &&
      Number.parseFloat(cart.amount_due) > 0,
  );
  const checkoutAmount = hasDistinctAmountDue
    ? cart.display_amount_due
    : cart.display_total;
  const paymentActionLabel = processing
    ? tc("processing")
    : isSessionPayment
      ? t("payNow")
      : t("placeOrder");

  return (
    <div className="pb-24 md:pb-0">
      {/* Error banner */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <CircleAlert />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="mb-6 flex items-center justify-between gap-4 border-b border-marketplace-border pb-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-marketplace-foreground sm:text-4xl">
              {t("checkout")}
            </h1>
          </div>
          <span
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-marketplace-border bg-marketplace-curator text-marketplace-foreground"
            role="img"
            aria-label={t("secureTransactions")}
            title={t("secureTransactions")}
          >
            <LockKeyhole className="h-4 w-4" aria-hidden="true" />
          </span>
        </div>
      </div>

      {sellerCount > 1 && (
        <div className="mb-7 flex items-start gap-3 rounded-xl bg-[#f7f3eb] px-4 py-3.5 sm:px-5">
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-white/80 text-marketplace-brand">
            <Store className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 pt-0.5">
            <p className="text-sm font-semibold leading-5 text-marketplace-foreground">
              {t("multiSellerTitle")}
            </p>
            <p className="mt-1 max-w-prose text-sm leading-5 text-marketplace-muted-foreground">
              {t("multiSellerBody")}
            </p>
          </div>
        </div>
      )}

      {/* Express checkout for guests */}
      {themeSettingEnabled(checkoutSettings?.show_express_checkout, true) &&
        !isAuthenticated &&
        parseFloat(cart.total ?? "0") > 0 && (
          <div
            className={
              expressAvailable
                ? "mb-6 rounded-2xl border border-marketplace-border bg-marketplace-curator p-4 sm:p-5"
                : ""
            }
          >
            {expressAvailable && (
              <h2 className="mb-3 font-display text-xl font-semibold text-marketplace-foreground">
                {tExpress("title")}
              </h2>
            )}
            <ExpressCheckoutButton
              cart={cart}
              basePath={basePath}
              onComplete={async () => {
                await loadOrder();
              }}
              onProcessingChange={setProcessing}
              onAvailabilityChange={setExpressAvailable}
              maxColumns={2}
              showDivider
            />
          </div>
        )}

      <div
        className={
          processing
            ? "relative opacity-50 pointer-events-none select-none"
            : "relative"
        }
      >
        <div id="checkout-section-address">
          <AddressSection
            cart={cart}
            countries={countries}
            savedAddresses={savedAddresses}
            isAuthenticated={isAuthenticated}
            signInUrl={`${basePath}/account?redirect=${encodeURIComponent(pathname)}`}
            fetchStates={fetchStates}
            onEmailBlur={handleEmailBlur}
            onAutoSave={handleAutoSave}
            onUpdateSavedAddress={
              isAuthenticated ? handleUpdateSavedAddress : undefined
            }
            errors={sectionErrors.address}
            saving={saving}
            processing={processing}
            user={user}
          />
        </div>

        <div
          id="checkout-section-shipping"
          className="mt-8 border-t border-gray-200 pt-7"
        >
          <DeliveryMethodSection
            fulfillments={fulfillments}
            items={cart.items ?? []}
            onDeliveryRateSelect={handleDeliveryRateSelect}
            processing={processing}
            errors={sectionErrors.shipping}
          />
        </div>

        <div id="checkout-section-payment" className="mt-8 pt-7">
          <PaymentSection
            ref={paymentRef}
            cart={cart}
            countries={countries}
            isAuthenticated={isAuthenticated}
            fetchStates={fetchStates}
            onUpdateBillingAddress={handleUpdateBillingAddress}
            onPaymentComplete={handlePaymentComplete}
            processing={processing}
            setProcessing={setProcessing}
            onSessionMethodChange={setIsSessionPayment}
            errors={sectionErrors.payment}
          />
        </div>

        {!isAuthenticated && (
          <div className="mt-6">
            <PolicyConsent
              checked={policyConsent}
              onCheckedChange={(checked) => {
                setPolicyConsent(checked);
                if (checked) setPolicyError(false);
              }}
              error={policyError}
            />
          </div>
        )}

        <button
          type="button"
          onClick={validateAndPay}
          disabled={processing}
          className="mt-8 hidden h-[54px] w-full items-center justify-center gap-2 rounded-full bg-marketplace-brand text-sm font-semibold text-marketplace-brand-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 md:flex"
        >
          {processing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {paymentActionLabel}
            </>
          ) : (
            paymentActionLabel
          )}
        </button>
      </div>

      <div
        data-checkout-mobile-action
        className="fixed inset-x-0 bottom-0 z-40 border-t border-marketplace-border bg-marketplace-surface/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(40,31,42,0.08)] backdrop-blur md:hidden"
      >
        <div className="mx-auto flex max-w-lg items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-marketplace-muted-foreground">
              {hasDistinctAmountDue ? tc("amountDue") : tc("total")}
            </p>
            <p className="truncate text-lg font-semibold text-marketplace-foreground">
              {checkoutAmount}
            </p>
          </div>
          <button
            type="button"
            onClick={validateAndPay}
            disabled={processing}
            className="flex min-h-12 min-w-[52%] items-center justify-center gap-2 rounded-full bg-marketplace-brand px-5 text-sm font-semibold text-marketplace-brand-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 max-[500px]:max-h-12"
          >
            {processing ? <Loader2 className="size-4 animate-spin" /> : null}
            {paymentActionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function CheckoutPageContent(props: CheckoutPageContentProps) {
  return (
    <Suspense>
      <CheckoutPageContentInner {...props} />
    </Suspense>
  );
}
