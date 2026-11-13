"use server";

import type { ListParams } from "@spree/sdk";
import { getClient, withAuthRefresh } from "@/lib/spree";
import { actionResult, withFallback } from "./utils";

export async function getBuyerOffers(params?: ListParams) {
  return withFallback(
    async () => {
      return withAuthRefresh(async (options) => {
        return getClient().customer.buyerOffers.list(params, options);
      });
    },
    {
      data: [],
      meta: {
        page: 1,
        limit: 25,
        count: 0,
        pages: 0,
        from: 0,
        to: 0,
        in: 0,
        previous: null,
        next: null,
      },
    },
  );
}

export async function createBuyerOffer(
  variantId: string,
  amount: string,
  message: string,
) {
  return actionResult(async () => {
    const offer = await withAuthRefresh((options) =>
      getClient().customer.buyerOffers.create(
        {
          variant_id: variantId,
          offer_amount: amount,
          buyer_message: message,
        },
        options,
      ),
    );
    return { offer };
  }, "Could not send your offer.");
}

export async function completeBuyerOffer(id: string) {
  return actionResult(
    async () => ({
      offer: await withAuthRefresh((options) =>
        getClient().customer.buyerOffers.completePurchase(id, options),
      ),
    }),
    "Could not accept this price.",
  );
}

export async function withdrawBuyerOffer(id: string) {
  return actionResult(
    async () => ({
      offer: await withAuthRefresh((options) =>
        getClient().customer.buyerOffers.withdraw(id, options),
      ),
    }),
    "Could not withdraw your offer.",
  );
}
