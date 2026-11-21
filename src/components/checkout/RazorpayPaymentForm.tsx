"use client";

import type { Cart } from "@spree/sdk";
import { CircleAlert } from "lucide-react";
import Script from "next/script";
import { useCallback, useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export interface RazorpayPaymentFormHandle {
  confirmPayment: (returnUrl: string) => Promise<{ error?: string }>;
}

export interface RazorpayPaymentFormProps {
  sessionData: Record<string, unknown>;
  cart: Cart;
  onReady: (handle: RazorpayPaymentFormHandle) => void;
  onApproved: (sessionResult?: string) => Promise<void>;
}

export function RazorpayPaymentForm({
  sessionData,
  cart,
  onReady,
  onApproved,
}: RazorpayPaymentFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  // Extract necessary Razorpay keys from the Spree session data securely
  const clientKey = sessionData.client_key as string;
  const orderId = sessionData._external_id as string;

  // Compute amount from cart (Razorpay expects paise/subunits)
  const amount = Math.round(parseFloat(cart.amount_due ?? cart.total) * 100);
  const currency = cart.currency || "INR";

  // Extract customer details natively from the Spree Cart object
  const customerName = cart.billing_address
    ? `${cart.billing_address.first_name} ${cart.billing_address.last_name}`
    : "";
  const customerEmail = cart.email || "";
  const customerContact = cart.billing_address?.phone || "";

  const confirmPayment = useCallback(
    (returnUrl: string): Promise<{ error?: string }> => {
      return new Promise((resolve) => {
        if (!isScriptLoaded || !(window as any).Razorpay) {
          resolve({ error: "Razorpay SDK failed to load. Please refresh." });
          return;
        }

        setError(null);

        const options = {
          key: clientKey,
          amount: amount,
          currency: currency,
          name: "Checkout",
          order_id: orderId,
          handler: async (response: any) => {
            try {
              // 1. Verify the signature directly with the Rails backend
              const apiUrl = process.env.NEXT_PUBLIC_SPREE_API_URL || "";
              const verifyRes = await fetch(`${apiUrl}/razorpay/verify`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  razorpay_order_id: orderId,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                }),
              });

              if (!verifyRes.ok) {
                throw new Error("Payment verification failed on the server.");
              }

              // 2. Tell the Next.js PaymentSection that we are approved!
              // It will now safely trigger onPaymentComplete and finish the order.
              await onApproved();
              resolve({});
            } catch (err: any) {
              resolve({ error: err.message || "Payment verification failed" });
            }
          },
          prefill: {
            name: customerName,
            email: customerEmail,
            contact: customerContact,
          },
          theme: {
            color: "#2e5bff",
          },
          modal: {
            ondismiss: () => {
              resolve({ error: "Payment was cancelled by the user." });
            },
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.on("payment.failed", (response: any) => {
          resolve({ error: response.error.description });
        });

        rzp.open();
      });
    },
    [
      isScriptLoaded,
      clientKey,
      amount,
      currency,
      orderId,
      customerName,
      customerEmail,
      customerContact,
      onApproved,
    ],
  );

  useEffect(() => {
    if (isScriptLoaded) {
      onReady({ confirmPayment });
    }
  }, [isScriptLoaded, confirmPayment, onReady]);

  return (
    <div>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
        onLoad={() => setIsScriptLoaded(true)}
      />

      {error && (
        <Alert variant="destructive" className="mt-3">
          <CircleAlert className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <p className="text-sm text-gray-600 mt-2 text-center">
        A secure window will open for you to complete your payment.
      </p>
    </div>
  );
}
