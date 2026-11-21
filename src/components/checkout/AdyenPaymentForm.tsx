"use client";

import { CircleAlert } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import "@adyen/adyen-web/styles/adyen.css";
import {
  adyenClientKey,
  resolveAdyenEnvironment,
} from "@/lib/utils/payment-gateway";

/**
 * The Drop-in components the storefront registers. No gift card: a session
 * is paid in one payment, and a partial gift card payment never settles.
 */
export const ADYEN_DROPIN_COMPONENTS = [
  "Card",
  "GooglePay",
  "ApplePay",
  "PayPal",
  "Klarna",
  "Bancontact",
  "Redirect",
] as const;

export interface AdyenPaymentFormHandle {
  confirmPayment: (returnUrl: string) => Promise<{ error?: string }>;
  fetchUpdates: () => Promise<void>;
}

interface AdyenPaymentFormProps {
  sessionId: string;
  sessionData: string;
  /** The session's client key; the environment variable is the fallback. */
  clientKey?: string;
  /** The session's environment, "test" or "live". */
  environment?: unknown;
  /** The amount due, which Drop-in shows; updated in place. */
  amount?: { value: number; currency: string };
  onReady: (handle: AdyenPaymentFormHandle) => void;
  /**
   * Makes the session payable through Spree before Drop-in pays it, and
   * answers with the session data to pay it with.
   */
  onBeforeSubmit: () => Promise<string>;
  /** Called when Adyen sessions flow completes payment successfully. */
  onApproved: (sessionResult: string) => void;
  /**
   * Called when an attempt ends without a payment, since Drop-in reports these
   * only inside the form: `invalid` for fields it refused to submit, `ended`
   * for a refusal or error after which the session may no longer be payable.
   */
  onFailed: (reason: "invalid" | "ended") => void;
}

export function AdyenPaymentForm({
  sessionId,
  sessionData,
  clientKey,
  environment,
  amount,
  onReady,
  onBeforeSubmit,
  onApproved,
  onFailed,
}: AdyenPaymentFormProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dropinRef = useRef<any>(null);
  const checkoutRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);
  const initializedRef = useRef(false);
  const approvedRef = useRef(false);

  const onApprovedRef = useRef(onApproved);
  onApprovedRef.current = onApproved;
  const onBeforeSubmitRef = useRef(onBeforeSubmit);
  onBeforeSubmitRef.current = onBeforeSubmit;
  const onFailedRef = useRef(onFailed);
  onFailedRef.current = onFailed;
  const latestAmountRef = useRef(amount);
  latestAmountRef.current = amount;
  // What Drop-in shows; a session starts at the amount it was created for.
  const shownAmountRef = useRef(amount);

  const resolvedClientKey = clientKey || adyenClientKey;
  const resolvedEnvironment = resolveAdyenEnvironment(environment);

  // Adyen sessions flow handles payment internally — the Drop-in
  // calls onPaymentCompleted when done. confirmPayment just checks
  // if the payment was already approved.
  const confirmPayment = useCallback(
    async (_returnUrl: string): Promise<{ error?: string }> => {
      if (approvedRef.current) {
        return {};
      }
      if (!dropinRef.current) {
        return { error: "Adyen has not loaded yet" };
      }
      // Invalid fields get Drop-in's own messages and no callback at all.
      if (dropinRef.current.activePaymentMethod && !dropinRef.current.isValid) {
        dropinRef.current.showValidation();
        onFailedRef.current("invalid");
        return {};
      }
      try {
        dropinRef.current.submit();
      } catch (err) {
        return {
          error:
            err instanceof Error
              ? err.message
              : "An error occurred during payment.",
        };
      }
      // The Drop-in will handle the rest via onPaymentCompleted.
      return {};
    },
    [],
  );

  const fetchUpdates = useCallback(async () => {}, []);

  // A new amount before the session is payable: Spree took it already, and
  // Drop-in shows it in place, since reinitializing remounts the components
  // and wipes card details already typed. A change while Drop-in is still
  // loading is shown once it has loaded.
  const showLatestAmount = useCallback(() => {
    const checkout = checkoutRef.current;
    const next = latestAmountRef.current;
    if (!checkout || next?.value == null || !next.currency) return;
    const shown = shownAmountRef.current;
    if (shown?.value === next.value && shown?.currency === next.currency)
      return;
    shownAmountRef.current = { value: next.value, currency: next.currency };
    checkout.update?.(
      { amount: shownAmountRef.current },
      { shouldReinitializeCheckout: false },
    );
  }, []);

  const amountValue = amount?.value;
  const amountCurrency = amount?.currency;
  // biome-ignore lint/correctness/useExhaustiveDependencies: the amount is what re-runs this; the callback reads it from a ref
  useEffect(() => {
    showLatestAmount();
  }, [amountValue, amountCurrency, showLatestAmount]);

  useEffect(() => {
    if (initializedRef.current) return;
    if (!containerRef.current) return;
    initializedRef.current = true;

    let cancelled = false;

    async function init() {
      try {
        const adyen = await import("@adyen/adyen-web");
        const { AdyenCheckout, Dropin } = adyen;
        const components = ADYEN_DROPIN_COMPONENTS.map(
          (name) => (adyen as Record<string, any>)[name],
        );
        if (cancelled || !containerRef.current) return;

        AdyenCheckout.register(...components);

        const checkout = await AdyenCheckout({
          clientKey: resolvedClientKey,
          environment: resolvedEnvironment,
          session: {
            id: sessionId,
            sessionData,
          },
          showPayButton: false,
          // The session opens unpayable; Spree makes it payable at the amount
          // it holds, and only then may Drop-in pay it.
          beforeSubmit: (data: any, _component: any, actions: any) => {
            onBeforeSubmitRef
              .current()
              .then((payableSessionData) => {
                actions.resolve({ ...data, sessionData: payableSessionData });
              })
              .catch((err: unknown) => {
                setError(
                  err instanceof Error
                    ? err.message
                    : "The payment could not be started. Please try again.",
                );
                actions.reject();
                onFailedRef.current("ended");
              });
          },
          onPaymentCompleted: (result: any) => {
            if (
              result.resultCode === "Authorised" ||
              result.resultCode === "Pending" ||
              result.resultCode === "Received"
            ) {
              approvedRef.current = true;
              setError(null);
              // Pass sessionResult to the backend for verification
              const sr =
                "sessionResult" in result ? result.sessionResult : undefined;
              onApprovedRef.current(sr ?? "");
            } else {
              const msg = `Payment ${result.resultCode?.toLowerCase() || "failed"}. Please try again.`;
              setError(msg);
              onFailedRef.current("ended");
            }
          },
          onPaymentFailed: (result: any) => {
            const msg = `Payment ${result?.resultCode?.toLowerCase() || "failed"}. Please try again.`;
            setError(msg);
            onFailedRef.current("ended");
          },
          onError: (err: any) => {
            const msg = err?.message || "An error occurred during payment.";
            setError(msg);
            onFailedRef.current("ended");
          },
        } as any);

        if (cancelled || !containerRef.current) return;
        checkoutRef.current = checkout;
        showLatestAmount();

        const dropin = new Dropin(checkout, {
          openFirstPaymentMethod: true,
          paymentMethodComponents: components,
        });

        // Mount into a non-React-managed DOM node to avoid Preact/React conflicts
        const mountNode = document.createElement("div");
        containerRef.current.appendChild(mountNode);
        dropin.mount(mountNode);
        dropinRef.current = dropin;
        onReady({ confirmPayment, fetchUpdates });
      } catch (err) {
        initializedRef.current = false;
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to initialize payment form.",
          );
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      try {
        dropinRef.current?.unmount();
      } catch {
        // unmount can throw if not mounted
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
      checkoutRef.current = null;
      initializedRef.current = false;
    };
  }, [
    sessionId,
    sessionData,
    resolvedClientKey,
    resolvedEnvironment,
    onReady,
    confirmPayment,
    fetchUpdates,
    showLatestAmount,
  ]);

  return (
    <div>
      <div ref={containerRef} />
      {error && (
        <Alert variant="destructive" className="mt-3">
          <CircleAlert />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
