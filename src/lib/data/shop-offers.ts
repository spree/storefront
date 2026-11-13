"use server";

import type { ListParams } from "@spree/sdk";
import { getClient, withAuthRefresh } from "@/lib/spree";
import { withFallback } from "./utils";

const emptyPage = {
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
};

export async function getShopOffers(params?: ListParams) {
  return withFallback(async () => {
    return withAuthRefresh(async (options) => {
      return getClient().customer.shopOffers.list(params, options);
    });
  }, emptyPage);
}

export async function markShopOffersSeen(ids?: string[]) {
  return withFallback(
    async () => {
      return withAuthRefresh(async (options) => {
        return getClient().customer.shopOffers.markSeen(
          ids?.length ? { ids } : {},
          options,
        );
      });
    },
    { updated: 0 },
  );
}

export async function getUnreadShopOfferCount() {
  const page = await getShopOffers({ limit: 50 });
  return page.data.filter((offer) => !offer.seen).length;
}
