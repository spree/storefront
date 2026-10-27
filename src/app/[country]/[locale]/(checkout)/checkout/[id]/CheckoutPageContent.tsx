"use client";

import type { Address, AddressParams, Cart, Country } from "@spree/sdk";
import { CircleAlert, Loader2 } from "lucide-react";
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
import { BuyingForSelector } from "@/components/companies/BuyingForSelector";
import { PolicyConsent } from "@/components/policy/PolicyConsent";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useCheckout } from "@/contexts/CheckoutContext";
import {
  trackAddPaymentInfo,
  trackAddShippingInfo,
  trackBeginCheckout,
} from "@/lib/analytics/gtm";
import { getAddresses, updateAddress } from "@/lib/data/addresses";
import {
  applyCode,
  getCheckoutOrder,
  removeDiscountCode,
  removeGiftCard,
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
  const tc = useTranslations("common");
  const { user, loading: authLoading } = useAuth();

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

  const cartRef = useRef(cart);
  cartRef.current = cart;
  const routerRef = useRef(router);
  routerRef.current = router;
  const tRef = useRef(t);
  tRef.current = t;
  const beginCheckoutFiredRef = useRef(false);
  const paymentRef = useRef<PaymentSectionHandle>(null);

  // Handle code application (discount code or gift card — single input field)
  const handleApplyCode = useCallback(async (code: string) => {
    const currentOrder = cartRef.current;
    if (!currentOrder)
      return { success: false, error: tRef.current("noOrder") };

    const result = await applyCode(currentOrder.id, code);
    if (result.success && result.cart) {
      setCart(result.cart);
    }
    return result;
  }, []);

  const handleRemoveDiscount = useCallback(async (discountCode: string) => {
    const currentOrder = cartRef.current;
    if (!currentOrder)
      return { success: false, error: tRef.current("noOrder") };

    const result = await removeDiscountCode(currentOrder.id, discountCode);
    if (result.success && result.cart) {
      setCart(result.cart);
    }
    return result;
  }, []);

  const handleRemoveGiftCard = useCallback(async (giftCardId: string) => {
    const currentOrder = cartRef.current;
    if (!currentOrder)
      return { success: false, error: tRef.current("noOrder") };

    const result = await removeGiftCard(currentOrder.id, giftCardId);
    if (result.success && result.cart) {
      setCart(result.cart);
    }
    return result;
  }, []);

  // useLayoutEffect so the sidebar renders on the first paint (before the
  // browser paints the empty slot). Always re-publish when `cart` changes.
  useLayoutEffect(() => {
    if (cart) {
      setSummaryContent(
        <CheckoutSidebar
          cart={cart}
          onApplyCode={handleApplyCode}
          onRemoveDiscount={handleRemoveDiscount}
          onRemoveGiftCard={handleRemoveGiftCard}
        />,
      );
    } else {
      setSummaryContent(null);
    }
  }, [
    cart,
    setSummaryContent,
    handleApplyCode,
    handleRemoveDiscount,
    handleRemoveGiftCard,
  ]);

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
    }) => {
      const currentOrder = cartRef.current;
      if (!currentOrder) return;

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
          return;
        }

        if (updateResult.cart) {
          setCart(updateResult.cart);
        }
      } catch {
        setError(tRef.current("generalError"));
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
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {t("checkoutError")}
        </h1>
        <p className="text-gray-600 mb-6">{error}</p>
        <Link
          href={`${basePath}/cart`}
          className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-700"
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
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {t("emptyCart")}
        </h1>
        <p className="text-gray-600 mb-6">{t("emptyCartDescription")}</p>
        <Link
          href={`${basePath}/products`}
          className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-700"
        >
          {tc("continueShopping")}
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Error banner */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <CircleAlert />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Express checkout for guests */}
      {!isAuthenticated && parseFloat(cart.total ?? "0") > 0 && (
        <div className={expressAvailable ? "mb-4" : ""}>
          {expressAvailable && (
            <h2 className="text-lg font-bold text-gray-900 mb-3">
              Express checkout
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

      {/* Checkout form sections — dimmed & disabled during express checkout */}
      <div
        className={
          processing
            ? "relative opacity-50 pointer-events-none select-none"
            : "relative"
        }
      >
        {/* Whose purchase this is, before the addresses it decides. */}
        <BuyingForSelector
          cartId={cart.id}
          selectedCompanyId={cart.company_id ?? null}
        />

        {/* Contact + Delivery */}
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

        {/* Shipping method */}
        <div id="checkout-section-shipping" className="mt-6">
          <DeliveryMethodSection
            fulfillments={fulfillments}
            onDeliveryRateSelect={handleDeliveryRateSelect}
            processing={processing}
            errors={sectionErrors.shipping}
          />
        </div>

        {/* Payment */}
        <div id="checkout-section-payment" className="mt-6">
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

        {/* Policy consent — guests only, authenticated users accepted at registration */}
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

        {/* Pay now button */}
        <button
          type="button"
          onClick={validateAndPay}
          disabled={processing}
          className="w-full mt-8 h-[54px] bg-black text-white text-sm font-bold rounded-sm hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {processing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {tc("processing")}
            </>
          ) : isSessionPayment ? (
            t("payNow")
          ) : (
            t("placeOrder")
          )}
        </button>
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
