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
  const initialAmountRef = useRef(amount);

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
  // Drop-in shows it through its own update.
  const amountValue = amount?.value;
  const amountCurrency = amount?.currency;
  useEffect(() => {
    if (!checkoutRef.current || amountValue == null || !amountCurrency) return;
    const initial = initialAmountRef.current;
    if (initial?.value === amountValue && initial?.currency === amountCurrency)
      return;
    initialAmountRef.current = { value: amountValue, currency: amountCurrency };
    checkoutRef.current.update?.({
      amount: { value: amountValue, currency: amountCurrency },
    });
  }, [amountValue, amountCurrency]);

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
          ...(initialAmountRef.current && {
            amount: initialAmountRef.current,
          }),
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
            }
          },
          onPaymentFailed: (result: any) => {
            const msg = `Payment ${result?.resultCode?.toLowerCase() || "failed"}. Please try again.`;
            setError(msg);
          },
          onError: (err: any) => {
            const msg = err?.message || "An error occurred during payment.";
            setError(msg);
          },
        } as any);

        if (cancelled || !containerRef.current) return;
        checkoutRef.current = checkout;

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
