import { CartDrawer } from "@/components/cart/CartDrawer";
import { MainContent, SkipLink } from "@/components/layout/SkipLink";
import { CartProvider } from "@/contexts/CartContext";
import { getCustomer } from "@/lib/data/customer";
import { getWholesaleChannel } from "@/lib/data/wholesale";
import { isWholesaleApproved } from "@/lib/wholesale";
import { WholesaleApplicationPending } from "./WholesaleApplicationPending";
import { WholesaleGuestBrowse } from "./WholesaleGuestBrowse";
import { WholesaleHeader } from "./WholesaleHeader";
import { WholesaleSignInWall } from "./WholesaleSignInWall";

interface WholesaleGateProps {
  basePath: string;
  /**
   * Portal content, as a function so it is invoked only in branches that should
   * render it — never for the sign-in wall or the pending state. A plain
   * `children` node would be constructed regardless of the gate's decision; the
   * thunk guarantees the catalog fetch runs only when the posture allows it (an
   * approved buyer, or a guest on a `prices_hidden` channel — never a guest on a
   * `login_required` channel, where the fetch would 401).
   */
  children: () => React.ReactNode;
  /**
   * Whether a guest may see this page on a `prices_hidden` channel. Only the
   * browse surfaces (catalog, PDP) set this — they render read-only with
   * sign-in-for-pricing prompts. Ordering surfaces (cart, quick order) leave it
   * false so a guest hits the sign-in wall instead of a page whose `useCart()`
   * would bind to the DTC provider (guests have no wholesale cart).
   */
  allowGuestBrowse?: boolean;
}

/**
 * Server-side gate for the portal (catalog, PDP, cart, quick order). Branches on
 * the channel's `storefront_access` posture, the session, and Wholesale-group
 * membership:
 *
 * - guest, `login_required` → inline sign-in / apply wall (the channel 401s the
 *   catalog fetch anyway, so nothing behind the wall would render)
 * - guest, `prices_hidden` → the catalog renders with prices replaced by a
 *   "sign in for pricing" prompt; ordering is gated behind sign-in
 * - authenticated, not approved → application-pending state (approval, not just
 *   login, unlocks trade pricing and ordering — same for both postures)
 * - approved member → the portal chrome + `children`, with the wholesale cart
 *   bound via <CartProvider surface="wholesale">
 *
 * Runs per navigation, so a login (which triggers a server re-render)
 * re-evaluates it. The apply page renders outside this gate so guests can
 * reach it.
 */
export async function WholesaleGate({
  basePath,
  children,
  allowGuestBrowse = false,
}: WholesaleGateProps) {
  const [customer, channel] = await Promise.all([
    getCustomer(),
    getWholesaleChannel(),
  ]);

  if (!customer) {
    // On a prices-hidden channel the catalog is browsable by guests (the API
    // just nulls the money fields), so render browse surfaces with
    // sign-in-for-pricing prompts instead of the hard wall. Ordering surfaces
    // (allowGuestBrowse=false) still wall guests off, and any other posture
    // (login_required, or an unknown/unreachable channel) always walls.
    if (allowGuestBrowse && channel?.storefront_access === "prices_hidden") {
      return (
        <WholesaleGuestBrowse basePath={basePath}>
          {children()}
        </WholesaleGuestBrowse>
      );
    }

    return (
      <>
        <SkipLink />
        <MainContent>
          <WholesaleSignInWall
            basePath={basePath}
            storefrontAccess={channel?.storefront_access}
          />
        </MainContent>
      </>
    );
  }

  if (!isWholesaleApproved(customer)) {
    return (
      <>
        <SkipLink />
        <MainContent>
          <WholesaleApplicationPending
            basePath={basePath}
            customerName={
              [customer.first_name, customer.last_name]
                .filter(Boolean)
                .join(" ") || customer.email
            }
            email={customer.email}
          />
        </MainContent>
      </>
    );
  }

  const displayName =
    [customer.first_name, customer.last_name].filter(Boolean).join(" ") ||
    customer.email;

  return (
    <CartProvider surface="wholesale">
      <SkipLink />
      <WholesaleHeader basePath={basePath} customerName={displayName} />
      <MainContent>{children()}</MainContent>
      {/* The wholesale portal needs its own drawer bound to THIS provider —
          the root layout's <CartDrawer /> reads the outer DTC context, so
          wholesale add-to-cart / quick-order opens would never reach it. */}
      <CartDrawer />
    </CartProvider>
  );
}
