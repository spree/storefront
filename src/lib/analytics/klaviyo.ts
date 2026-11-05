import type { Cart, LineItem, Order, Product, Variant } from "@spree/sdk";
import { lineItemAmount } from "@/lib/utils/price";

/**
 * Klaviyo's onsite events, sent through the script DocumentShell loads when
 * KLAVIYO_COMPANY_ID is set. The server sends what only it knows (profiles,
 * orders, refunds); the browser sends browsing events and Started Checkout,
 * and identifies the shopper so their anonymous history joins their profile.
 *
 * Every call does nothing while the script is not loaded, and builds its
 * payload only once it is.
 */

interface KlaviyoOnsite {
  track: (event: string, properties: Record<string, unknown>) => unknown;
  identify: (properties: Record<string, unknown>) => unknown;
}

type KlaviyoItem = {
  ProductID: string;
  SKU?: string;
  ProductName: string;
  Quantity?: number;
  ItemPrice?: number;
  RowTotal?: number;
  ProductURL: string;
  ImageURL?: string;
  Categories?: string[];
};

function klaviyo(): KlaviyoOnsite | undefined {
  if (typeof window === "undefined") return undefined;
  const onsite = (window as unknown as { klaviyo?: KlaviyoOnsite }).klaviyo;
  return onsite && typeof onsite.track === "function" ? onsite : undefined;
}

function toNumber(value: string | null | undefined): number | undefined {
  if (value == null) return undefined;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

// Only called inside `send`, so the window is there.
function storefrontUrl(basePath: string, path: string): string {
  return `${window.location.origin}${basePath}${path}`;
}

function send(call: (onsite: KlaviyoOnsite) => unknown): void {
  const onsite = klaviyo();
  if (!onsite) return;
  try {
    call(onsite);
  } catch {
    // Analytics must never break the page
  }
}

function productPrice(product: Product, variant?: Variant | null) {
  return (variant?.price ?? product.price)?.amount ?? null;
}

function mapProductToKlaviyoItem(
  product: Product,
  basePath: string,
  variant?: Variant | null,
): KlaviyoItem {
  return {
    ProductID: product.id,
    SKU: variant?.sku ?? product.default_variant?.sku ?? undefined,
    ProductName: product.name,
    ItemPrice: toNumber(productPrice(product, variant)),
    ProductURL: storefrontUrl(basePath, `/products/${product.slug}`),
    ImageURL: product.thumbnail_url ?? undefined,
    Categories: product.categories?.map((category) => category.name) ?? [],
  };
}

function mapLineItemToKlaviyoItem(
  lineItem: LineItem,
  basePath: string,
): KlaviyoItem {
  return {
    // A line item carries no product id in the Store API.
    ProductID: lineItem.variant_id,
    ProductName: lineItem.name,
    Quantity: lineItem.quantity,
    ItemPrice: toNumber(lineItem.price),
    RowTotal: toNumber(lineItemAmount(lineItem)),
    ProductURL: storefrontUrl(basePath, `/products/${lineItem.slug}`),
    ImageURL: lineItem.thumbnail_url ?? undefined,
  };
}

/** Joins this browser's history to the profile the server writes. */
export function identifyKlaviyo(email: string | null | undefined): void {
  if (!email) return;
  send((onsite) => onsite.identify({ email }));
}

const KLAVIYO_IDENTITY_COOKIE = "__kla_id";

/**
 * Drops the shopper Klaviyo remembers, so the next person on this browser
 * browses anonymously. Klaviyo's script has no reset: the identity lives in
 * its cookie, set on this host or a parent domain, and in memory until the
 * page reloads.
 *
 * @returns whether there was an identity to drop, so the caller reloads.
 */
export async function forgetKlaviyo(): Promise<boolean> {
  if (typeof document === "undefined") return false;
  const present = document.cookie
    .split("; ")
    .some((cookie) => cookie.startsWith(`${KLAVIYO_IDENTITY_COOKIE}=`));
  if (!present) return false;

  const labels = window.location.hostname.split(".");
  const domains = labels.map((_, index) => labels.slice(index).join("."));
  await Promise.allSettled(
    [undefined, ...domains].map((domain) => expireCookie(domain)),
  );
  return true;
}

async function expireCookie(domain: string | undefined): Promise<void> {
  if ("cookieStore" in window && window.cookieStore) {
    await window.cookieStore.delete({
      name: KLAVIYO_IDENTITY_COOKIE,
      path: "/",
      ...(domain && { domain }),
    });
    return;
  }
  const scope = domain ? `; domain=${domain}` : "";
  // biome-ignore lint/suspicious/noDocumentCookie: fallback for browsers without Cookie Store API
  document.cookie = `${KLAVIYO_IDENTITY_COOKIE}=; Max-Age=0; path=/${scope}`;
}

export function trackKlaviyoViewedProduct(
  product: Product,
  basePath: string,
): void {
  send((onsite) =>
    onsite.track("Viewed Product", mapProductToKlaviyoItem(product, basePath)),
  );
}

export function trackKlaviyoAddedToCart(
  product: Product,
  variant: Variant | null,
  quantity: number,
  basePath: string,
): void {
  send((onsite) => {
    const item = mapProductToKlaviyoItem(product, basePath, variant);
    const price = productPrice(product, variant);

    return onsite.track("Added to Cart", {
      ...item,
      Quantity: quantity,
      $value: toNumber(lineItemAmount({ price, quantity })) ?? 0,
      AddedItemProductName: item.ProductName,
      AddedItemQuantity: quantity,
    });
  });
}

/**
 * Klaviyo's abandoned-checkout trigger. The event id carries the time so a
 * shopper who returns to checkout later starts a new one.
 */
export function trackKlaviyoStartedCheckout(
  cart: Cart | Order,
  basePath: string,
): void {
  send((onsite) => {
    const items = (cart.items ?? []).map((lineItem) =>
      mapLineItemToKlaviyoItem(lineItem, basePath),
    );

    return onsite.track("Started Checkout", {
      $event_id: `${cart.id}_${Math.floor(Date.now() / 1000)}`,
      $value: toNumber(cart.total) ?? 0,
      ItemNames: items.map((item) => item.ProductName),
      Items: items,
      CheckoutURL: storefrontUrl(basePath, "/cart"),
    });
  });
}
