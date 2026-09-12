"use server";

import type { AddressParams, Cart } from "@spree/sdk";
import {
  getCheckoutOrder,
  selectDeliveryRate,
  updateOrderAddresses,
} from "@/lib/data/checkout";
import {
  completeCheckoutOrder,
  completeCheckoutPaymentSession,
  createCheckoutPaymentSession,
} from "@/lib/data/payment";
import { actionResult } from "@/lib/data/utils";

export interface ExpressCheckoutPartialAddress {
  city: string;
  postal_code: string;
  country_code: string;
  state_name?: string;
}

export async function expressCheckoutResolveShipping(
  cartId: string,
  address: ExpressCheckoutPartialAddress,
): Promise<{ success: true; cart: Cart } | { success: false; error: string }> {
  return actionResult(async () => {
    const result = await updateOrderAddresses(cartId, {
      shipping_address: {
        ...address,
        first_name: "Express",
        last_name: "Checkout",
        address1: "TBD",
        quick_checkout: true,
      },
    });

    if (!result.success) {
      throw new Error(result.error);
    }

    const cart = await getCheckoutOrder(cartId);

    if (!cart) {
      throw new Error("Failed to fetch cart after address update");
    }

    return { cart };
  }, "Failed to resolve shipping");
}

export async function expressCheckoutSelectRates(
  cartId: string,
  selections: Array<{ fulfillmentId: string; rateId: string }>,
): Promise<{ success: true; cart: Cart } | { success: false; error: string }> {
  return actionResult(async () => {
    let cart: Cart | null = null;

    for (const { fulfillmentId, rateId } of selections) {
      const result = await selectDeliveryRate(cartId, fulfillmentId, rateId);
      if (!result.success) {
        throw new Error(result.error);
      }
      cart = result.cart;
    }

    if (!cart) {
      throw new Error("No fulfillment selections provided");
    }

    return { cart };
  }, "Failed to select shipping rates");
}

export async function expressCheckoutPreparePayment(
  cartId: string,
  params: {
    email: string;
    shipAddress: AddressParams;
    billAddress: AddressParams;
  },
): Promise<{ success: true; cart: Cart } | { success: false; error: string }> {
  return actionResult(async () => {
    const result = await updateOrderAddresses(cartId, {
      email: params.email,
      shipping_address: {
        ...params.shipAddress,
        quick_checkout: true,
      },
      billing_address: {
        ...params.billAddress,
        quick_checkout: true,
      },
    });

    if (!result.success) {
      throw new Error(result.error);
    }

    return { cart: result.cart };
  }, "Failed to prepare payment");
}

export async function expressCheckoutCreateSession(
  cartId: string,
  paymentMethodId: string,
  gatewayPaymentMethodId: string,
): ReturnType<typeof createCheckoutPaymentSession> {
  return createCheckoutPaymentSession(cartId, paymentMethodId, {
    stripe_payment_method_id: gatewayPaymentMethodId,
  });
}

export async function expressCheckoutFinalize(
  cartId: string,
  sessionId: string,
): Promise<
  { success: true; order: unknown } | { success: false; error: string }
> {
  return actionResult(async () => {
    const sessionResult = await completeCheckoutPaymentSession(
      cartId,
      sessionId,
    );
    if (!sessionResult.success) {
      throw new Error(sessionResult.error);
    }

    const orderResult = await completeCheckoutOrder(cartId);
    if (!orderResult.success) {
      throw new Error(orderResult.error);
    }

    return { order: orderResult.order };
  }, "Failed to finalize order");
}
