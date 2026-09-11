import { type NextRequest, NextResponse } from "next/server";
import { loginWithProvider } from "@/lib/data/customer";
import {
  OAUTH_STATE_COOKIE_NAME,
  REGISTRATION_TOKEN_COOKIE_NAME,
  registrationTokenCookieOptions,
} from "@/lib/spree";
import { resolveAccountRedirect } from "@/lib/utils/account-redirect";

const PROVIDER_KEY = /^[a-z0-9_]{1,50}$/;

interface CallbackRouteContext {
  params: Promise<{ country: string; locale: string; provider: string }>;
}

/**
 * Where a provider sends the browser back. The exchange happens on the server,
 * so the client secret never reaches the browser and the tokens are written
 * straight into httpOnly cookies.
 */
export async function GET(
  request: NextRequest,
  context: CallbackRouteContext,
): Promise<NextResponse> {
  const { country, locale, provider } = await context.params;
  const basePath = `/${country}/${locale}`;
  const origin = request.nextUrl.origin;

  const redirectTo = (path: string): NextResponse => {
    const response = NextResponse.redirect(new URL(path, origin));
    response.cookies.set(OAUTH_STATE_COOKIE_NAME, "", {
      maxAge: -1,
      path: "/",
    });
    return response;
  };

  const fail = (code: string) =>
    redirectTo(`${basePath}/account?social_error=${encodeURIComponent(code)}`);

  if (!PROVIDER_KEY.test(provider)) return fail("invalid_provider");
  // The shopper cancelled at the provider, or it refused on its own terms.
  if (request.nextUrl.searchParams.get("error")) return fail("access_denied");

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  if (!code || !state) return fail("invalid_oauth_state");

  const result = await loginWithProvider({ provider, code, state });

  if (result.status === "failed") return fail(result.error);

  // Only a destination this market allows, and never the login page itself.
  const returnTo = resolveAccountRedirect(result.returnTo, basePath);
  const destination =
    returnTo && returnTo !== `${basePath}/account`
      ? returnTo
      : `${basePath}/account`;

  if (result.status === "registration_required") {
    const completionUrl = new URL(
      `${basePath}/account/complete-registration`,
      origin,
    );
    if (destination !== `${basePath}/account`) {
      completionUrl.searchParams.set("redirect", destination);
    }

    const response = NextResponse.redirect(completionUrl);
    response.cookies.set(OAUTH_STATE_COOKIE_NAME, "", {
      maxAge: -1,
      path: "/",
    });
    response.cookies.set(
      REGISTRATION_TOKEN_COOKIE_NAME,
      result.registrationToken,
      registrationTokenCookieOptions(),
    );
    return response;
  }

  return redirectTo(destination);
}
