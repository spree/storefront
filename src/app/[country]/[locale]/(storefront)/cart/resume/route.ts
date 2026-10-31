import { type NextRequest, NextResponse } from "next/server";
import { getClient, setCartCookies } from "@/lib/spree";

const COUNTRY = /^[a-z]{2}$/i;
const LOCALE = /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i;

interface ResumeRouteProps {
  params: Promise<{ country: string; locale: string }>;
}

/**
 * Opens a cart an AI shopping agent built in this browser's checkout.
 *
 * The agent hands the buyer a link carrying the cart's id and token (Spree's
 * UCP `continue_url`). Adopting the cart replaces its token, so the link
 * works once: whoever built the cart or sent the link loses access to the
 * buyer's details and the order. A guessed or stale link lands on the empty
 * cart page rather than on someone else's checkout.
 */
export async function GET(
  request: NextRequest,
  { params }: ResumeRouteProps,
): Promise<NextResponse> {
  const { country, locale } = await params;
  const id = request.nextUrl.searchParams.get("id");
  const token = request.nextUrl.searchParams.get("token");
  // The segments arrive decoded, so `%2F%2Fevil.example` would read as
  // `//evil.example` and turn the Location below into another site's address.
  const basePath =
    COUNTRY.test(country) && LOCALE.test(locale) ? `/${country}/${locale}` : "";

  // A relative Location: behind a proxy the server only knows its internal
  // address, and the browser resolves this against the one it used. It also
  // drops the token from the address bar.
  const redirectTo = (pathname: string): NextResponse =>
    new NextResponse(null, { status: 307, headers: { Location: pathname } });

  if (!id || !token) return redirectTo(`${basePath}/cart`);

  try {
    const cart = await getClient().carts.rotateToken(id, { spreeToken: token });
    await setCartCookies(cart.id, cart.token);

    return redirectTo(`${basePath}/checkout/${encodeURIComponent(cart.id)}`);
  } catch {
    return redirectTo(`${basePath}/cart`);
  }
}
