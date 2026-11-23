import { cookies } from "next/headers";
import { getConfig } from "./config";
import { isJwtExpired } from "./jwt";
import {
  cartCookieBaseName,
  DEFAULT_SURFACE,
  SURFACES,
  type Surface,
} from "./surface";

const DEFAULT_CART_COOKIE = "_spree_cart_token";
const DEFAULT_ACCESS_TOKEN_COOKIE = "_spree_jwt";
const DEFAULT_REFRESH_TOKEN_COOKIE = "_spree_refresh_token";
const CART_TOKEN_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const ACCESS_TOKEN_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/**
 * Whether the current execution context may write cookies. Next.js allows
 * cookie mutation only in Server Actions and Route Handlers, never during a
 * Server Component render. We probe with a harmless deletion of a throwaway
 * cookie: it succeeds in a writable context and throws otherwise.
 */
export async function canPersistCookies(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    cookieStore.set("_spree_write_probe", "", { maxAge: -1, path: "/" });
    return true;
  } catch {
    return false;
  }
}

function getCartCookieName(surface: Surface = DEFAULT_SURFACE): string {
  if (surface === "wholesale") return cartCookieBaseName(surface);
  try {
    return getConfig().cartCookieName ?? DEFAULT_CART_COOKIE;
  } catch {
    return DEFAULT_CART_COOKIE;
  }
}

function getCartIdCookieName(surface: Surface = DEFAULT_SURFACE): string {
  return `${getCartCookieName(surface)}_id`;
}

function getAccessTokenCookieName(): string {
  try {
    return getConfig().accessTokenCookieName ?? DEFAULT_ACCESS_TOKEN_COOKIE;
  } catch {
    return DEFAULT_ACCESS_TOKEN_COOKIE;
  }
}

// --- Cart Cookies (token + ID always managed together) ---
//
// Cart cookies are surface-scoped: the DTC and wholesale carts live in separate
// cookie pairs so a customer can hold both at once. `surface` defaults to DTC,
// preserving every existing caller.

export async function getCartToken(
  surface: Surface = DEFAULT_SURFACE,
): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(getCartCookieName(surface))?.value;
}

export async function getCartId(
  surface: Surface = DEFAULT_SURFACE,
): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(getCartIdCookieName(surface))?.value;
}

export async function setCartCookies(
  id: string,
  token?: string,
  surface: Surface = DEFAULT_SURFACE,
): Promise<void> {
  const cookieStore = await cookies();
  const opts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: CART_TOKEN_MAX_AGE,
  };

  cookieStore.set(getCartIdCookieName(surface), id, opts);
  if (token) {
    cookieStore.set(getCartCookieName(surface), token, opts);
  }
}

export async function clearCartCookies(
  surface: Surface = DEFAULT_SURFACE,
): Promise<void> {
  const cookieStore = await cookies();
  const opts = { maxAge: -1, path: "/" };
  cookieStore.set(getCartCookieName(surface), "", opts);
  cookieStore.set(getCartIdCookieName(surface), "", opts);
}

/**
 * Clear the cart cookies for every surface. Used on logout / account deletion,
 * where leaving a wholesale cart cookie behind would leak it into the next
 * session.
 */
export async function clearAllCartCookies(): Promise<void> {
  await Promise.all(SURFACES.map((surface) => clearCartCookies(surface)));
}

// --- Access Token (JWT) ---

export async function getAccessToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(getAccessTokenCookieName())?.value;
}

/**
 * The customer JWT to send on catalog reads (products, filters, search), or
 * undefined for a guest. The Store API narrows those reads to the customer's
 * catalogs and prices them for the customer, on every channel.
 *
 * The cookie outlives the JWT (7-day cookie vs 1-hour JWT) and catalog reads
 * render in Server Components, where the token can't be refreshed. An expired
 * token reads as a guest rather than failing the whole page with a 401; the
 * client refreshes the session on mount and re-renders with the live token.
 */
export async function getCatalogAccessToken(): Promise<string | undefined> {
  const token = await getAccessToken();
  return token && !isJwtExpired(token, 30) ? token : undefined;
}

export async function setAccessToken(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(getAccessTokenCookieName(), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });
}

export async function clearAccessToken(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(getAccessTokenCookieName(), "", {
    maxAge: -1,
    path: "/",
  });
}

// --- Refresh Token ---

function getRefreshTokenCookieName(): string {
  return DEFAULT_REFRESH_TOKEN_COOKIE;
}

export async function getRefreshToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(getRefreshTokenCookieName())?.value;
}

export async function setRefreshToken(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(getRefreshTokenCookieName(), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });
}

export async function clearRefreshToken(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(getRefreshTokenCookieName(), "", {
    maxAge: -1,
    path: "/",
  });
}

// --- Cart Options (combined cart + access tokens for cart/checkout/payment actions) ---

export async function getCartOptions(
  surface: Surface = DEFAULT_SURFACE,
): Promise<{
  spreeToken: string | undefined;
  token: string | undefined;
}> {
  const spreeToken = await getCartToken(surface);
  const token = await getAccessToken();
  return { spreeToken, token };
}

// --- Cart ID (required) ---

export async function requireCartId(
  surface: Surface = DEFAULT_SURFACE,
): Promise<string> {
  const cartId = await getCartId(surface);
  // Reject a cookie that was cross-written with the other surface's cart id
  // (pre-channel-scoped-listing poisoning); fall through to re-resolve cleanly.
  if (cartId && !(await isPoisonedDtcCartId(cartId, surface))) {
    return cartId;
  }

  // Authenticated user without a (valid) cart ID cookie — resolve via
  // carts.list() through the surface's client. carts.list is channel-scoped on
  // the backend, so it only returns carts for this surface's channel.
  const token = await getAccessToken();
  if (token) {
    const { getClientForSurface } = await import("./config");
    const response = await getClientForSurface(surface).carts.list({ token });
    if (response.data.length > 0) {
      const cart = response.data[0];
      await setCartCookies(cart.id, cart.token, surface);
      return cart.id;
    }
  }

  throw new Error("No cart found");
}

/**
 * Backstop for DTC cookies poisoned before channel-scoped listing existed: the
 * poison only ever flowed wholesale→DTC (the DTC list fallback adopted the
 * user's only cart, a wholesale one, into the DTC cookie). So on the DTC
 * surface, a cart-id cookie equal to the wholesale cookie's cart id is always
 * the poison and must be dropped. Directional on purpose — never drops the
 * wholesale surface's legitimate cart; the channel_id guard handles the
 * wholesale side. Single source of truth for this check — cart.ts and the
 * requireCartId path both import it rather than re-implementing it.
 */
export async function isPoisonedDtcCartId(
  cartId: string,
  surface: Surface,
): Promise<boolean> {
  if (surface !== "dtc") return false;
  const wholesaleCartId = await getCartId("wholesale");
  return Boolean(wholesaleCartId) && wholesaleCartId === cartId;
}
