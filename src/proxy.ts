import { type NextRequest, NextResponse } from "next/server";
import { SUPPORTED_LOCALES } from "@/i18n/locales";
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
 * Status codes only matter for full page loads. In-app navigations and
 * prefetches carry the RSC header and keep rendering the page's own
 * not-found UI, so they skip the extra Store API request.
 */
function isDocumentRequest(request: NextRequest): boolean {
  return (
    (request.method === "GET" || request.method === "HEAD") &&
    !request.headers.has("rsc") &&
    !request.headers.has("next-router-prefetch")
  );
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const response = spreeMiddleware(request);

  // Redirects already decided the response; only a pass-through path is
  // canonical /{country}/{locale}/... at this point.
  if (response.status !== 200 || !isDocumentRequest(request)) {
    return response;
  }

  const match = request.nextUrl.pathname.match(STOREFRONT_PATH);
  if (!match) return response;

  const [, country, locale, path] = match;
  if (await isMissingStorefrontResource(path, { country, locale })) {
    return NextResponse.rewrite(new URL(NOT_FOUND_REWRITE_PATH, request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico|.*\\..*$).*)"],
};
