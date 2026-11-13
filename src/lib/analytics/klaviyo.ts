import type { Cart, LineItem, Order, Product, Variant } from "@spree/sdk";
import { lineItemAmount } from "@/lib/utils/price";

/**
 * Klaviyo's onsite events, sent through the script the store's Google Tag
 * Manager container loads, so the shopper's cookie consent can gate it. The
 * server sends what only it knows (profiles, orders, refunds); the browser
 * sends browsing events and Started Checkout, and identifies the shopper so
 * their anonymous history joins their profile.
 *
 * A call made before the script loads waits up to KLAVIYO_WAIT_MS for it, and
 * only while the shopper stays on that page, so a shopper who lands on a
 * product page still sends its view, but an earlier page's calls are dropped.
 * Every call builds its payload only once the script is there.
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

type Call = (onsite: KlaviyoOnsite) => unknown;

/** How long a call waits for the script before it is dropped. */
export const KLAVIYO_WAIT_MS = 10_000;
const WAIT_POLL_MS = 250;

// Calls made before the script loaded, each tied to the page it was made on.
let waiting: { path: string; madeAt: number; call: Call }[] = [];
let waitTimer: ReturnType<typeof setInterval> | undefined;

function run(onsite: KlaviyoOnsite, call: Call): void {
  try {
    call(onsite);
  } catch {
    // Analytics must never break the page
  }
}

function send(call: Call): void {
  if (typeof window === "undefined") return;
  const onsite = klaviyo();
  if (onsite) {
    run(onsite, call);
    return;
  }
  waiting.push({ path: window.location.pathname, madeAt: Date.now(), call });
  waitTimer ??= setInterval(releaseWaiting, WAIT_POLL_MS);
}

// A page view tracked at hydration comes before GTM has loaded the script.
// Its calls wait for it, but only while the shopper is still on that page.
function releaseWaiting(): void {
  const now = Date.now();
  waiting = waiting.filter(
    (entry) =>
      entry.path === window.location.pathname &&
      now - entry.madeAt < KLAVIYO_WAIT_MS,
  );
  const onsite = klaviyo();
  if (onsite) {
    for (const entry of waiting) run(onsite, entry.call);
    waiting = [];
  }
  if (waiting.length === 0) {
    clearInterval(waitTimer);
    waitTimer = undefined;
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
