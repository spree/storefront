"use server";

import type {
  Order,
  OrderGroup,
  OrderListParams,
  PaginatedResponse,
} from "@spree/sdk";
import {
  DEFAULT_SURFACE,
  getCartOptions,
  getClient,
  getClientForSurface,
  type Surface,
  withAuthRefresh,
} from "@/lib/spree";
import { withFallback } from "./utils";

/**
 * The customer's purchase history — one row per checkout.
 *
 * A checkout that reached several sellers divided into one order per seller,
 * and the backend lists the group holding them rather than the orders inside
 * it, so the customer sees the single purchase they made. Typed as the union
 * the endpoint can answer with; the installed SDK still describes it as orders
 * alone.
 */
export async function getOrders(
  params?: OrderListParams,
): Promise<PaginatedResponse<Order | OrderGroup>> {
  return withFallback(
    async () => {
      return withAuthRefresh(async (options) => {
        return getClient().customer.orders.list(params, options);
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

/**
 * Get a single order by ID or number.
 * Works for both authenticated users (JWT) and guests (spreeToken).
 * The surface selects the cart token cookie + client so wholesale orders
 * resolve through the wholesale channel.
 */
export async function getOrder(
  id: string,
  params?: Record<string, unknown>,
  surface: Surface = DEFAULT_SURFACE,
) {
  return withFallback(async () => {
    const options = await getCartOptions(surface);
    return getClientForSurface(surface).orders.get(id, params, options);
  }, null);
}
