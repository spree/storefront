"use client";

import { CircleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * The PayPal buttons a store offers. Each pays through the same PayPal order
 * and is shown only when PayPal says the buyer is eligible for it. PayPal's
 * all-eligible component would also offer methods that send the buyer to
 * their bank, which the PayPal gateway does not support.
 */
export const PAYPAL_FUNDING_SOURCES = [
  "paypal",
  "paylater",
  "venmo",
  "card",
] as const;

/**
 * What completing the payment after PayPal's approval came to:
 * - `completed`: the order is placed
 * - `restart`: PayPal declined the chosen funding source and the session is
 *   still open, so the buyer picks another in PayPal's window
 * - `failed`: the session cannot be paid; a new one is started
 */
export type PayPalApprovalOutcome = "completed" | "restart" | "failed";

export interface PayPalPaymentFormHandle {
  confirmPayment: (returnUrl: string) => Promise<{ error?: string }>;
  fetchUpdates: () => Promise<void>;
}

interface PayPalPaymentFormProps {
  paypalOrderId: string;
  /** The client id that created the order, from the payment session. */
  clientId: string;
  /** The order's intent, from the payment session; the SDK must match it. */
  intent: string;
  currency: string;
  onReady: (handle: PayPalPaymentFormHandle) => void;
  /** Called when user approves payment in the PayPal popup. */
  onApproved: () => Promise<PayPalApprovalOutcome>;
}

export function PayPalPaymentForm({
  paypalOrderId,
  clientId,
  intent,
  currency,
  onReady,
  onApproved,
}: PayPalPaymentFormProps) {
  const t = useTranslations("checkout");
  const [error, setError] = useState<string | null>(null);
  const approvedRef = useRef(false);
  const [approvedForUI, setApprovedForUI] = useState(false);

  // For PayPal, confirmPayment is called by the checkout page's "Place Order"
  // button. If the user already approved via the popup, resolve immediately.
  // Otherwise return an error telling them to use the PayPal button.
  const confirmPayment = useCallback(
    async (_returnUrl: string): Promise<{ error?: string }> => {
      if (approvedRef.current) {
        return {};
      }
      return { error: t("paypalApproveFirst") };
    },
    [t],
  );

  const fetchUpdates = useCallback(async () => {}, []);

  // Lazy-load the PayPal SDK components
  const [PayPalSDK, setPayPalSDK] = useState<{
    PayPalScriptProvider: typeof import("@paypal/react-paypal-js")["PayPalScriptProvider"];
    PayPalButtons: typeof import("@paypal/react-paypal-js")["PayPalButtons"];
  } | null>(null);

  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const confirmPaymentRef = useRef(confirmPayment);
  confirmPaymentRef.current = confirmPayment;
  const fetchUpdatesRef = useRef(fetchUpdates);
  fetchUpdatesRef.current = fetchUpdates;

  useEffect(() => {
    if (PayPalSDK) return;

    let cancelled = false;

    import("@paypal/react-paypal-js")
      .then((mod) => {
        if (cancelled) return;
        setPayPalSDK({
          PayPalScriptProvider: mod.PayPalScriptProvider,
          PayPalButtons: mod.PayPalButtons,
        });
        onReadyRef.current({
          confirmPayment: (...args) => confirmPaymentRef.current(...args),
          fetchUpdates: (...args) => fetchUpdatesRef.current(...args),
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load PayPal. Please refresh and try again.",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [PayPalSDK]);

  // Stable ref for onApproved to avoid re-renders of PayPalButtons
  const onApprovedRef = useRef(onApproved);
  onApprovedRef.current = onApproved;

  if (!PayPalSDK) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
      </div>
    );
  }

  const { PayPalScriptProvider, PayPalButtons } = PayPalSDK;

  return (
    <div>
      <PayPalScriptProvider
        options={{
          clientId,
          currency: currency.toUpperCase(),
          intent: intent.toLowerCase(),
        }}
      >
        <div className="flex flex-col gap-2">
          {/* A button renders nothing when PayPal finds the buyer ineligible
              for its funding source. */}
          {PAYPAL_FUNDING_SOURCES.map((fundingSource) => (
            <PayPalButtons
              key={fundingSource}
              fundingSource={fundingSource}
              style={{
                shape: "rect",
                layout: "vertical",
                ...(fundingSource === "paypal" || fundingSource === "paylater"
                  ? { color: "gold" as const }
                  : {}),
              }}
              createOrder={async () => paypalOrderId}
              onApprove={async (_data, actions) => {
                approvedRef.current = true;
                setApprovedForUI(true);
                setError(null);
                // Complete the payment directly — no need for the user to
                // click "Place Order" again.
                const outcome = await onApprovedRef.current();
                if (outcome === "completed") return;

                approvedRef.current = false;
                setApprovedForUI(false);
                if (outcome === "restart") {
                  setError(t("paypalChooseAnother"));
                  await actions.restart();
                }
              }}
              onError={(err) => {
                const msg =
                  err instanceof Error ? err.message : t("paypalError");
                setError(msg);
              }}
              onCancel={() => {
                setError(t("paypalCancelled"));
              }}
            />
          ))}
        </div>
      </PayPalScriptProvider>

      {approvedForUI && (
        <p className="text-sm text-green-600 mt-2 text-center">
          {t("paypalApproved")}
        </p>
      )}

      {error && (
        <Alert variant="destructive" className="mt-3">
          <CircleAlert />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
