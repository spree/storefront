import { type NextRequest, NextResponse } from "next/server";
import {
  canonicalizeLocale,
  matchLocale,
  negotiateAcceptLanguage,
  negotiateLocale,
} from "@/i18n/normalize";
import { REQUEST_PATHNAME_HEADER, REQUEST_SEARCH_HEADER } from "@/i18n/routing";
import { buildAccountLoginHref } from "@/lib/utils/account-redirect";

const COUNTRY_COOKIE = "spree_country";
const LOCALE_COOKIE = "spree_locale";
const ACCESS_TOKEN_COOKIE = "_spree_jwt";
const REFRESH_TOKEN_COOKIE = "_spree_refresh_token";
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

const HAS_COUNTRY_LOCALE =
  /^\/([a-z]{2})\/([a-z]{2,3}(?:-[a-z0-9]{2,8})*)(\/|$)/i;

export interface SpreeMiddlewareConfig {
  /** Default country ISO code (default: 'us') */
  defaultCountry?: string;
  /** Default locale code (default: 'en') */
  defaultLocale?: string;
  /** Locale codes for which the storefront has message bundles. */
  supportedLocales?: readonly string[];
  /** Routes to skip — prefixes matched with startsWith (default: ['/_next', '/api', '/favicon.ico']) */
  staticRoutes?: string[];
  /** JWT cookie used to identify a potentially authenticated account request. */
  accessTokenCookieName?: string;
  /** Refresh-token cookie used to preserve recoverable account sessions. */
  refreshTokenCookieName?: string;
}

const PUBLIC_ACCOUNT_PATHS = new Set([
  "/account",
  "/account/register",
  "/account/complete-registration",
  "/account/forgot-password",
  "/account/reset-password",
]);

// Reached before a session exists, and at a depth the exact-path set cannot
// name: the provider appends its own segments.
const PUBLIC_ACCOUNT_PREFIXES = ["/account/callback/"];

function isProtectedAccountPath(pathname: string, localizedPrefix: string) {
  const localizedPath = pathname.slice(localizedPrefix.length);
  const normalizedPath = localizedPath.replace(/\/+$/, "") || "/";

  return (
    normalizedPath.startsWith("/account/") &&
    !PUBLIC_ACCOUNT_PATHS.has(normalizedPath) &&
    !PUBLIC_ACCOUNT_PREFIXES.some((prefix) => normalizedPath.startsWith(prefix))
  );
}

/**
 * Set spree_country / spree_locale cookies on a response so that
 * `getLocaleOptions()` reads values matching the URL during SSR.
 */
function setLocaleCookies(
  response: NextResponse,
  country: string,
  locale: string,
): void {
  response.cookies.set(COUNTRY_COOKIE, country, {
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  response.cookies.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

function nextWithLocaleContext(
  request: NextRequest,
  country: string,
  locale: string,
): NextResponse {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(REQUEST_PATHNAME_HEADER, request.nextUrl.pathname);
  requestHeaders.set(REQUEST_SEARCH_HEADER, request.nextUrl.search);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  setLocaleCookies(response, country, locale);
  return response;
}

/**
 * Creates a Next.js middleware that handles:
 * - Redirecting bare paths to /{country}/{locale}/...
 * - Detecting country from cookies → geo headers → default
 * - Detecting locale from cookies → accept-language → default
 * - Syncing spree_country / spree_locale cookies with URL segments so
 *   server-side data fetching (via `getLocaleOptions()`) uses the correct market
 */
export function createSpreeMiddleware(
  config: SpreeMiddlewareConfig = {},
): (request: NextRequest) => NextResponse {
  const defaultCountry = config.defaultCountry ?? "us";
  const supportedLocales = config.supportedLocales ?? [];
  const configuredDefaultLocale = config.defaultLocale ?? "en";
  const defaultLocale =
    (supportedLocales.length > 0
      ? (matchLocale(configuredDefaultLocale, supportedLocales) ??
        matchLocale("en", supportedLocales) ??
        supportedLocales[0])
      : canonicalizeLocale(configuredDefaultLocale)) ?? "en";
  const staticRoutes = config.staticRoutes ?? [
    "/_next",
    "/api",
    "/dev",
    "/favicon.ico",
  ];
  const accessTokenCookieName =
    config.accessTokenCookieName ?? ACCESS_TOKEN_COOKIE;
  const refreshTokenCookieName =
    config.refreshTokenCookieName ?? REFRESH_TOKEN_COOKIE;

  return function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Skip static routes
    if (staticRoutes.some((route) => pathname.startsWith(route))) {
      return NextResponse.next();
    }

    // Skip if pathname contains a file extension (static assets)
    if (/\.\w+$/.test(pathname)) {
      return NextResponse.next();
    }

    // Already has /{country}/{locale} prefix — sync cookies with URL segments
    const match = pathname.match(HAS_COUNTRY_LOCALE);
    if (match) {
      const country = match[1].toLowerCase();
      const originalPrefix = `/${match[1]}/${match[2]}`;
      const locale =
        supportedLocales.length > 0
          ? negotiateLocale(match[2], supportedLocales)
          : canonicalizeLocale(match[2]);

      // An unknown locale cannot safely retain the requested country: the
      // global default locale may not be enabled by that country's Market.
      // Use the configured default route while preserving the remaining path.
      if (!locale) {
        const url = request.nextUrl.clone();
        url.pathname = `/${defaultCountry}/${defaultLocale}${pathname.slice(originalPrefix.length)}`;
        const response = NextResponse.redirect(url);
        setLocaleCookies(response, defaultCountry, defaultLocale);
        return response;
      }

      const canonicalPrefix = `/${country}/${locale}`;

      if (originalPrefix !== canonicalPrefix) {
        const url = request.nextUrl.clone();
        url.pathname = `${canonicalPrefix}${pathname.slice(originalPrefix.length)}`;
        const response = NextResponse.redirect(url);
        setLocaleCookies(response, country, locale);
        return response;
      }

      if (
        isProtectedAccountPath(pathname, canonicalPrefix) &&
        !request.cookies.get(accessTokenCookieName)?.value &&
        !request.cookies.get(refreshTokenCookieName)?.value
      ) {
        const loginHref = buildAccountLoginHref(
          canonicalPrefix,
          `${pathname}${request.nextUrl.search}`,
        );
        const response = NextResponse.redirect(
          new URL(loginHref, request.nextUrl),
        );
        setLocaleCookies(response, country, locale);
        return response;
      }

      return nextWithLocaleContext(request, country, locale);
    }

    // Detect country: cookie → geo headers → default
    const country =
      request.cookies.get(COUNTRY_COOKIE)?.value ??
      request.headers.get("x-vercel-ip-country")?.toLowerCase() ??
      request.headers.get("cf-ipcountry")?.toLowerCase() ??
      defaultCountry;

    // Detect locale: cookie → accept-language → default
    const cookieValue = request.cookies.get(LOCALE_COOKIE)?.value;
    const cookieLocale =
      supportedLocales.length > 0
        ? negotiateLocale(cookieValue, supportedLocales)
        : canonicalizeLocale(cookieValue);
    const acceptLanguage = request.headers.get("accept-language");
    const acceptedLocale =
      supportedLocales.length > 0
        ? negotiateAcceptLanguage(acceptLanguage, supportedLocales)
        : canonicalizeLocale(acceptLanguage?.split(",")[0]?.split(";")[0]);
    const locale = cookieLocale ?? acceptedLocale ?? defaultLocale;

    const url = request.nextUrl.clone();
    url.pathname = `/${country}/${locale}${pathname === "/" ? "" : pathname}`;

    const response = NextResponse.redirect(url);
    setLocaleCookies(response, country, locale);
    return response;
  };
}
