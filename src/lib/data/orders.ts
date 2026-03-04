"use server";

import { getOrder as _getOrder, listOrders } from "@spree/next";
import type { OrderListParams } from "@spree/sdk";
import { withFallback } from "./utils";

export async function getOrders(params?: OrderListParams) {
  return withFallback(() => listOrders(params), {
    data: [],
    meta: { page: 1, limit: 25, count: 0, pages: 0 },
  });
}

export async function getOrder(id: string, params?: Record<string, unknown>) {
  return withFallback(() => _getOrder(id, params), null);
}
