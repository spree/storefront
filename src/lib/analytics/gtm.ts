import { sendGTMEvent } from "@next/third-parties/google";
import type {
  Cart,
  LineItem,
  Order,
  OrderGroup,
  Product,
  Variant,
} from "@spree/sdk";

interface GA4Item {
  item_id: string;
  item_name: string;
  item_variant?: string;
  price?: number;
  quantity?: number;
  index?: number;
  item_list_id?: string;
  item_list_name?: string;
  item_category?: string;
  discount?: number;
  coupon?: string;
}

interface ItemMappingOptions {
  index?: number;
  listId?: string;
  listName?: string;
  variant?: Variant | null;
}

function safeParseFloat(value: string | undefined | null): number {
  const parsed = parseFloat(value as string);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function mapProductToGA4Item(
  product: Product,
  options: ItemMappingOptions = {},
): GA4Item {
  const { index, listId, listName, variant } = options;

  const price = variant?.price ?? product.price;
  const originalPrice = variant?.original_price ?? product.original_price;

  const currentAmount =
    price?.amount != null ? parseFloat(price.amount) : undefined;
  const originalAmount =
    originalPrice?.amount != null
      ? parseFloat(originalPrice.amount)
      : undefined;

  let discount: number | undefined;
  if (
    currentAmount != null &&
    originalAmount != null &&
    originalAmount > currentAmount
  ) {
    discount = originalAmount - currentAmount;
  }

  const item: GA4Item = {
    item_id: variant?.id || product.default_variant_id || product.id,
    item_name: product.name,
    price: currentAmount,
  };

  if (variant?.options_text) {
    item.item_variant = variant.options_text;
  }
  if (variant?.sku) {
    item.item_id = variant.sku;
  }
  if (discount != null && discount > 0) {
    item.discount = discount;
  }
  if (index != null) {
    item.index = index;
  }
  if (listId) {
    item.item_list_id = listId;
  }
  if (listName) {
    item.item_list_name = listName;
  }
  if (product.categories && product.categories.length > 0) {
    item.item_category = product.categories[0].name;
  }

  return item;
}

export function mapLineItemToGA4Item(
  lineItem: LineItem,
  options: { index?: number; listId?: string; listName?: string } = {},
): GA4Item {
  const item: GA4Item = {
    item_id: lineItem.id,
    item_name: lineItem.name,
    price: safeParseFloat(lineItem.price),
    quantity: lineItem.quantity,
  };

  if (lineItem.options_text) {
    item.item_variant = lineItem.options_text;
  }
  if (options.index != null) {
    item.index = options.index;
  }
  if (options.listId) {
    item.item_list_id = options.listId;
  }
  if (options.listName) {
    item.item_list_name = options.listName;
  }

  const discountTotal = safeParseFloat(lineItem.discount_total);
  if (discountTotal < 0) {
    const quantity = Math.max(lineItem.quantity ?? 1, 1);
    item.discount = Math.abs(discountTotal) / quantity;
  }

  return item;
}

function pushEcommerceEvent(
  eventName: string,
  ecommerceData: Record<string, unknown>,
): void {
  sendGTMEvent({ ecommerce: null });
  sendGTMEvent({ event: eventName, ecommerce: ecommerceData });
}

// --- Event Functions ---

let lastViewItemListKey: string | null = null;

export function trackViewItemList(
  products: Product[],
  listId: string,
  listName: string,
  currency: string,
): void {
  if (products.length === 0) return;

  const key = `${listId}:${products.map((p) => p.id).join(",")}`;
  if (lastViewItemListKey === key) return;
  lastViewItemListKey = key;

  pushEcommerceEvent("view_item_list", {
    item_list_id: listId,
    item_list_name: listName,
    currency,
    items: products.map((product, index) =>
      mapProductToGA4Item(product, { index, listId, listName }),
    ),
  });
}

export function trackSelectItem(
  product: Product,
  listId: string,
  listName: string,
  index: number,
  currency: string,
): void {
  pushEcommerceEvent("select_item", {
    item_list_id: listId,
    item_list_name: listName,
    currency,
    items: [mapProductToGA4Item(product, { index, listId, listName })],
  });
}

export function trackViewItem(
  product: Product,
  currency: string,
  variant?: Variant | null,
): void {
  const item = mapProductToGA4Item(product, { variant });
  pushEcommerceEvent("view_item", {
    currency,
    value: item.price ?? 0,
    items: [item],
  });
}

export function trackAddToCart(
  product: Product,
  variant: Variant | null,
  quantity: number,
  currency: string,
): void {
  const item = mapProductToGA4Item(product, { variant });
  item.quantity = quantity;
  pushEcommerceEvent("add_to_cart", {
    currency,
    value: (item.price ?? 0) * quantity,
    items: [item],
  });
}

export function trackRemoveFromCart(
  lineItem: LineItem,
  currency: string,
): void {
  pushEcommerceEvent("remove_from_cart", {
    currency,
    value: safeParseFloat(lineItem.total),
    items: [mapLineItemToGA4Item(lineItem)],
  });
}

export function trackViewCart(order: Cart | Order): void {
  pushEcommerceEvent("view_cart", {
    currency: order.currency,
    value: safeParseFloat(order.item_total),
    items:
      order.items?.map((item, index) =>
        mapLineItemToGA4Item(item, { index }),
      ) ?? [],
  });
}

function buildOrderEcommercePayload(
  order: Cart | Order | OrderGroup,
  extras?: Record<string, unknown>,
): Record<string, unknown> {
  // A marketplace checkout that reached several sellers is one purchase made
  // of several orders: report it once, with every order's items.
  const orders = "orders" in order ? order.orders : [order];
  const coupon = orders
    .flatMap((o) => o.discounts ?? [])
    .find((d) => d.code)?.code;
  return {
    currency: order.currency,
    value: safeParseFloat(order.total),
    ...(coupon && { coupon }),
    ...extras,
    items: orders
      .flatMap((o) => o.items ?? [])
      .map((item, index) => mapLineItemToGA4Item(item, { index })),
  };
}

export function trackBeginCheckout(order: Cart | Order): void {
  pushEcommerceEvent("begin_checkout", buildOrderEcommercePayload(order));
}

export function trackAddShippingInfo(
  order: Cart | Order,
  shippingTier?: string,
): void {
  pushEcommerceEvent(
    "add_shipping_info",
    buildOrderEcommercePayload(order, {
      ...(shippingTier && { shipping_tier: shippingTier }),
    }),
  );
}

export function trackAddPaymentInfo(
  order: Cart | Order,
  paymentType?: string,
): void {
  pushEcommerceEvent(
    "add_payment_info",
    buildOrderEcommercePayload(order, {
      ...(paymentType && { payment_type: paymentType }),
    }),
  );
}

export function trackPurchase(order: Order | OrderGroup): void {
  const key = `gtm_purchase_${order.number}`;
  try {
    if (typeof window !== "undefined" && localStorage.getItem(key)) {
      return;
    }
  } catch {
    // Storage unavailable (private browsing, quota exceeded) — proceed without dedup
  }

  pushEcommerceEvent(
    "purchase",
    buildOrderEcommercePayload(order, {
      transaction_id: order.number,
      tax: safeParseFloat(order.tax_total),
      shipping: safeParseFloat(order.delivery_total),
    }),
  );

  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(key, "1");
    }
  } catch {
    // Storage unavailable — dedup won't persist but purchase event was sent
  }
}

export function trackQuickSearch(
  products: Product[],
  searchTerm: string,
  currency: string,
): void {
  pushEcommerceEvent("view_search_results", {
    search_term: searchTerm,
    currency,
    items: products.map((product, index) =>
      mapProductToGA4Item(product, {
        index,
        listId: "quick-search",
        listName: "Quick Search",
      }),
    ),
  });
}

let lastViewSearchResultsKey: string | null = null;

export function trackViewSearchResults(
  products: Product[],
  searchTerm: string,
  currency: string,
): void {
  if (products.length === 0) return;

  const key = `${searchTerm}:${products.map((p) => p.id).join(",")}`;
  if (lastViewSearchResultsKey === key) return;
  lastViewSearchResultsKey = key;

  pushEcommerceEvent("view_search_results", {
    search_term: searchTerm,
    currency,
    items: products.map((product, index) =>
      mapProductToGA4Item(product, {
        index,
        listId: "search-results",
        listName: "Search Results",
      }),
    ),
  });
}
