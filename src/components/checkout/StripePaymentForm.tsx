"use client";

import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { CircleAlert } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getStripe } from "@/lib/utils/stripe";

export interface StripePaymentFormHandle {
  confirmPayment: (returnUrl: string) => Promise<{ error?: string }>;
  fetchUpdates: () => Promise<void>;
}

interface StripePaymentFormProps {
  clientSecret: string;
  /** The key of the Stripe account behind the chosen payment method. */
  publishableKey: string | undefined;
  onReady: (handle: StripePaymentFormHandle) => void;
}

function StripePaymentFormInner({
  onReady,
}: {
  onReady: (handle: StripePaymentFormHandle) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);

  const confirmPayment = useCallback(
    async (returnUrl: string) => {
      if (!stripe || !elements) {
        return { error: "Stripe has not loaded yet" };
      }

      setError(null);

      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: returnUrl,
        },
        redirect: "if_required",
      });

      if (result.error) {
        const message =
          result.error.message || "An error occurred during payment.";
        setError(message);
        return { error: message };
      }

      return {};
    },
    [stripe, elements],
  );

  const fetchUpdates = useCallback(async () => {
    if (!elements) return;
    await elements.fetchUpdates();
  }, [elements]);

  useEffect(() => {
    if (stripe && elements) {
      onReady({ confirmPayment, fetchUpdates });
    }
  }, [stripe, elements, confirmPayment, fetchUpdates, onReady]);

  return (
    <div>
      <PaymentElement
        options={{
          layout: "tabs",
        }}
      />
      {error && (
        <Alert variant="destructive" className="mt-3">
          <CircleAlert />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export function StripePaymentForm({
  clientSecret,
  publishableKey,
  onReady,
}: StripePaymentFormProps) {
  return (
    <Elements
      stripe={getStripe(publishableKey)}
      options={{
        clientSecret,
        appearance: {
          theme: "stripe",
          variables: {
            fontFamily: 'Geist, "Geist Fallback", system-ui, sans-serif',
            fontSizeBase: "14px",
            colorPrimary: "#171717",
            borderRadius: "6px",
            focusBoxShadow: "0 0 0 1px #171717",
          },
          rules: {
            ".Input": {
              paddingTop: "13px",
              paddingBottom: "13px",
              boxShadow: "",
            },
          },
        },
      }}
    >
      <StripePaymentFormInner onReady={onReady} />
    </Elements>
  );
}

/**
 * Confirm payment with a saved card (no Elements/PaymentElement needed).
 */
export async function confirmWithSavedCard(
  publishableKey: string | undefined,
  clientSecret: string,
  paymentMethodId: string,
  returnUrl: string,
): Promise<{ error?: string }> {
  const stripe = await getStripe(publishableKey);
  if (!stripe) {
    return { error: "Stripe has not loaded yet" };
  }

  const result = await stripe.confirmCardPayment(clientSecret, {
    payment_method: paymentMethodId,
    return_url: returnUrl,
  });

  if (result.error) {
    return {
      error: result.error.message || "An error occurred during payment.",
    };
  }

  return {};
}
