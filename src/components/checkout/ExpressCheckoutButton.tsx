"use client";

import type { StoreOrder } from "@spree/sdk";
import {
  Elements,
  ExpressCheckoutElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import type {
  StripeExpressCheckoutElementClickEvent,
  StripeExpressCheckoutElementConfirmEvent,
  StripeExpressCheckoutElementReadyEvent,
  StripeExpressCheckoutElementShippingAddressChangeEvent,
  StripeExpressCheckoutElementShippingRateChangeEvent,
} from "@stripe/stripe-js";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  expressCheckoutCreateSession,
  expressCheckoutFinalize,
  expressCheckoutPreparePayment,
  expressCheckoutResolveShipping,
  expressCheckoutSelectRates,
} from "@/lib/data/express-checkout-flow";
import { quickCheckoutClearAddresses } from "@/lib/data/quick-checkout";
import {
  buildLineItems,
  buildShippingRateMap,
  buildSpreeAddress,
  parseName,
  toCents,
} from "@/lib/utils/express-checkout";
import { stripePromise } from "@/lib/utils/stripe";

export interface ExpressCheckoutButtonProps {
  cart: StoreOrder;
  basePath: string;
  onComplete: () => void | Promise<void>;
  onProcessingChange?: (processing: boolean) => void;
}

function ExpressCheckoutInner({
  cart,
  basePath,
  onComplete,
  onProcessingChange,
}: ExpressCheckoutButtonProps) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [available, setAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const isConfirmingRef = useRef(false);
  const isGooglePayRef = useRef(false);
  const shippingRateMapRef = useRef(
    new Map<string, Array<{ shipmentId: string; rateId: string }>>(),
  );

  useEffect(() => {
    onProcessingChange?.(processing);
  }, [processing, onProcessingChange]);

  useEffect(() => {
    if (available !== null) return;
    const timeout = setTimeout(() => {
      setAvailable((prev) => (prev === null ? false : prev));
    }, 8000);
    return () => clearTimeout(timeout);
  }, [available]);

  const handleReady = useCallback(
    (event: StripeExpressCheckoutElementReadyEvent) => {
      const methods = event.availablePaymentMethods;
      setAvailable(
        methods !== undefined &&
          (methods.applePay || methods.googlePay || methods.link),
      );
    },
    [],
  );

  const handleClick = useCallback(
    (event: StripeExpressCheckoutElementClickEvent) => {
      // Track payment type: Google Pay requires unique shipping rate IDs
      // (rejects duplicates), so buildShippingRateMap appends a random suffix.
      isGooglePayRef.current = event.expressPaymentType === "google_pay";
      event.resolve({
        lineItems: buildLineItems(cart),
      });
    },
    [cart],
  );

  const handleShippingAddressChange = useCallback(
    async (event: StripeExpressCheckoutElementShippingAddressChangeEvent) => {
      try {
        const { address } = event;

        const result = await expressCheckoutResolveShipping(cart.id, {
          city: address.city,
          zipcode: address.postal_code,
          country_iso: address.country,
          state_name: address.state || undefined,
        });

        if (!result.success) {
          event.reject();
          return;
        }

        const order = result.order;

        const { shippingRates, selectionMap } = buildShippingRateMap(
          order.shipments,
          isGooglePayRef.current,
          order.currency,
        );
        shippingRateMapRef.current = selectionMap;

        if (shippingRates.length === 0) {
          event.reject();
          return;
        }

        const lineItems = buildLineItems(order);
        event.resolve({ shippingRates, lineItems });

        // Sync Elements amount to match the default (first) shipping rate
        // so subsequent rate changes can only decrease the authorized amount.
        try {
          const lineItemsSum = lineItems.reduce(
            (sum, item) => sum + item.amount,
            0,
          );
          const defaultShippingAmount = shippingRates[0]?.amount ?? 0;
          elements?.update({ amount: lineItemsSum + defaultShippingAmount });
        } catch (_) {
          /* elements.update failed — non-fatal */
        }
      } catch (_err) {
        try {
          event.reject();
        } catch (_) {
          /* already resolved/rejected */
        }
      }
    },
    [cart.id, elements],
  );

  const handleShippingRateChange = useCallback(
    async (event: StripeExpressCheckoutElementShippingRateChangeEvent) => {
      try {
        const { shippingRate } = event;

        const selections = shippingRateMapRef.current.get(shippingRate.id);
        if (!selections || selections.length === 0) {
          event.reject();
          return;
        }

        const result = await expressCheckoutSelectRates(cart.id, selections);
        if (!result.success) {
          event.reject();
          return;
        }

        const lineItems = buildLineItems(result.order);
        const lineItemsSum = lineItems.reduce((s, i) => s + i.amount, 0);
        const newAmount = lineItemsSum + shippingRate.amount;

        try {
          elements?.update({ amount: newAmount });
        } catch (_updateErr) {
          /* elements.update failed — non-fatal */
        }

        event.resolve({ lineItems });
      } catch (_err) {
        try {
          event.reject();
        } catch (_) {
          /* already resolved/rejected */
        }
      }
    },
    [cart.id, elements],
  );

  const handleConfirm = useCallback(
    async (event: StripeExpressCheckoutElementConfirmEvent) => {
      if (isConfirmingRef.current) return;

      if (!stripe || !elements) {
        event.paymentFailed({ reason: "fail" });
        return;
      }

      isConfirmingRef.current = true;
      const orderId = cart.id;
      setError(null);
      setProcessing(true);

      let stripePaymentConfirmed = false;

      const fail = (
        reason:
          | "fail"
          | "invalid_shipping_address"
          | "invalid_billing_address"
          | "invalid_payment_data"
          | "address_unserviceable",
        msg: string,
      ) => {
        if (!stripePaymentConfirmed) {
          event.paymentFailed({ reason });
        }
        setError(msg);
        setProcessing(false);
        isConfirmingRef.current = false;
      };

      try {
        const billing = event.billingDetails;
        const shipping = event.shippingAddress;
        const email = billing?.email || "";
        const phone = billing?.phone || "";

        const shippingName = parseName(shipping?.name || billing?.name || "");
        const billingName = parseName(billing?.name || shipping?.name || "");

        const shipAddr = shipping?.address || billing?.address;
        const billAddr = billing?.address || shipping?.address;

        if (!shipAddr || !billAddr) {
          fail("invalid_shipping_address", "Missing address");
          return;
        }

        const prepareResult = await expressCheckoutPreparePayment(orderId, {
          email,
          shipAddress: buildSpreeAddress(shippingName, shipAddr, phone),
          billAddress: buildSpreeAddress(billingName, billAddr, phone),
        });

        if (!prepareResult.success) {
          fail("invalid_shipping_address", prepareResult.error);
          return;
        }
        const advancedOrder = prepareResult.order;

        const submitResult = await elements.submit();
        if (submitResult.error) {
          fail(
            "fail",
            submitResult.error.message || "Payment submission failed",
          );
          return;
        }

        const { error: pmError, paymentMethod } =
          await stripe.createPaymentMethod({ elements });
        if (pmError || !paymentMethod) {
          fail(
            "invalid_payment_data",
            pmError?.message || "Failed to create payment method",
          );
          return;
        }

        const orderPaymentMethods =
          advancedOrder?.payment_methods ?? cart.payment_methods;
        const sessionPaymentMethod = orderPaymentMethods?.find(
          (pm) => pm.session_required,
        );
        if (!sessionPaymentMethod) {
          fail("fail", "No payment method available");
          return;
        }

        const sessionResult = await expressCheckoutCreateSession(
          orderId,
          sessionPaymentMethod.id,
          paymentMethod.id,
        );

        if (!sessionResult.success || !sessionResult.session) {
          fail(
            "fail",
            !sessionResult.success
              ? sessionResult.error
              : "Failed to create payment session",
          );
          return;
        }

        const clientSecret = sessionResult.session.external_data
          ?.client_secret as string | undefined;
        const sessionId = sessionResult.session.id;

        if (!clientSecret) {
          fail("fail", "Failed to initialize payment");
          return;
        }

        const returnUrl = `${window.location.origin}${basePath}/order-placed/${orderId}`;
        const { error: confirmError } = await stripe.confirmPayment({
          clientSecret,
          confirmParams: {
            payment_method: paymentMethod.id,
            return_url: returnUrl,
          },
          redirect: "if_required",
        });

        if (confirmError) {
          fail("fail", confirmError.message || "Payment confirmation failed");
          return;
        }
        stripePaymentConfirmed = true;

        try {
          const finalizeResult = await expressCheckoutFinalize(
            orderId,
            sessionId,
          );
          if (!finalizeResult.success) {
            console.warn(
              "Express checkout finalization failed (payment confirmed, backend will reconcile):",
              finalizeResult.error,
            );
          }
        } catch (_completeErr) {
          /* non-blocking — backend will reconcile */
        }

        router.push(`${basePath}/order-placed/${orderId}`);
        try {
          await onComplete();
        } catch (_onCompleteErr) {
          /* onComplete failed — non-blocking, navigation already fired */
        } finally {
          isConfirmingRef.current = false;
        }
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "An unexpected error occurred";
        fail("fail", msg);
      }
    },
    [
      stripe,
      elements,
      cart.id,
      cart.payment_methods,
      basePath,
      onComplete,
      router,
    ],
  );

  const handleCancel = useCallback(async () => {
    await quickCheckoutClearAddresses(cart.id);
  }, [cart.id]);

  if (available === false) return null;

  return (
    <div className="w-full">
      {processing && (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-sm font-medium text-gray-700">
            Finalizing your payment...
          </p>
        </div>
      )}
      <div className={processing ? "h-0 overflow-hidden" : ""}>
        <ExpressCheckoutElement
          options={{
            paymentMethods: {
              applePay: "auto",
              googlePay: "auto",
              link: "auto",
            },
            buttonType: {
              applePay: "check-out",
              googlePay: "checkout",
            },
            buttonTheme: {
              applePay: "black",
              googlePay: "black",
            },
            layout: {
              maxColumns: 1,
              maxRows: 2,
            },
            emailRequired: true,
            phoneNumberRequired: true,
            shippingAddressRequired: true,
          }}
          onReady={handleReady}
          onClick={handleClick}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          onShippingAddressChange={handleShippingAddressChange}
          onShippingRateChange={handleShippingRateChange}
        />
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        {available && (
          <div className="relative mt-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Shipping cost buffer in major currency units for Apple Pay pre-authorization. */
const SHIPPING_BUFFER_AMOUNT = 200;

export function ExpressCheckoutButton({
  cart,
  basePath,
  onComplete,
  onProcessingChange,
}: ExpressCheckoutButtonProps) {
  const currency = cart.currency.toLowerCase();

  // Use a generous initial amount to work around a known Apple Pay limitation:
  // elements.update({ amount }) cannot INCREASE the authorized amount while the
  // Apple Pay sheet is open (stripe/react-stripe-js#506). By starting high, we
  // only ever decrease to the actual total once shipping is known.
  // The buffer (200 in major currency units) covers typical shipping costs.
  // The actual displayed total is computed from lineItems + selectedShippingRate.
  const amount = useMemo(() => {
    const subtotal = toCents(cart.total, currency);
    return subtotal + toCents(SHIPPING_BUFFER_AMOUNT, currency);
  }, [cart.total, currency]);

  const options = useMemo(
    () => ({
      mode: "payment" as const,
      amount,
      currency,
      paymentMethodCreation: "manual" as const,
    }),
    [amount, currency],
  );

  return (
    <Elements stripe={stripePromise} options={options}>
      <ExpressCheckoutInner
        cart={cart}
        basePath={basePath}
        onComplete={onComplete}
        onProcessingChange={onProcessingChange}
      />
    </Elements>
  );
}
