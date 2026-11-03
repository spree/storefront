"use server";

import type {
  Exchange,
  Order,
  OrderGroup,
  Return,
  ReturnReason,
  Variant,
} from "@spree/sdk";
import { getCartOptions, getClient, getLocaleOptions } from "@/lib/spree";
import { actionResult, withFallback } from "./utils";

/**
 * Who is asking about an order. A signed-in customer is recognised by their
 * session; a guest by the order token from the link we emailed them, which the
 * API accepts in place of a login (X-Spree-Token).
 */
export interface OrderAccess {
  orderToken?: string;
}

async function requestOptions(access?: OrderAccess) {
  const options = await getCartOptions();
  return access?.orderToken
    ? { ...options, spreeToken: access.orderToken }
    : options;
}

/**
 * A purchase as a guest opens it from an emailed link — one order, or the
 * group a multi-seller checkout divided into.
 */
export async function getGuestPurchase(
  id: string,
  orderToken: string,
): Promise<Order | OrderGroup | null> {
  return withFallback(
    async () =>
      getClient().orders.get(
        id,
        undefined,
        await requestOptions({ orderToken }),
      ),
    null,
  );
}

/** One order by id, for a signed-in customer or a guest holding its token. */
export async function getOrderForReturns(
  id: string,
  access?: OrderAccess,
): Promise<Order | null> {
  return withFallback(async () => {
    const order = await getClient().orders.get(
      id,
      undefined,
      await requestOptions(access),
    );
    // A purchase that reached several sellers answers with its group; returns
    // are opened against the seller's own order, so only a plain order is
    // accepted here.
    return "orders" in order ? null : (order as Order);
  }, null);
}

/** The store's reasons for sending something back, for the request form. */
export async function getReturnReasons(): Promise<ReturnReason[]> {
  return withFallback(async () => {
    const response = await getClient().returnReasons.list(
      await getLocaleOptions(),
    );
    return response.data;
  }, []);
}

/** The returns and exchanges the customer opened on one order. */
export async function getPostSaleRequests(
  orderId: string,
  access?: OrderAccess,
): Promise<{ returns: Return[]; exchanges: Exchange[] }> {
  return withFallback(
    async () => {
      const options = await requestOptions(access);
      const client = getClient();
      const [returns, exchanges] = await Promise.all([
        client.orders.returns.list(
          orderId,
          { expand: ["return_line_items.variant"] },
          options,
        ),
        client.orders.exchanges.list(
          orderId,
          {
            expand: [
              "exchange_line_items.original_variant",
              "exchange_line_items.new_variant",
            ],
          },
          options,
        ),
      ]);
      return { returns: returns.data, exchanges: exchanges.data };
    },
    { returns: [], exchanges: [] },
  );
}

/**
 * The other variants of a product a customer can swap for — same product,
 * on sale and in stock, as the API will accept.
 */
export async function getExchangeOptions(
  productSlug: string,
  currentVariantId: string,
): Promise<Variant[]> {
  return withFallback(async () => {
    const product = await getClient().products.get(
      productSlug,
      { expand: ["variants"] },
      await getLocaleOptions(),
    );
    return (product.variants ?? []).filter(
      (variant) => variant.id !== currentVariantId && variant.purchasable,
    );
  }, []);
}

export interface RequestedUnit {
  fulfillment_item_id: string;
  quantity: number;
}

export interface ExchangedUnit extends RequestedUnit {
  new_variant_id: string;
}

/**
 * Opens what the customer asked for: a return for the items coming back for
 * money, an exchange for the ones being swapped. Two records because the API
 * keeps them apart — a refund and a replacement settle differently.
 */
export async function requestReturnAndExchange(
  orderId: string,
  input: {
    returns: RequestedUnit[];
    exchanges: ExchangedUnit[];
    reasonId?: string;
    memo?: string;
  },
  access?: OrderAccess,
) {
  return actionResult(async () => {
    const options = await requestOptions(access);
    const client = getClient();
    const shared = {
      reason_id: input.reasonId || undefined,
      memo: input.memo?.trim() || undefined,
    };

    const returnRecord =
      input.returns.length > 0
        ? await client.orders.returns.create(
            orderId,
            { items: input.returns, ...shared },
            options,
          )
        : undefined;
    const exchange =
      input.exchanges.length > 0
        ? await client.orders.exchanges.create(
            orderId,
            { items: input.exchanges, ...shared },
            options,
          )
        : undefined;

    return {
      returnNumber: returnRecord?.number ?? null,
      exchangeNumber: exchange?.number ?? null,
    };
  }, "Failed to send your request");
}

/** Withdraws a request the store has not acted on yet. */
export async function withdrawRequest(
  orderId: string,
  kind: "return" | "exchange",
  id: string,
  access?: OrderAccess,
) {
  return actionResult(async () => {
    const options = await requestOptions(access);
    const client = getClient();
    if (kind === "return") {
      await client.orders.returns.cancel(orderId, id, options);
    } else {
      await client.orders.exchanges.cancel(orderId, id, options);
    }
    return {};
  }, "Failed to withdraw your request");
}

/**
 * "Find my order". The answer never says whether the details matched: on a
 * match the link goes to the order's own address.
 */
export async function lookupOrder(
  number: string,
  email: string,
): Promise<{ ok: boolean }> {
  try {
    await getClient().orderLookups.create({ number, email });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
