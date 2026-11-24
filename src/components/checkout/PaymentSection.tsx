"use client";

import type {
  Cart,
  CartAddressParams,
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
  useLayoutEffect,
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
  type PayPalApprovalOutcome,
  PayPalPaymentForm,
  type PayPalPaymentFormHandle,
} from "@/components/checkout/PayPalPaymentForm";
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
  getCheckoutPaymentSession,
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
import {
  adyenMinorUnits,
  paypalClientId,
  resolveGatewayId,
} from "@/lib/utils/payment-gateway";

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
  /** Resolves to the re-priced cart, or null when the address was not saved. */
  onUpdateBillingAddress: (data: {
    billing_address?: CartAddressParams;
    use_shipping?: boolean;
  }) => Promise<Cart | null>;
  /** Resolves true once the order is placed, false when completion failed. */
  onPaymentComplete: (result: PaymentCompleteResult) => Promise<boolean>;
  processing: boolean;
  setProcessing: (processing: boolean) => void;
  onSessionMethodChange?: (isSessionBased: boolean) => void;
  errors?: string[];
}

function amountDueOf(cart: Cart): string | null {
  return cart.amount_due ?? cart.total;
}

function sameAmount(
  left: string | null | undefined,
  right: string | null | undefined,
): boolean {
  if (left == null || right == null) return (left ?? null) === (right ?? null);
  return parseFloat(left) === parseFloat(right);
}

/** What a payment session holds once Spree has answered for it. */
interface SessionSnapshot {
  /** The amount it charges, or that its PayPal order was created for. */
  amount: string | null;
  /** Its provider data, as the gateway form receives it. */
  data: string;
}

/**
 * The saved cards one payment method can charge. The list holds every
 * gateway's cards, and a card saved with another gateway fails there. A
 * backend that does not name the card's method keeps the whole list.
 */
function cardsForMethod(
  cards: SpreeCreditCard[],
  method: PaymentMethod | undefined,
): SpreeCreditCard[] {
  return cards.filter((card) => {
    // Typed here because SDK releases before the field was added omit it.
    const methodId = (
      card as SpreeCreditCard & { payment_method_id?: string | null }
    ).payment_method_id;
    return (
      card.gateway_payment_profile_id && (!methodId || methodId === method?.id)
    );
  });
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
  const rawAmountDue = amountDueOf(cart);
  // The latest amount due, for checks made after an await.
  const amountDueRef = useRef(rawAmountDue);
  useLayoutEffect(() => {
    amountDueRef.current = rawAmountDue;
  }, [rawAmountDue]);
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
  // Every saved card, once loaded; each method shows only its own.
  const allCardsRef = useRef<SpreeCreditCard[] | null>(null);
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
  // Written with the state, so a submit resuming after an await can tell
  // whether the session it started with is still the current one.
  const currentSessionIdRef = useRef<string | null>(null);
  const sessionSnapshotsRef = useRef(new Map<string, SessionSnapshot>());
  const adoptSessionId = useCallback((sessionId: string | null): void => {
    currentSessionIdRef.current = sessionId;
    for (const heldId of sessionSnapshotsRef.current.keys()) {
      if (heldId !== sessionId) sessionSnapshotsRef.current.delete(heldId);
    }
    setPaymentSessionId(sessionId);
  }, []);
  const [gatewayError, setGatewayError] = useState<string | null>(null);
  // Set when saving the billing address re-priced the cart. Kept apart from
  // gatewayError, which a new session clears and which shows only under a
  // session-based method, so the buyer sees why nothing was charged.
  const [totalNotice, setTotalNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const gatewayHandleRef = useRef<
    | StripePaymentFormHandle
    | AdyenPaymentFormHandle
    | PayPalPaymentFormHandle
    | null
  >(null);
  const initRef = useRef(false);
  // Request ID of a saved-card init still loading cards (pending only while
  // it matches sessionRequestIdRef; any newer session request supersedes it).
  const pendingInitRequestIdRef = useRef<number | null>(null);
  const sessionRequestIdRef = useRef(0);
  const completionInFlightRef = useRef(false);

  const handleGatewayReady = useCallback(
    (
      handle:
        | StripePaymentFormHandle
        | AdyenPaymentFormHandle
        | PayPalPaymentFormHandle,
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
      adoptSessionId(null);
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

        // A new session defaults to the amount due when it is created.
        const requestedAmount = amountDueRef.current;
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
            const data = {
              ...extData,
              _external_id: result.session.external_id,
            };
            sessionSnapshotsRef.current.set(result.session.id, {
              amount: result.session.amount ?? requestedAmount,
              data: JSON.stringify(data),
            });
            setSessionExternalData(data);
            adoptSessionId(result.session.id);
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
    [adoptSessionId, cart.id, t],
  );

  // Track the cart total so we can recreate the session when it changes
  const lastTotalRef = useRef<string | null>(null);
  const selectedCardRef = useRef<string | null>(null);
  // The amount update in flight, resolving true once the current session
  // holds the new amount; a payment submit waits for it.
  const amountSyncRef = useRef<Promise<boolean> | null>(null);

  // Load saved cards (if authenticated), then create the first session for
  // `method`. Loading cards is async, so the shopper may pick another method
  // (or something else may start a session) in the meantime; claiming a
  // request ID up front lets us detect that and drop the stale init instead
  // of overwriting the newer selection's session.
  const initSessionWithSavedCards = useCallback(
    async (method: PaymentMethod) => {
      const initRequestId = ++sessionRequestIdRef.current;
      pendingInitRequestIdRef.current = initRequestId;
      // Record the amount due now so the total-sync effect doesn't start a
      // competing session while saved cards are still loading.
      lastTotalRef.current = rawAmountDue;

      setLoading(true);
      setGatewayError(null);
      setSessionExternalData(null);
      adoptSessionId(null);
      gatewayHandleRef.current = null;

      let cardId: string | null = null;
      let methodCards: SpreeCreditCard[] = [];

      if (isAuthenticated) {
        try {
          const result = await getCreditCards();
          allCardsRef.current = result.data;
          methodCards = cardsForMethod(result.data, method);
          if (methodCards.length > 0) {
            const defaultCard =
              methodCards.find((c) => c.default) || methodCards[0];
            cardId = defaultCard.gateway_payment_profile_id;
          }
        } catch {
          // Cards failed to load — proceed without saved cards
        }
      }

      // Superseded by a newer method selection or session request.
      if (initRequestId !== sessionRequestIdRef.current) return;

      // This method's cards only: another method's would be charged where
      // they were never saved.
      setSavedCards(methodCards);
      setSelectedCardId(cardId);
      selectedCardRef.current = cardId;
      await createSession(cardId, method);
    },
    [rawAmountDue, adoptSessionId, createSession, isAuthenticated],
  );

  // On mount: load saved cards (if authenticated + session method), then create initial session
  useEffect(() => {
    if (initRef.current) return;
    if (!selectedMethod) return;
    if (isZeroAmount) return;
    if (!isSessionBased) return;

    initRef.current = true;
    initSessionWithSavedCards(selectedMethod);
  }, [selectedMethod, isSessionBased, initSessionWithSavedCards, isZeroAmount]);

  // Moves the live session to `requestedAmount`, in place when the provider
  // allows it. A payment submit waits for the update through amountSyncRef.
  const syncSessionAmount = useCallback(
    (
      sessionId: string,
      requestedAmount: string | null,
      method: PaymentMethod,
    ): void => {
      // Tie this sync to the session it updates: if the shopper switches
      // methods (or another session request starts) before it resolves, its
      // result must not overwrite the newer session.
      const syncRequestId = sessionRequestIdRef.current;
      const sync = async (): Promise<boolean> => {
        try {
          // What a new session defaults to: the total less store credit.
          const result = await updateCheckoutPaymentSession(
            cart.id,
            sessionId,
            { amount: requestedAmount ?? undefined },
          );
          if (syncRequestId !== sessionRequestIdRef.current) return false;
          if (!result.success || !result.session) {
            throw new Error("session update rejected");
          }
          // Providers that can't update in place hand back fresh identifiers;
          // adopting them remounts the form (the `key` changes), which is the
          // unavoidable case. Identical data keeps the mounted form untouched.
          const extData = result.session.external_data;
          const amount = result.session.amount ?? requestedAmount;
          if (extData && Object.keys(extData).length > 0) {
            const next = {
              ...extData,
              _external_id: result.session.external_id,
            };
            sessionSnapshotsRef.current.set(result.session.id, {
              amount,
              data: JSON.stringify(next),
            });
            setSessionExternalData((prev) =>
              JSON.stringify(prev) === JSON.stringify(next) ? prev : next,
            );
            adoptSessionId(result.session.id);
          } else {
            const held = sessionSnapshotsRef.current.get(sessionId);
            if (held) {
              sessionSnapshotsRef.current.set(sessionId, { ...held, amount });
            }
          }
          return true;
        } catch {
          if (syncRequestId !== sessionRequestIdRef.current) return false;
          // Gateway doesn't support in-place updates — fall back to the
          // destructive recreate rather than paying against a stale amount.
          createSession(selectedCardRef.current, method);
          return false;
        }
      };
      const syncing = sync().finally(() => {
        if (amountSyncRef.current === syncing) amountSyncRef.current = null;
      });
      amountSyncRef.current = syncing;
    },
    [adoptSessionId, cart.id, createSession],
  );

  // When the cart total changes, sync the live payment session with the
  // provider in place. Recreating it instead would unmount the gateway form
  // (fresh session ⇒ new client secret ⇒ new `key`) and silently wipe
  // whatever the customer already typed — e.g. when a shipping-rate save
  // lands while they enter card details.
  useEffect(() => {
    if (!initRef.current) return;
    if (!isSessionBased || !selectedMethod) return;
    // Saved-card init is still loading and will create the session against
    // the server's current total; recreating it now would supersede the init
    // and drop the saved default card. Once the session exists this effect
    // re-runs (paymentSessionId changes) and syncs any difference in place.
    if (pendingInitRequestIdRef.current === sessionRequestIdRef.current) return;
    if (lastTotalRef.current === rawAmountDue) return;

    lastTotalRef.current = rawAmountDue;

    if (!paymentSessionId) {
      createSession(selectedCardRef.current, selectedMethod);
      return;
    }

    syncSessionAmount(paymentSessionId, rawAmountDue, selectedMethod);
  }, [
    rawAmountDue,
    createSession,
    isSessionBased,
    paymentSessionId,
    selectedMethod,
    syncSessionAmount,
  ]);

  const [billStates, isPendingBill] = useCountryStates(
    billAddress.country_code,
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
      if (!initRef.current) {
        initRef.current = true;
        initSessionWithSavedCards(newMethod);
      } else {
        // The new method's own cards from the list already loaded; another
        // method's would be charged where they were never saved.
        const methodCards = cardsForMethod(
          allCardsRef.current ?? [],
          newMethod,
        );
        const defaultCard =
          methodCards.find((c) => c.default) || methodCards[0];
        const cardId = defaultCard?.gateway_payment_profile_id ?? null;
        setSavedCards(methodCards);
        setSelectedCardId(cardId);
        selectedCardRef.current = cardId;
        createSession(cardId, newMethod);
      }
    } else {
      // Switching to a direct method: invalidate any in-flight session
      // request so a late-resolving createSession won't repopulate state.
      sessionRequestIdRef.current += 1;
      setSessionExternalData(null);
      adoptSessionId(null);
      setGatewayError(null);
      gatewayHandleRef.current = null;
      setLoading(false);
    }
  };

  const updateBillAddress = (field: keyof AddressFormData, value: string) => {
    setBillAddress((prev) => updateAddressField(prev, field, value));
  };

  const saveBillingAddress = useCallback(
    (): Promise<Cart | null> =>
      onUpdateBillingAddress(
        useShippingForBilling
          ? { use_shipping: true }
          : { billing_address: formDataToAddress(billAddress) },
      ),
    [useShippingForBilling, billAddress, onUpdateBillingAddress],
  );

  // Resolves false when an amount update in flight failed or was superseded.
  // It waits for every update, including one started meanwhile.
  const awaitAmountSync = useCallback(async (): Promise<boolean> => {
    for (
      let amountSync = amountSyncRef.current;
      amountSync;
      amountSync = amountSyncRef.current
    ) {
      if (!(await amountSync)) return false;
    }
    return true;
  }, []);

  // ── Auto-complete after gateway approval (PayPal popup / Adyen sessions) ──
  // "not_started" when completion never reached the payment (one already in
  // flight, or the billing address could not be saved).
  const handleGatewayApproved = useCallback(
    async (
      sessionResult?: string,
    ): Promise<"completed" | "failed" | "not_started"> => {
      if (completionInFlightRef.current) return "not_started";
      if (!paymentSessionId) return "not_started";

      // Read before the save: an amount update finishing during it would
      // overwrite the snapshot with a figure the buyer never approved.
      const approvedAmount =
        sessionSnapshotsRef.current.get(paymentSessionId)?.amount;
      const updateInFlightAtApproval = amountSyncRef.current !== null;

      completionInFlightRef.current = true;
      setProcessing(true);
      setGatewayError(null);
      setTotalNotice(null);

      try {
        const updatedCart = await saveBillingAddress();
        if (!updatedCart) {
          setProcessing(false);
          completionInFlightRef.current = false;
          setGatewayError(t("failedToSaveBilling"));
          return "not_started";
        }
        // The buyer approved the amount the session held, which can predate
        // both the saved address and the total on screen (PayPal's popup
        // never passes through submit). An update patches the same PayPal
        // order, and the capture takes its patched amount, so an update in
        // flight at any point here leaves the approved figure in doubt.
        // Completing on any mismatch would settle an amount the buyer did not
        // approve, or one the order no longer totals.
        const current = sessionSnapshotsRef.current.get(paymentSessionId);
        if (
          approvedAmount === undefined ||
          updateInFlightAtApproval ||
          amountSyncRef.current !== null ||
          !sameAmount(amountDueOf(updatedCart), approvedAmount) ||
          !sameAmount(current?.amount, approvedAmount)
        ) {
          setTotalNotice(t("totalChanged"));
          setProcessing(false);
          completionInFlightRef.current = false;
          return "not_started";
        }

        const completed = await onPaymentComplete({
          type: "session",
          sessionId: paymentSessionId,
          sessionResult,
        });
        if (completed) return "completed";

        completionInFlightRef.current = false;
        return "failed";
      } catch {
        setGatewayError(t("paymentError"));
        setProcessing(false);
        completionInFlightRef.current = false;
        return "not_started";
      }
    },
    [paymentSessionId, saveBillingAddress, onPaymentComplete, setProcessing, t],
  );

  // PayPal keeps the session open when it declined the buyer's funding
  // source, so they can pick another in the same window. Only a session that
  // can no longer be paid is replaced: a completed one has already taken the
  // money when placing the order failed, and one we could not read may have,
  // so a new session would let the buyer pay twice.
  // After a failed completion, opens a new session only when the current one
  // can no longer be paid, and answers the current one's status.
  const replaceSessionIfUnpayable = useCallback(async () => {
    if (!paymentSessionId || !selectedMethod) return undefined;

    const requestId = sessionRequestIdRef.current;
    const current = await getCheckoutPaymentSession(cart.id, paymentSessionId);
    const status = current.success ? current.session?.status : undefined;
    // The shopper may have picked another method meanwhile; its session stands.
    if (requestId !== sessionRequestIdRef.current) return status;
    if (status === "failed" || status === "canceled" || status === "expired") {
      createSession(selectedCardRef.current, selectedMethod);
    }
    return status;
  }, [cart.id, createSession, paymentSessionId, selectedMethod]);

  const handlePayPalApproved =
    useCallback(async (): Promise<PayPalApprovalOutcome> => {
      const result = await handleGatewayApproved();
      if (result === "completed") return "completed";
      if (result === "not_started") return "failed";

      const status = await replaceSessionIfUnpayable();
      if (status === "pending" || status === "processing") return "restart";
      return "failed";
    }, [handleGatewayApproved, replaceSessionIfUnpayable]);

  // Adyen's session opens unpayable: Spree makes it payable at the amount it
  // holds, and Drop-in pays it with the session data that comes back.
  const handleAdyenBeforeSubmit = useCallback(async (): Promise<string> => {
    if (!paymentSessionId) throw new Error(t("failedToInitPayment"));
    // A submit overtaking an amount update would pay the old figure.
    if (!(await awaitAmountSync())) throw new Error(t("failedToInitPayment"));

    const result = await updateCheckoutPaymentSession(
      cart.id,
      paymentSessionId,
      { external_data: { submit: true } },
    );
    const payableSessionData = result.success
      ? result.session?.external_data?.session_data
      : undefined;
    if (typeof payableSessionData !== "string" || !payableSessionData) {
      throw new Error(
        (!result.success && result.error) || t("failedToInitPayment"),
      );
    }
    return payableSessionData;
  }, [awaitAmountSync, cart.id, paymentSessionId, t]);

  // A failed completion leaves Drop-in mounted while Adyen keeps the session
  // open for another try; only a session that can no longer be paid is
  // replaced.
  const handleAdyenApproved = useCallback(
    async (sessionResult: string) => {
      const result = await handleGatewayApproved(sessionResult);
      if (result === "failed") await replaceSessionIfUnpayable();
    },
    [handleGatewayApproved, replaceSessionIfUnpayable],
  );

  // Pay Now waits for Drop-in, which shows its own message when an attempt
  // ends without a payment. After a refusal or error the session may be over
  // (expired, or refused by Spree), so it is replaced when it can no longer be
  // paid; invalid fields leave it as it is.
  const handleAdyenFailed = useCallback(
    (reason: "invalid" | "ended") => {
      setProcessing(false);
      if (reason === "ended") void replaceSessionIfUnpayable();
    },
    [setProcessing, replaceSessionIfUnpayable],
  );

  const stopForNewTotal = useCallback((): { error: string } => {
    const msg = t("totalChanged");
    setTotalNotice(msg);
    setProcessing(false);
    return { error: msg };
  }, [setProcessing, t]);

  // ── Submit ──────────────────────────────────────────────────────────
  useImperativeHandle(
    ref,
    () => ({
      submit: async () => {
        if (completionInFlightRef.current) return {};
        completionInFlightRef.current = true;
        setTotalNotice(null);

        try {
          // Zero amount — no payment needed
          if (isZeroAmount) {
            setProcessing(true);
            try {
              const updatedCart = await saveBillingAddress();
              if (!updatedCart) {
                setProcessing(false);
                return { error: t("failedToSaveBilling") };
              }
              // Tax by the billing address can make the order payable.
              if (!sameAmount(amountDueOf(updatedCart), rawAmountDue)) {
                return stopForNewTotal();
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
            const updatedCart = await saveBillingAddress();
            if (!updatedCart) {
              setProcessing(false);
              return { error: t("failedToSaveBilling") };
            }

            // When tax follows the billing address, saving it can change the
            // total. A session still holds the amount shown before, and
            // paying now would charge that figure for an order that can no
            // longer be placed; a direct payment would place the order at a
            // total the buyer never saw. The buyer reviews the new total and
            // pays again (a session is moved to it first).
            if (!sameAmount(amountDueOf(updatedCart), rawAmountDue)) {
              return stopForNewTotal();
            }

            // 2. Process payment based on method type
            if (selectedMethod.session_required) {
              // Session-based flow (Stripe, Adyen, etc.)
              if (!(await awaitAmountSync())) {
                setProcessing(false);
                return { error: t("failedToInitPayment") };
              }
              if (!paymentSessionId || !sessionExternalData) {
                setProcessing(false);
                return { error: t("failedToInitPayment") };
              }
              // The cart and the session may have moved during the wait (a
              // gift card removed in the summary, say). Pay only when both
              // still hold the amount the buyer pressed Pay now for.
              const held = sessionSnapshotsRef.current.get(paymentSessionId);
              if (!sameAmount(amountDueRef.current, rawAmountDue)) {
                return stopForNewTotal();
              }
              if (!sameAmount(held?.amount, rawAmountDue)) {
                // Move the session to the total, so the next Pay now can go
                // through rather than stopping here again.
                if (currentSessionIdRef.current === paymentSessionId) {
                  syncSessionAmount(
                    paymentSessionId,
                    rawAmountDue,
                    selectedMethod,
                  );
                }
                return stopForNewTotal();
              }
              // A sync that replaced the session left this attempt holding the
              // old id and client secret. The form now shows the new session.
              if (
                currentSessionIdRef.current !== paymentSessionId ||
                held?.data !== JSON.stringify(sessionExternalData)
              ) {
                const msg = t("failedToInitPayment");
                setGatewayError(msg);
                setProcessing(false);
                return { error: msg };
              }
              const basePath = extractBasePath(window.location.pathname);
              const returnUrl = `${window.location.origin}${basePath}/confirm-payment/${cart.id}?session=${paymentSessionId}`;

              let error: string | undefined;

              const clientSecret = sessionExternalData.client_secret as
                | string
                | undefined;
              const gatewayId = resolveGatewayId(selectedMethod.type);
              const isStripe = gatewayId === "stripe";
              const isApprovalDriven =
                gatewayId === "adyen" || gatewayId === "paypal";
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

              // Approval-driven gateways (Adyen, PayPal) complete the order
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
      rawAmountDue,
      selectedMethod,
      paymentSessionId,
      sessionExternalData,
      selectedCardId,
      saveBillingAddress,
      awaitAmountSync,
      syncSessionAmount,
      stopForNewTotal,
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
        {totalNotice && (
          <div className="mt-2 rounded-sm border border-red-300 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-700 flex items-center gap-2">
              <CircleAlert className="h-4 w-4 flex-shrink-0" />
              {totalNotice}
            </p>
          </div>
        )}
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
                autoCompleteSection="billing"
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

      {totalNotice && (
        <div className="rounded-sm border border-red-300 bg-red-50 px-4 py-3 mt-2">
          <p className="text-sm text-red-700 flex items-center gap-2">
            <CircleAlert className="h-4 w-4 flex-shrink-0" />
            {totalNotice}
          </p>
        </div>
      )}

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
                                    clientKey={
                                      ext.client_key as string | undefined
                                    }
                                    environment={ext.environment}
                                    amount={
                                      rawAmountDue
                                        ? {
                                            value: adyenMinorUnits(
                                              rawAmountDue,
                                              cart.currency,
                                            ),
                                            currency: cart.currency,
                                          }
                                        : undefined
                                    }
                                    onReady={handleGatewayReady}
                                    onBeforeSubmit={handleAdyenBeforeSubmit}
                                    onApproved={handleAdyenApproved}
                                    onFailed={handleAdyenFailed}
                                  />
                                </div>
                              ) : null;
                            }
                            case "paypal": {
                              const orderId = ext._external_id as
                                | string
                                | undefined;
                              // The client id that created the order; the
                              // environment variable only covers older
                              // backends that do not send one.
                              const clientId =
                                (ext.client_id as string | undefined) ||
                                paypalClientId;
                              const intent =
                                (ext.intent as string | undefined) ?? "CAPTURE";
                              return orderId && clientId ? (
                                <div className="p-4">
                                  <PayPalPaymentForm
                                    key={orderId}
                                    paypalOrderId={orderId}
                                    clientId={clientId}
                                    intent={intent}
                                    currency={cart.currency}
                                    onReady={handleGatewayReady}
                                    onApproved={handlePayPalApproved}
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
              autoCompleteSection="billing"
            />
          </div>
        )}
      </div>
    </div>
  );
}
