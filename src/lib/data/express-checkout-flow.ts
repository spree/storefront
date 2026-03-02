"use server";

import type { AddressParams } from "@spree/sdk";
import { selectShippingRate } from "@/lib/data/checkout";
import {
  completeCheckoutOrder,
  completeCheckoutPaymentSession,
  createCheckoutPaymentSession,
} from "@/lib/data/payment";
import {
  type QuickCheckoutPartialAddress,
  quickCheckoutAdvance,
  quickCheckoutUpdateAddress,
  quickCheckoutUpdateFullAddress,
} from "@/lib/data/quick-checkout";
import { actionResult } from "./utils";

export async function expressCheckoutResolveShipping(
  orderId: string,
  address: QuickCheckoutPartialAddress,
) {
  return actionResult(async () => {
    const updateResult = await quickCheckoutUpdateAddress(orderId, address);
    if (!updateResult.success) {
      throw new Error(updateResult.error);
    }

    const advanceResult = await quickCheckoutAdvance(orderId);
    if (!advanceResult.success) {
      throw new Error(advanceResult.error);
    }

    return { order: advanceResult.order as Record<string, unknown> };
  }, "Failed to resolve shipping");
}

export async function expressCheckoutSelectRates(
  orderId: string,
  selections: Array<{ shipmentId: string; rateId: string }>,
) {
  return actionResult(async () => {
    let order: Record<string, unknown> | null = null;

    for (const { shipmentId, rateId } of selections) {
      const result = await selectShippingRate(orderId, shipmentId, rateId);
      if (!result.success) {
        throw new Error(result.error);
      }
      order = result.order as Record<string, unknown>;
    }

    if (!order) {
      throw new Error("No shipment selections provided");
    }

    return { order };
  }, "Failed to select shipping rates");
}

export async function expressCheckoutPreparePayment(
  orderId: string,
  params: {
    email: string;
    shipAddress: AddressParams;
    billAddress: AddressParams;
  },
) {
  return actionResult(async () => {
    const fullResult = await quickCheckoutUpdateFullAddress(orderId, params);
    if (!fullResult.success) {
      throw new Error(fullResult.error);
    }

    const advanceResult = await quickCheckoutAdvance(orderId);
    if (!advanceResult.success) {
      throw new Error(advanceResult.error);
    }

    return { order: advanceResult.order as Record<string, unknown> };
  }, "Failed to prepare payment");
}

export async function expressCheckoutFinalize(
  orderId: string,
  sessionId: string,
) {
  return actionResult(async () => {
    const sessionResult = await completeCheckoutPaymentSession(
      orderId,
      sessionId,
    );
    if (!sessionResult.success) {
      throw new Error(sessionResult.error);
    }

    const orderResult = await completeCheckoutOrder(orderId);
    if (!orderResult.success) {
      throw new Error(orderResult.error);
    }

    return {};
  }, "Failed to finalize order");
}

export async function expressCheckoutCreateSession(
  orderId: string,
  paymentMethodId: string,
  stripePaymentMethodId: string,
) {
  return createCheckoutPaymentSession(
    orderId,
    paymentMethodId,
    stripePaymentMethodId,
  );
}
