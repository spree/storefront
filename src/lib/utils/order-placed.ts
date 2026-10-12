import { isOrderGroup, type Order, type OrderGroup } from "@spree/sdk";

/**
 * Query param carrying the ids of the orders a split checkout produced.
 *
 * After a marketplace cart is split into an order group, `orders.get(cartId)`
 * no longer resolves (the cart link moves to the group, which the Store API
 * can't look up), so the thank-you page needs the child order ids to reload
 * after a refresh. Each order carries the cart token, so they resolve one by
 * one through `orders.get(orderId)`.
 */
export const ORDER_IDS_PARAM = "orders";

/** Upper bound on ids read back from the URL — a group has one per seller. */
const MAX_ORDER_IDS = 25;

const ORDER_ID_PATTERN = /^[A-Za-z0-9_]+$/;

/**
 * Where to send the customer after completing checkout. A split checkout
 * carries its order ids along so the confirmation survives a page refresh.
 */
export function orderPlacedPath(
  basePath: string,
  cartId: string,
  result?: Order | OrderGroup | null,
): string {
  const path = `${basePath}/order-placed/${cartId}`;
  if (!result || !isOrderGroup(result) || result.orders.length === 0) {
    return path;
  }

  const params = new URLSearchParams({
    [ORDER_IDS_PARAM]: result.orders.map((order) => order.id).join(","),
  });
  return `${path}?${params.toString()}`;
}

/** Reads the order ids back from the `orders` query param, dropping junk. */
export function parseOrderIds(value: string | null | undefined): string[] {
  if (!value) return [];

  const ids = value
    .split(",")
    .map((id) => id.trim())
    .filter((id) => ORDER_ID_PATTERN.test(id));

  return [...new Set(ids)].slice(0, MAX_ORDER_IDS);
}
