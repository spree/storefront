import { type NextRequest, NextResponse } from "next/server";
import { SUPPORTED_LOCALES } from "@/i18n/locales";
import { REQUEST_PATHNAME_HEADER } from "@/i18n/routing";
import { getAccessTokenCookieName } from "@/lib/spree/cookies";
import { decodeJwtSub, liveAccessToken } from "@/lib/spree/jwt";
import { createSpreeMiddleware } from "@/lib/spree/middleware";
import { isMissingStorefrontResource } from "@/lib/spree/missing-resource";
import { getDefaultCountry, getDefaultLocale } from "@/lib/store";

const spreeMiddleware = createSpreeMiddleware({
  defaultCountry: getDefaultCountry(),
  defaultLocale: getDefaultLocale(),
  supportedLocales: SUPPORTED_LOCALES,
});

/**
 * Matches no route, so Next.js answers with app/global-not-found.tsx and a
 * real 404 status.
 */
const NOT_FOUND_REWRITE_PATH = "/_storefront-not-found";

const STOREFRONT_PATH = /^\/([^/]+)\/([^/]+)(\/.+)$/;

/**
 * Marks a URL the proxy answered with the 404 page, scoped to that path. The
 * 404 page's cart and session providers call Server Actions and refresh the
 * router on that same URL; without the marker the record's own route answers
 * them with a different page tree and the browser reloads into the 404 page
 * again, in a loop.
 */
const MISSING_PAGE_COOKIE = "spree_missing_page";

/**
 * The marker's value: whose 404 it is. A product can be missing for a guest
 * but visible to a signed-in customer (their catalogs), so a marker set for
 * one session is not trusted for another. Guests keep the original "1".
 */
function missingPageMarker(token: string | undefined): string {
  return token ? `customer:${decodeJwtSub(token) ?? ""}` : "1";
}

/**
 * Whether a marker was set for this session. A customer token without a
 * `sub` can't be told apart from another customer's, so it never matches and
 * the record is checked again instead.
 */
function markerMatchesSession(
  marker: string,
  token: string | undefined,
): boolean {
  const expected = missingPageMarker(token);
  return marker === expected && expected !== "customer:";
}

/**
 * Status codes only matter for full page loads. Next.js strips its own router
 * headers before the proxy runs, so in-app navigations, prefetches and Server
 * Actions are told apart by the browser's Sec-Fetch-Dest instead. Crawlers
 * and other clients that don't send it are treated as page loads.
 */
function isPageLoad(request: NextRequest): boolean {
  const destination = request.headers.get("sec-fetch-dest");
  return (
    (request.method === "GET" || request.method === "HEAD") &&
    (!destination || destination === "document")
  );
}

function rewriteToNotFound(request: NextRequest): NextResponse {
  // Forward the original URL so the 404 page renders in the visitor's country
  // and language.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(REQUEST_PATHNAME_HEADER, request.nextUrl.pathname);
  return NextResponse.rewrite(new URL(NOT_FOUND_REWRITE_PATH, request.url), {
    request: { headers: requestHeaders },
  });
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const response = spreeMiddleware(request);

  // Redirects already decided the response; only a pass-through path is
  // canonical /{country}/{locale}/... at this point.
  if (response.status !== 200) return response;

  const { pathname } = request.nextUrl;
  const match = pathname.match(STOREFRONT_PATH);
  if (!match) return response;

  // A signed-in customer can see products a guest can't (their catalogs), so
  // the check asks as them, the same way the page will.
  const token = liveAccessToken(
    request.cookies.get(getAccessTokenCookieName())?.value,
  );
  const marker = request.cookies.get(MISSING_PAGE_COOKIE)?.value;
  const markedMissing = marker !== undefined;
  if (!isPageLoad(request)) {
    if (!markedMissing) return response;
    if (markerMatchesSession(marker, token)) return rewriteToNotFound(request);
    // The session changed since the 404 (a sign-in, or an expired token
    // refreshed on the 404 page): check the record again as this session
    // rather than send the request to a route that may not exist for it.
  }

  const [, country, locale, path] = match;
  if (
    await isMissingStorefrontResource(path, {
      country,
      locale,
      ...(token ? { token } : undefined),
    })
  ) {
    const notFound = rewriteToNotFound(request);
    // Keep the country and language cookies the middleware set for this URL,
    // which the 404 page's cart and session actions read.
    for (const cookie of response.cookies.getAll()) {
      notFound.cookies.set(cookie);
    }
    notFound.cookies.set(MISSING_PAGE_COOKIE, missingPageMarker(token), {
      path: pathname,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60,
    });
    return notFound;
  }

  // The record exists again (or never went missing), so stop routing this
  // URL's actions to the 404 page.
  if (markedMissing) {
    response.cookies.set(MISSING_PAGE_COOKIE, "", {
      path: pathname,
      maxAge: 0,
    });
  }
  return response;
}

export const config = {
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico|.*\\..*$).*)"],
};
