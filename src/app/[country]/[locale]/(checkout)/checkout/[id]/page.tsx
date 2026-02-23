"use client";

import type {
  AddressParams,
  StoreAddress,
  StoreCountry,
  StoreOrder,
  StoreShipment,
} from "@spree/sdk";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { use, useCallback, useEffect, useRef, useState } from "react";
import { AddressStep } from "@/components/checkout/AddressStep";
import { CouponCode } from "@/components/checkout/CouponCode";
import { DeliveryStep } from "@/components/checkout/DeliveryStep";
import { OrderSummary } from "@/components/checkout/OrderSummary";
import { PaymentStep } from "@/components/checkout/PaymentStep";
import { useCheckout } from "@/contexts/CheckoutContext";
import {
  trackAddPaymentInfo,
  trackAddShippingInfo,
  trackBeginCheckout,
} from "@/lib/analytics/gtm";
import { getAddresses, updateAddress } from "@/lib/data/addresses";
import {
  advanceCheckout,
  applyCouponCode,
  getCheckoutOrder,
  removeCouponCode,
  selectShippingRate,
  updateOrderAddresses,
} from "@/lib/data/checkout";
import { isAuthenticated as checkAuth } from "@/lib/data/cookies";
import { getCountries, getCountry } from "@/lib/data/countries";
import {
  completeCheckoutOrder,
  completeCheckoutPaymentSession,
} from "@/lib/data/payment";
import { extractBasePath } from "@/lib/utils/path";

// Checkout steps
type CheckoutStep = "address" | "delivery" | "payment";

// Map Spree order state to checkout step
function getCheckoutStep(orderState: string): CheckoutStep {
  switch (orderState) {
    case "cart":
    case "address":
      return "address";
    case "delivery":
      return "delivery";
    case "payment":
    case "confirm":
      return "payment";
    default:
      return "address";
  }
}

interface CheckoutPageProps {
  params: Promise<{
    id: string;
    country: string;
    locale: string;
  }>;
}

// Sidebar summary component
function CheckoutSidebar({
  order,
  onApplyCoupon,
  onRemoveCoupon,
}: {
  order: StoreOrder;
  onApplyCoupon: (
    code: string,
  ) => Promise<{ success: boolean; error?: string }>;
  onRemoveCoupon: (
    promotionId: string,
  ) => Promise<{ success: boolean; error?: string }>;
}) {
  return (
    <>
      <OrderSummary order={order} />
      <div className="mt-6 pt-6 border-t border-gray-200">
        <CouponCode
          order={order}
          onApply={onApplyCoupon}
          onRemove={onRemoveCoupon}
        />
      </div>
    </>
  );
}

export default function CheckoutPage({ params }: CheckoutPageProps) {
  // use() must be called before all other hooks to avoid hook order issues
  const { id: orderId } = use(params);
  const router = useRouter();
  const pathname = usePathname();
  const basePath = extractBasePath(pathname);
  const { setSummaryContent } = useCheckout();

  const [order, setOrder] = useState<StoreOrder | null>(null);
  const [shipments, setShipments] = useState<StoreShipment[]>([]);
  const [countries, setCountries] = useState<StoreCountry[]>([]);
  const [savedAddresses, setSavedAddresses] = useState<StoreAddress[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<CheckoutStep>("address");

  // Use ref to store the current order for stable callback references
  const orderRef = useRef(order);
  orderRef.current = order;

  // Guard to fire begin_checkout only once
  const beginCheckoutFiredRef = useRef(false);

  // Handle coupon code application - uses ref to avoid stale closures
  const handleApplyCoupon = useCallback(async (code: string) => {
    const currentOrder = orderRef.current;
    if (!currentOrder) return { success: false, error: "No order" };

    const result = await applyCouponCode(currentOrder.id, code);
    if (result.success && result.order) {
      setOrder(result.order);
    }
    return result;
  }, []); // No dependencies - uses ref

  // Handle coupon code removal
  const handleRemoveCoupon = useCallback(async (promotionId: string) => {
    const currentOrder = orderRef.current;
    if (!currentOrder) return { success: false, error: "No order" };

    const result = await removeCouponCode(currentOrder.id, promotionId);
    if (result.success && result.order) {
      setOrder(result.order);
    }
    return result;
  }, []); // No dependencies - uses ref

  // Track order key for sidebar updates (only update when order changes meaningfully)
  const orderKey = order ? `${order.id}-${order.updated_at}` : null;
  const prevOrderKeyRef = useRef(orderKey);

  // Update sidebar content when order changes meaningfully
  useEffect(() => {
    // Skip if order key hasn't changed
    if (
      orderKey === prevOrderKeyRef.current &&
      prevOrderKeyRef.current !== null
    ) {
      return;
    }
    prevOrderKeyRef.current = orderKey;

    if (order) {
      setSummaryContent(
        <CheckoutSidebar
          order={order}
          onApplyCoupon={handleApplyCoupon}
          onRemoveCoupon={handleRemoveCoupon}
        />,
      );
    } else {
      setSummaryContent(null);
    }
  }, [
    order,
    orderKey,
    setSummaryContent,
    handleApplyCoupon,
    handleRemoveCoupon,
  ]);

  // Load order and countries
  const loadOrder = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [orderData, countriesData, addressesData, authStatus] =
        await Promise.all([
          getCheckoutOrder(orderId),
          getCountries(),
          getAddresses(),
          checkAuth(),
        ]);

      if (!orderData) {
        setError("Order not found or you don't have access to it.");
        setLoading(false);
        return;
      }

      // Check if order is already complete
      if (orderData.state === "complete") {
        router.push(`${basePath}/order-placed/${orderId}`);
        return;
      }

      setOrder(orderData);
      setCountries(countriesData.data);
      setSavedAddresses(addressesData.data);
      setIsAuthenticated(authStatus);
      setCurrentStep(getCheckoutStep(orderData.state));

      if (!beginCheckoutFiredRef.current) {
        try {
          trackBeginCheckout(orderData);
        } catch {
          // Analytics should never break checkout flow
        }
        beginCheckoutFiredRef.current = true;
      }

      // Set shipments from order data (already included via getCheckoutOrder)
      if (
        orderData.state === "delivery" ||
        orderData.state === "payment" ||
        orderData.state === "confirm"
      ) {
        setShipments(orderData.shipments || []);
      }

      return orderData;
    } catch {
      setError("Failed to load checkout. Please try again.");
      return null;
    } finally {
      setLoading(false);
    }
  }, [orderId, basePath, router]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  // Handle address submission (shipping address only)
  const handleAddressSubmit = async (addressData: {
    email: string;
    ship_address?: AddressParams;
    ship_address_id?: string;
  }) => {
    if (!order) return;

    setProcessing(true);
    setError(null);

    try {
      // Update order with shipping address and email
      const updateResult = await updateOrderAddresses(order.id, {
        email: addressData.email,
        ...(addressData.ship_address && {
          ship_address: addressData.ship_address,
        }),
        ...(addressData.ship_address_id && {
          ship_address_id: addressData.ship_address_id,
        }),
      });

      if (!updateResult.success) {
        setError(updateResult.error || "Failed to save address");
        setProcessing(false);
        return;
      }

      // Advance to delivery step
      const advanceResult = await advanceCheckout(order.id);
      if (!advanceResult.success) {
        setError(advanceResult.error || "Failed to proceed to next step");
        setProcessing(false);
        return;
      }

      // Reload order to get updated state
      await loadOrder();
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  // Handle shipping rate selection
  const handleShippingRateSelect = async (
    shipmentId: string,
    rateId: string,
  ) => {
    if (!order) return;

    setProcessing(true);
    setError(null);

    let trackingOrder: StoreOrder | null = null;
    let trackingRateName: string | undefined;

    try {
      const result = await selectShippingRate(order.id, shipmentId, rateId);
      if (!result.success) {
        setError(result.error || "Failed to select shipping rate");
      } else if (result.order) {
        setOrder(result.order);
        setShipments(result.order.shipments || []);

        const selectedRate = result.order.shipments
          ?.flatMap((s) => s.shipping_rates || [])
          ?.find((r) => r.id === rateId);
        trackingOrder = result.order;
        trackingRateName = selectedRate?.name;
      }
    } catch {
      setError("An error occurred. Please try again.");
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
  };

  // Handle delivery confirmation (advance to payment step)
  const handleDeliveryConfirm = async () => {
    if (!order) return;

    setProcessing(true);
    setError(null);

    try {
      // Advance to payment step
      const advanceResult = await advanceCheckout(order.id);
      if (!advanceResult.success) {
        setError(advanceResult.error || "Failed to proceed");
        setProcessing(false);
        return;
      }

      // Reload order
      await loadOrder();
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  // Handle billing address update (called by PaymentStep before gateway confirmation)
  const handleUpdateBillingAddress = async (data: {
    bill_address: AddressParams;
  }): Promise<boolean> => {
    if (!order) return false;

    setError(null);

    try {
      const updateResult = await updateOrderAddresses(order.id, {
        bill_address: data.bill_address,
      });

      if (!updateResult.success) {
        setError(updateResult.error || "Failed to save billing address");
        return false;
      }

      return true;
    } catch {
      setError("Failed to save billing address. Please try again.");
      return false;
    }
  };

  // Handle payment completion (called by PaymentStep after Stripe confirms)
  const handlePaymentComplete = async (paymentSessionId: string) => {
    if (!order) return;

    setError(null);

    try {
      // Complete the payment session on the backend
      const sessionResult = await completeCheckoutPaymentSession(
        order.id,
        paymentSessionId,
      );

      if (!sessionResult.success) {
        setError(sessionResult.error || "Failed to complete payment session");
        setProcessing(false);
        return;
      }

      try {
        trackAddPaymentInfo(order);
      } catch {
        // Analytics should never break checkout flow
      }

      // Check if the order was already completed by the payment session completion.
      // If not, explicitly complete it.
      const updatedOrder = await getCheckoutOrder(order.id);

      if (!updatedOrder) {
        setError("Order not found after payment. Please contact support.");
        setProcessing(false);
        return;
      }

      if (updatedOrder.state !== "complete") {
        const completeResult = await completeCheckoutOrder(order.id);
        if (!completeResult.success) {
          setError(completeResult.error || "Failed to complete order");
          setProcessing(false);
          return;
        }
      }

      // Redirect to order placed page (cart cookie is cleared there)
      router.push(`${basePath}/order-placed/${order.id}`);
    } catch {
      setError("An error occurred. Please try again.");
      setProcessing(false);
    }
  };

  // Fetch states for a country
  const fetchStates = async (countryIso: string) => {
    try {
      const country = await getCountry(countryIso);
      return country.states || [];
    } catch {
      return [];
    }
  };

  // Update a saved address
  const handleUpdateSavedAddress = async (
    id: string,
    data: AddressParams,
  ): Promise<StoreAddress> => {
    const result = await updateAddress(id, data);

    if (!result.success) {
      throw new Error(result.error || "Failed to update address");
    }

    if (!result.address) {
      throw new Error("Update succeeded but address payload is missing");
    }

    const updatedAddress = result.address;
    setSavedAddresses((prev) =>
      prev.map((addr) => (addr.id === id ? updatedAddress : addr)),
    );

    return updatedAddress;
  };

  // Navigate back to a previous step
  const goToStep = (step: CheckoutStep) => {
    setCurrentStep(step);
  };

  // Loading state
  if (loading) {
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

  // Error state
  if (error && !order) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Checkout Error
        </h1>
        <p className="text-gray-600 mb-6">{error}</p>
        <Link
          href={`${basePath}/cart`}
          className="inline-flex items-center px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-700"
        >
          Return to Cart
        </Link>
      </div>
    );
  }

  if (!order) return null;

  // Check if order has items
  if (!order.line_items || order.line_items.length === 0) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Your Cart is Empty
        </h1>
        <p className="text-gray-600 mb-6">
          Add some items to your cart before checking out.
        </p>
        <Link
          href={`${basePath}/products`}
          className="inline-flex items-center px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-700"
        >
          Continue Shopping
        </Link>
      </div>
    );
  }

  const steps = [
    { id: "address", label: "Shipping" },
    { id: "delivery", label: "Delivery" },
    { id: "payment", label: "Payment" },
  ];

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>
        <p className="text-gray-500 mt-1">Order #{order.number}</p>
      </div>

      {/* Step indicator */}
      <div className="mb-8">
        <nav aria-label="Progress">
          <ol className="flex items-center">
            {steps.map((step, index) => (
              <li
                key={step.id}
                className={`relative flex flex-row items-center ${index === steps.length - 1 ? "w-auto" : "w-full"}`}
              >
                <div className="flex items-center pr-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      index < currentStepIndex
                        ? "bg-primary-500 text-white"
                        : index === currentStepIndex
                          ? "bg-primary-500 text-white"
                          : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {index < currentStepIndex ? "✓" : index + 1}
                  </div>
                  <span
                    className={`ml-2 text-sm font-medium ${
                      index === currentStepIndex
                        ? "text-primary-500"
                        : index < currentStepIndex
                          ? "text-gray-900"
                          : "text-gray-500"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className="w-full h-0.5 bg-gray-200">
                    <div
                      className={`h-full ${index < currentStepIndex ? "bg-primary-500" : "bg-gray-200"}`}
                      style={{
                        width: index < currentStepIndex ? "100%" : "0%",
                      }}
                    />
                  </div>
                )}
              </li>
            ))}
          </ol>
        </nav>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          {error}
        </div>
      )}

      {/* Main content */}
      {currentStep === "address" && (
        <AddressStep
          order={order}
          countries={countries}
          savedAddresses={savedAddresses}
          isAuthenticated={isAuthenticated}
          signInUrl={`${basePath}/account?redirect=${encodeURIComponent(pathname)}`}
          fetchStates={fetchStates}
          onSubmit={handleAddressSubmit}
          onUpdateSavedAddress={
            isAuthenticated ? handleUpdateSavedAddress : undefined
          }
          processing={processing}
        />
      )}

      {currentStep === "delivery" && (
        <DeliveryStep
          order={order}
          shipments={shipments}
          onShippingRateSelect={handleShippingRateSelect}
          onConfirm={handleDeliveryConfirm}
          onBack={() => goToStep("address")}
          processing={processing}
        />
      )}

      {currentStep === "payment" && (
        <PaymentStep
          order={order}
          countries={countries}
          isAuthenticated={isAuthenticated}
          fetchStates={fetchStates}
          onUpdateBillingAddress={handleUpdateBillingAddress}
          onPaymentComplete={handlePaymentComplete}
          onBack={() => goToStep("delivery")}
          processing={processing}
          setProcessing={setProcessing}
        />
      )}
    </>
  );
}
