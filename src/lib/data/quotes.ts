"use server";

import type { ListParams } from "@spree/sdk";
import { getClient, withAuthRefresh } from "@/lib/spree";
import { withFallback } from "./utils";

export async function getQuotes(params?: ListParams) {
  return withFallback(
    async () =>
      withAuthRefresh(async (options) =>
        getClient().quotes.list(params, options),
      ),
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

export async function getQuote(id: string) {
  return withAuthRefresh(async (options) =>
    getClient().quotes.get(id, options),
  );
}

export async function acceptQuote(id: string, idempotencyKey?: string) {
  return withAuthRefresh(async (options) =>
    getClient().quotes.accept(id, { idempotency_key: idempotencyKey }, options),
  );
}

export async function rejectQuote(id: string) {
  return withAuthRefresh(async (options) =>
    getClient().quotes.reject(id, options),
  );
}
