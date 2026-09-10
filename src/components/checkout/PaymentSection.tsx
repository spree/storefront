"use client";

import type {
  AddressParams,
  Cart,
  Country,
  PaymentMethod,
  CreditCard as SpreeCreditCard,
  State,
} from "@spree/sdk";
import { CircleAlert, CreditCard, Info, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  type Ref,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { PaymentIcon } from "react-svg-credit-card-payment-icons";
import { AddressFormFields } from "@/components/checkout/AddressFormFields";
import {
  AdyenPaymentForm,
  type AdyenPaymentFormHandle,
} from "@/components/checkout/AdyenPaymentForm";
import {
  PayPalPaymentForm,
  type PayPalPaymentFormHandle,
} from "@/components/checkout/PayPalPaymentForm";
import {
  RazorpayPaymentForm,
  type RazorpayPaymentFormHandle,
} from "@/components/checkout/RazorpayPaymentForm";
import {
  confirmWithSavedCard,
  StripePaymentForm,
  type StripePaymentFormHandle,
} from "@/components/checkout/StripePaymentForm";

import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useCountryStates } from "@/hooks/useCountryStates";
import { getCreditCards } from "@/lib/data/credit-cards";
import {
  createCheckoutPaymentSession,
  createDirectPayment,
  updateCheckoutPaymentSession,
} from "@/lib/data/payment";
import {
  type AddressFormData,
  addressToFormData,
  formDataToAddress,
  updateAddressField,
} from "@/lib/utils/address";
import { getCardIconType, getCardLabel } from "@/lib/utils/credit-card";
import { extractBasePath } from "@/lib/utils/path";
import { resolveGatewayId } from "@/lib/utils/payment-gateway";

export type PaymentCompleteResult =
  | { type: "session"; sessionId: string; sessionResult?: string }
  | { type: "direct" };

export interface PaymentSectionHandle {
  submit: () => Promise<{ error?: string }>;
}

interface PaymentSectionProps {
  ref?: Ref<PaymentSectionHandle>;
  cart: Cart;
  countries: Country[];
  isAuthenticated: boolean;
  fetchStates: (countryIso: string) => Promise<State[]>;
  onUpdateBillingAddress: (data: {
    billing_address?: AddressParams;
    use_shipping?: boolean;
  }) => Promise<boolean>;
  onPaymentComplete: (result: PaymentCompleteResult) => Promise<void>;
  processing: boolean;
  setProcessing: (processing: boolean) => void;
  onSessionMethodChange?: (isSessionBased: boolean) => void;
  errors?: string[];
}

export function PaymentSection({
  ref,
  cart,
  countries,
  isAuthenticated,
  fetchStates,
  onUpdateBillingAddress,
  onPaymentComplete,
  processing,
  setProcessing,
  onSessionMethodChange,
  errors,
}: PaymentSectionProps) {
  const t = useTranslations("checkout");

  // ── Payment methods from Spree ──────────────────────────────────────
  const paymentMethods = cart.payment_methods ?? [];
  const hasMultipleMethods = paymentMethods.length > 1;

  // Default to the first method; fall back if the stored ID becomes stale
  // (e.g. cart.payment_methods changes after a shipping update).
  const [selectedMethodId, setSelectedMethodId] = useState<string>(
    () => paymentMethods[0]?.id ?? "",
  );
  const selectedMethod: PaymentMethod | undefined =
    paymentMethods.find((pm) => pm.id === selectedMethodId) ??
    paymentMethods[0];
  const effectiveSelectedMethodId = selectedMethod?.id ?? "";
  // Zero-amount check. A null amount (money fields are nullable for
  // prices-hidden guests) must NOT read as zero — that would complete
  // checkout with no payment. Only a real numeric 0 is a free order;
  // an unknown amount falls through to the normal payment path.
  const rawAmountDue = cart.amount_due ?? cart.total;
  const amountDue =
    rawAmountDue == null ? Number.NaN : parseFloat(rawAmountDue);
  const isZeroAmount = Number.isFinite(amountDue) && amountDue === 0;

  // Free orders are always treated as non-session (no payment needed)
  const isSessionBased =
    !isZeroAmount && (selectedMethod?.session_required ?? false);

  // Notify parent when session method changes (for button text)
  const onSessionMethodChangeRef = useRef(onSessionMethodChange);
  onSessionMethodChangeRef.current = onSessionMethodChange;

  const prevIsSessionRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (prevIsSessionRef.current === isSessionBased) return;
    prevIsSessionRef.current = isSessionBased;
    onSessionMethodChangeRef.current?.(isSessionBased);
  }, [isSessionBased]);

  // ── Billing address ─────────────────────────────────────────────────
  const shipAddressData = useMemo(
    () => addressToFormData(cart.shipping_address),
    [cart.shipping_address],
  );
  const billAddressData = useMemo(
    () => addressToFormData(cart.billing_address),
    [cart.billing_address],
  );
  const initialUseShipping =
    !cart.billing_address || cart.shipping_eq_billing_address;

  const [billAddress, setBillAddress] = useState<AddressFormData>(
    initialUseShipping ? shipAddressData : billAddressData,
  );
  const [useShippingForBilling, setUseShippingForBilling] =
    useState(initialUseShipping);

  // ── Saved cards (session-based gateways only) ───────────────────────
  const [savedCards, setSavedCards] = useState<SpreeCreditCard[]>([]);
  // null = "add new payment method", string = gateway_payment_profile_id
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  // ── Payment gateway state (session-based) ───────────────────────────
  // Stores the raw external_data from the Spree PaymentSession.
  // Each gateway form extracts what it needs (e.g. client_secret for Stripe,
  // session_id + session_data for Adyen).
  const [sessionExternalData, setSessionExternalData] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [paymentSessionId, setPaymentSessionId] = useState<string | null>(null);
  const [gatewayError, setGatewayError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const gatewayHandleRef = useRef<
    | StripePaymentFormHandle
    | AdyenPaymentFormHandle
    | PayPalPaymentFormHandle
    | RazorpayPaymentFormHandle
    | null
  >(null);

  const initRef = useRef(false);
  const sessionRequestIdRef = useRef(0);
  const completionInFlightRef = useRef(false);

  const handleGatewayReady = useCallback(
    (
      handle:
        | StripePaymentFormHandle
        | AdyenPaymentFormHandle
        | PayPalPaymentFormHandle
        | RazorpayPaymentFormHandle,
    ) => {
      gatewayHandleRef.current = handle;
    },
    [],
  );

  // ── Session management ──────────────────────────────────────────────
  const createSession = useCallback(
    async (cardId: string | null, method: PaymentMethod) => {
      const currentGatewayId = resolveGatewayId(method.type);
      const requestId = ++sessionRequestIdRef.current;

      setLoading(true);
      setGatewayError(null);
      setSessionExternalData(null);
      setPaymentSessionId(null);
      gatewayHandleRef.current = null;

      try {
        // Build gateway-specific external_data
        const basePath = extractBasePath(window.location.pathname);
        const returnUrl = `${window.location.origin}${basePath}/confirm-payment/${cart.id}`;

        const externalData: Record<string, unknown> = {
          return_url: returnUrl,
        };

        if (currentGatewayId === "stripe" && cardId) {
          externalData.stripe_payment_method_id = cardId;
        }

        const result = await createCheckoutPaymentSession(
          cart.id,
          method.id,
          externalData,
        );

        if (requestId !== sessionRequestIdRef.current) return;

        if (result.success && result.session) {
          const extData = result.session.external_data;
          if (extData && Object.keys(extData).length > 0) {
            // Include external_id so gateway forms can access the
            // provider-side session/order ID (e.g. Adyen session ID).
            setSessionExternalData({
              ...extData,
              _external_id: result.session.external_id,
            });
            setPaymentSessionId(result.session.id);
          } else {
            setGatewayError(t("failedToInitPayment"));
          }
        } else if (!result.success) {
          setGatewayError(result.error || t("failedToCreateSession"));
        }
      } catch {
        if (requestId !== sessionRequestIdRef.current) return;
        setGatewayError(t("failedToInitPayment"));
      } finally {
        if (requestId === sessionRequestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [cart.id, t],
  );

  // Track the cart total so we can recreate the session when it changes
  const lastTotalRef = useRef<string | null>(null);
  const selectedCardRef = useRef<string | null>(null);

  // On mount: load saved cards (if authenticated + session method), then create initial session
  useEffect(() => {
    if (initRef.current) return;
    if (!selectedMethod) return;
    if (isZeroAmount) return;
    if (!isSessionBased) return;

    initRef.current = true;

    const init = async () => {
      setLoading(true);

      let initialCardId: string | null = null;

      if (isAuthenticated) {
        try {
          const result = await getCreditCards();
          const gatewayCards = result.data.filter(
            (card) => card.gateway_payment_profile_id,
          );
          setSavedCards(gatewayCards);

          if (gatewayCards.length > 0) {
            const defaultCard =
              gatewayCards.find((c) => c.default) || gatewayCards[0];
            initialCardId = defaultCard.gateway_payment_profile_id;
            setSelectedCardId(initialCardId);
          }
        } catch {
          // Cards failed to load — proceed without saved cards
        }
      }

      selectedCardRef.current = initialCardId;
      lastTotalRef.current = cart.total;

      await createSession(initialCardId, selectedMethod);
    };

    init();
  }, [
    selectedMethod,
    isSessionBased,
    isAuthenticated,
    createSession,
    cart.total,
    isZeroAmount,
  ]);

  // When the cart total changes, sync the live payment session with the
  // provider in place. Recreating it instead would unmount the gateway form
  // (fresh session ⇒ new client secret ⇒ new `key`) and silently wipe
  // whatever the customer already typed — e.g. when a shipping-rate save
  // lands while they enter card details.
  useEffect(() => {
    if (!initRef.current) return;
    if (!isSessionBased || !selectedMethod) return;
    if (lastTotalRef.current === cart.total) return;

    lastTotalRef.current = cart.total;

    if (!paymentSessionId) {
      createSession(selectedCardRef.current, selectedMethod);
      return;
    }

    const method = selectedMethod;
    const sync = async () => {
      try {
        const result = await updateCheckoutPaymentSession(
          cart.id,
          paymentSessionId,
          { amount: cart.total ?? undefined },
        );
        if (!result.success || !result.session) {
          throw new Error("session update rejected");
        }
        // Providers that can't update in place hand back fresh identifiers;
        // adopting them remounts the form (the `key` changes), which is the
        // unavoidable case. Identical data keeps the mounted form untouched.
        const extData = result.session.external_data;
        if (extData && Object.keys(extData).length > 0) {
          const next = {
            ...extData,
            _external_id: result.session.external_id,
          };
          setSessionExternalData((prev) =>
            JSON.stringify(prev) === JSON.stringify(next) ? prev : next,
          );
          setPaymentSessionId(result.session.id);
        }
      } catch {
        // Gateway doesn't support in-place updates — fall back to the
        // destructive recreate rather than paying against a stale amount.
        createSession(selectedCardRef.current, method);
      }
    };
    sync();
  }, [
    cart.id,
    cart.total,
    createSession,
    isSessionBased,
    paymentSessionId,
    selectedMethod,
  ]);

  const [billStates, isPendingBill] = useCountryStates(
    billAddress.country_iso,
    fetchStates,
    !useShippingForBilling,
  );

  const handleUseShippingChange = (checked: boolean) => {
    setUseShippingForBilling(checked);
    if (checked) {
      setBillAddress(shipAddressData);
    }
  };

  const handleCardSelect = (cardId: string | null) => {
    if (cardId === selectedCardId) return;
    if (!selectedMethod) return;
    setSelectedCardId(cardId);
    selectedCardRef.current = cardId;
    createSession(cardId, selectedMethod);
  };

  const handleMethodSelect = (methodId: string) => {
    if (methodId === selectedMethodId) return;
    setSelectedMethodId(methodId);

    const newMethod = paymentMethods.find((pm) => pm.id === methodId);
    if (!newMethod) return;

    if (newMethod.session_required) {
      // Switching to a session-based method: create session
      // Reset saved cards state — will be re-initialized
      if (!initRef.current) {
        initRef.current = true;
        const init = async () => {
          setLoading(true);
          let cardId: string | null = null;

          if (isAuthenticated) {
            try {
              const result = await getCreditCards();
              const gatewayCards = result.data.filter(
                (card) => card.gateway_payment_profile_id,
              );
              setSavedCards(gatewayCards);
              if (gatewayCards.length > 0) {
                const defaultCard =
                  gatewayCards.find((c) => c.default) || gatewayCards[0];
                cardId = defaultCard.gateway_payment_profile_id;
                setSelectedCardId(cardId);
              }
            } catch {
              // proceed without saved cards
            }
          }

          selectedCardRef.current = cardId;
          lastTotalRef.current = cart.total;
          await createSession(cardId, newMethod);
        };
        init();
      } else {
        createSession(selectedCardRef.current, newMethod);
      }
    } else {
      // Switching to a direct method: invalidate any in-flight session
      // request so a late-resolving createSession won't repopulate state.
      sessionRequestIdRef.current += 1;
      setSessionExternalData(null);
      setPaymentSessionId(null);
      setGatewayError(null);
      gatewayHandleRef.current = null;
      setLoading(false);
    }
  };

  const updateBillAddress = (field: keyof AddressFormData, value: string) => {
    setBillAddress((prev) => updateAddressField(prev, field, value));
  };

  // ── Auto-complete after gateway approval (PayPal popup / Adyen sessions) ──
  const handleGatewayApproved = useCallback(
    async (sessionResult?: string) => {
      if (completionInFlightRef.current) return;
      if (!paymentSessionId) return;

      completionInFlightRef.current = true;
      setProcessing(true);
      setGatewayError(null);

      try {
        // Update billing address
        let addressSuccess: boolean;
        if (useShippingForBilling) {
          addressSuccess = await onUpdateBillingAddress({
            use_shipping: true,
          });
        } else {
          const billingData = formDataToAddress(billAddress);
          addressSuccess = await onUpdateBillingAddress({
            billing_address: billingData,
          });
        }

        if (!addressSuccess) {
          setProcessing(false);
          completionInFlightRef.current = false;
          setGatewayError(t("failedToSaveBilling"));
          return;
        }

        await onPaymentComplete({
          type: "session",
          sessionId: paymentSessionId,
          sessionResult,
        });
      } catch {
        setGatewayError(t("paymentError"));
        setProcessing(false);
        completionInFlightRef.current = false;
      }
    },
    [
      paymentSessionId,
      useShippingForBilling,
      billAddress,
      onUpdateBillingAddress,
      onPaymentComplete,
      setProcessing,
      t,
    ],
  );

  // ── Submit ──────────────────────────────────────────────────────────
  useImperativeHandle(
    ref,
    () => ({
      submit: async () => {
        if (completionInFlightRef.current) return {};
        completionInFlightRef.current = true;

        try {
          // Zero amount — no payment needed
          if (isZeroAmount) {
            setProcessing(true);
            try {
              // Still update billing address
              let addressSuccess: boolean;
              if (useShippingForBilling) {
                addressSuccess = await onUpdateBillingAddress({
                  use_shipping: true,
                });
              } else {
                const billingData = formDataToAddress(billAddress);
                addressSuccess = await onUpdateBillingAddress({
                  billing_address: billingData,
                });
              }
              if (!addressSuccess) {
                setProcessing(false);
                return { error: t("failedToSaveBilling") };
              }
              await onPaymentComplete({ type: "direct" });
              return {};
            } catch {
              const msg = t("paymentError");
              setProcessing(false);
              return { error: msg };
            }
          }

          if (!selectedMethod) {
            return { error: t("selectPaymentMethod") };
          }

          setProcessing(true);
          setGatewayError(null);

          try {
            // 1. Update billing address
            let addressSuccess: boolean;
            if (useShippingForBilling) {
              addressSuccess = await onUpdateBillingAddress({
                use_shipping: true,
              });
            } else {
              const billingData = formDataToAddress(billAddress);
              addressSuccess = await onUpdateBillingAddress({
                billing_address: billingData,
              });
            }

            if (!addressSuccess) {
              setProcessing(false);
              return { error: t("failedToSaveBilling") };
            }

            // 2. Process payment based on method type
            if (selectedMethod.session_required) {
              // Session-based flow (Stripe, Adyen, etc.)
              if (!paymentSessionId || !sessionExternalData) {
                setProcessing(false);
                return { error: t("failedToInitPayment") };
              }
              const basePath = extractBasePath(window.location.pathname);
              const returnUrl = `${window.location.origin}${basePath}/confirm-payment/${cart.id}?session=${paymentSessionId}`;

              let error: string | undefined;

              const clientSecret = sessionExternalData.client_secret as
                | string
                | undefined;
              const gatewayId = resolveGatewayId(selectedMethod.type);
              const isStripe = gatewayId === "stripe";

              // --- ADDED RAZORPAY TO APPROVAL FLAG ---
              const isApprovalDriven =
                gatewayId === "adyen" ||
                gatewayId === "paypal" ||
                gatewayId === "razorpay";
              // ---------------------------------------

              const canUseSavedCard =
                isStripe && Boolean(selectedCardId && clientSecret);

              if (!canUseSavedCard && !gatewayHandleRef.current) {
                setProcessing(false);
                return { error: t("failedToInitPayment") };
              }

              if (canUseSavedCard) {
                // Stripe saved card flow
                const result = await confirmWithSavedCard(
                  clientSecret!,
                  selectedCardId!,
                  returnUrl,
                );
                error = result.error;
              } else {
                // New payment via gateway handle (Stripe PaymentElement, Adyen Drop-in, etc.)
                const result =
                  await gatewayHandleRef.current!.confirmPayment(returnUrl);
                error = result.error;
              }

              if (error) {
                setGatewayError(error);
                setProcessing(false);
                return { error };
              }

              // Approval-driven gateways (Adyen, PayPal, Razorpay) complete the order
              // via handleGatewayApproved when their callback fires — don't
              // call onPaymentComplete here or we'll race with the callback.
              if (isApprovalDriven) {
                return {};
              }

              await onPaymentComplete({
                type: "session",
                sessionId: paymentSessionId,
              });
              return {};
            }

            // Direct payment flow (Check, Cash on Delivery, etc.)
            const paymentResult = await createDirectPayment(
              cart.id,
              selectedMethod.id,
            );
            if (!paymentResult.success) {
              const msg = paymentResult.error || t("failedToCreatePayment");
              setGatewayError(msg);
              setProcessing(false);
              return { error: msg };
            }

            await onPaymentComplete({ type: "direct" });
            return {};
          } catch {
            const msg = t("paymentError");
            setGatewayError(msg);
            setProcessing(false);
            return { error: msg };
          }
        } finally {
          completionInFlightRef.current = false;
        }
      },
    }),
    [
      isZeroAmount,
      selectedMethod,
      paymentSessionId,
      sessionExternalData,
      selectedCardId,
      useShippingForBilling,
      billAddress,
      onUpdateBillingAddress,
      onPaymentComplete,
      cart.id,
      setProcessing,
      t,
    ],
  );

  const isAddingNew = selectedCardId === null;

  // ── Zero amount: no payment required ────────────────────────────────
  if (isZeroAmount) {
    return (
      <div>
        <h2 className="text-lg font-bold text-gray-900">
          {t("paymentMethod")}
        </h2>
        <div className="mt-2 rounded-sm border bg-gray-50 px-4 py-6 text-center">
          <Info
            className="w-8 h-8 text-gray-300 mx-auto mb-2"
            strokeWidth={1.5}
          />
          <p className="text-sm text-gray-600">{t("noPaymentRequired")}</p>
        </div>

        {/* Billing address */}
        <div className="mt-4">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <Checkbox
              checked={useShippingForBilling}
              onCheckedChange={(checked) =>
                handleUseShippingChange(checked === true)
              }
            />
            <span className="text-sm text-gray-900">{t("sameAsShipping")}</span>
          </label>
          {!useShippingForBilling && (
            <div className="mt-4">
              <AddressFormFields
                address={billAddress}
                countries={countries}
                states={billStates}
                loadingStates={isPendingBill}
                onChange={updateBillAddress}
                idPrefix="bill"
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── No payment methods available ────────────────────────────────────
  if (paymentMethods.length === 0) {
    return (
      <div>
        <h2 className="text-lg font-bold text-gray-900">
          {t("paymentMethod")}
        </h2>
        <div className="mt-2 rounded-sm border bg-gray-50 px-4 py-8 text-center">
          <CreditCard
            className="w-10 h-10 text-gray-300 mx-auto mb-3"
            strokeWidth={1.5}
          />
          <p className="text-sm text-gray-500">{t("noPaymentMethods")}</p>
        </div>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <div>
      {/* Section Header */}
      <h2 className="text-lg font-bold text-gray-900">{t("paymentMethod")}</h2>
      <p className="text-sm text-gray-500 mt-0.5">{t("secureTransactions")}</p>

      {/* Inline requirement errors from parent */}
      {errors && errors.length > 0 && (
        <div className="rounded-sm border border-red-300 bg-red-50 px-4 py-3 mb-3 mt-2">
          {errors.map((err, i) => (
            <p key={i} className="text-sm text-red-700">
              {err}
            </p>
          ))}
        </div>
      )}

      {/* Payment methods */}
      <RadioGroup
        value={effectiveSelectedMethodId}
        onValueChange={handleMethodSelect}
        className="rounded-sm border overflow-hidden gap-0 mt-3"
      >
        {paymentMethods.map((pm, index) => {
          const isSelected = pm.id === effectiveSelectedMethodId;
          const pmGatewayId = pm.session_required
            ? resolveGatewayId(pm.type)
            : null;

          return (
            <div key={pm.id}>
              {/* Method header row */}
              {hasMultipleMethods && (
                <label
                  className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors ${
                    isSelected ? "bg-blue-50" : "bg-white hover:bg-gray-50"
                  } ${index > 0 ? "border-t" : ""}`}
                >
                  <RadioGroupItem value={pm.id} />
                  <span className="text-sm font-medium text-gray-900">
                    {pm.name}
                  </span>
                </label>
              )}

              {/* Single method header (no radio, like current behavior) */}
              {!hasMultipleMethods && (
                <div className="flex items-center justify-between px-4 py-3.5 bg-blue-50">
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value={pm.id} />
                    <span className="text-sm font-medium text-gray-900">
                      {pm.name}
                    </span>
                  </div>
                </div>
              )}

              {/* Sub-form for the selected method */}
              {isSelected && (
                <div className="border-t bg-gray-50">
                  {pm.session_required ? (
                    <>
                      {/* Stripe: saved cards selector */}
                      {pmGatewayId === "stripe" && (
                        <>
                          {/* Demo-only test card note */}
                          <p className="text-xs text-gray-400 px-4 pt-3">
                            {t("testCardNote", {
                              testCard: "4242 4242 4242 4242",
                            })}
                          </p>

                          {savedCards.length > 0 && (
                            <div className="px-4 pt-3">
                              <RadioGroup
                                value={selectedCardId ?? "__new__"}
                                onValueChange={(val) =>
                                  handleCardSelect(
                                    val === "__new__" ? null : val,
                                  )
                                }
                                className="gap-0 rounded-sm border overflow-hidden"
                              >
                                {savedCards.map((card, cardIndex) => (
                                  <label
                                    key={card.id}
                                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                                      selectedCardId ===
                                      card.gateway_payment_profile_id
                                        ? "bg-white"
                                        : "bg-white hover:bg-gray-50"
                                    } ${cardIndex > 0 ? "border-t" : ""}`}
                                  >
                                    <RadioGroupItem
                                      value={
                                        card.gateway_payment_profile_id ??
                                        card.id
                                      }
                                    />
                                    <PaymentIcon
                                      type={getCardIconType(card.brand)}
                                      format="flatRounded"
                                      width={34}
                                    />
                                    <span className="text-sm text-gray-900 flex-1">
                                      {t("savedCardLabel", {
                                        brand: getCardLabel(card.brand),
                                        digits: card.last4,
                                      })}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {t("cardExpiry", {
                                        month: String(card.month).padStart(
                                          2,
                                          "0",
                                        ),
                                        year: String(card.year),
                                      })}
                                    </span>
                                    {card.default && (
                                      <span className="text-[11px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                        {t("default")}
                                      </span>
                                    )}
                                  </label>
                                ))}

                                {/* Add new card */}
                                <label
                                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-t transition-colors ${
                                    isAddingNew
                                      ? "bg-white"
                                      : "bg-white hover:bg-gray-50"
                                  }`}
                                >
                                  <RadioGroupItem value="__new__" />
                                  <CreditCard
                                    className="w-5 h-5 text-gray-400"
                                    strokeWidth={1.5}
                                  />
                                  <span className="text-sm text-gray-900">
                                    {t("addNewPaymentMethod")}
                                  </span>
                                </label>
                              </RadioGroup>
                            </div>
                          )}
                        </>
                      )}

                      {/* Shared: loading spinner */}
                      {loading && (
                        <div className="flex items-center justify-center py-10">
                          <Loader2 className="animate-spin h-5 w-5 text-gray-400" />
                          <span className="ml-2 text-sm text-gray-500">
                            {t("loadingPaymentForm")}
                          </span>
                        </div>
                      )}

                      {/* Shared: gateway error */}
                      {gatewayError && !loading && (
                        <div className="px-4 py-3">
                          <div className="rounded-sm border border-red-300 bg-red-50 px-4 py-3">
                            <p className="text-sm text-red-700 flex items-center gap-2">
                              <CircleAlert className="h-4 w-4 flex-shrink-0" />
                              {gatewayError}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Gateway-specific payment form */}
                      {!loading &&
                        sessionExternalData &&
                        (() => {
                          const ext = sessionExternalData;
                          switch (pmGatewayId) {
                            case "stripe": {
                              const secret = ext.client_secret as
                                | string
                                | undefined;
                              return (
                                secret &&
                                isAddingNew && (
                                  <div className="p-4">
                                    <StripePaymentForm
                                      key={secret}
                                      clientSecret={secret}
                                      onReady={handleGatewayReady}
                                    />
                                  </div>
                                )
                              );
                            }
                            case "adyen": {
                              const sid = ext._external_id as
                                | string
                                | undefined;
                              const sdata = ext.session_data as
                                | string
                                | undefined;
                              return sid && sdata ? (
                                <div className="p-4">
                                  <AdyenPaymentForm
                                    key={sid}
                                    sessionId={sid}
                                    sessionData={sdata}
                                    onReady={handleGatewayReady}
                                    onApproved={handleGatewayApproved}
                                  />
                                </div>
                              ) : null;
                            }
                            case "paypal": {
                              const orderId = ext.id as string | undefined;
                              return orderId ? (
                                <div className="p-4">
                                  <PayPalPaymentForm
                                    key={orderId}
                                    paypalOrderId={orderId}
                                    currency={cart.currency}
                                    onReady={handleGatewayReady}
                                    onApproved={handleGatewayApproved}
                                  />
                                </div>
                              ) : null;
                            }
                            case "razorpay": {
                              return ext ? (
                                <div className="p-4">
                                  <RazorpayPaymentForm
                                    key={ext._external_id as string}
                                    sessionData={ext}
                                    cart={cart}
                                    onReady={handleGatewayReady}
                                    onApproved={handleGatewayApproved}
                                  />
                                </div>
                              ) : null;
                            }
                            default:
                              return (
                                <div className="px-4 py-6 text-center">
                                  <Info
                                    className="w-8 h-8 text-gray-300 mx-auto mb-2"
                                    strokeWidth={1.5}
                                  />
                                  <p className="text-sm text-gray-500">
                                    {t("unsupportedGateway")}
                                  </p>
                                </div>
                              );
                          }
                        })()}
                    </>
                  ) : (
                    /* ── Direct/manual payment ── */
                    <div className="px-4 py-4">
                      {pm.description && (
                        <p className="text-sm text-gray-600 mb-2">
                          {pm.description}
                        </p>
                      )}
                      <p className="text-sm text-gray-500">
                        {t("manualPaymentInfo")}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </RadioGroup>

      {/* Billing address — below payment box */}
      <div className="mt-4">
        <label className="flex items-center gap-2.5 cursor-pointer">
          <Checkbox
            checked={useShippingForBilling}
            onCheckedChange={(checked) =>
              handleUseShippingChange(checked === true)
            }
          />
          <span className="text-sm text-gray-900">{t("sameAsShipping")}</span>
        </label>

        {!useShippingForBilling && (
          <div className="mt-4">
            <AddressFormFields
              address={billAddress}
              countries={countries}
              states={billStates}
              loadingStates={isPendingBill}
              onChange={updateBillAddress}
              idPrefix="bill"
            />
          </div>
        )}
      </div>
    </div>
  );
}
