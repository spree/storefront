import { CartDrawer } from "@/components/cart/CartDrawer";
import { CartProvider } from "@/contexts/CartContext";
import { getCustomer } from "@/lib/data/customer";
import {
  getWholesaleChannel,
  getWholesalePricingAccess,
} from "@/lib/data/wholesale";
import { pricingRemedy } from "@/lib/wholesale";
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
 * the session and on the API's `pricing_access` code, which already accounts
 * for the channel's posture, the buyer's company standing and the store's
 * activation policy:
 *
 * - guest, prices gated → inline sign-in / register wall (a `login_required`
 *   channel 401s the catalog anyway, so nothing behind the wall would render)
 * - guest, prices browsable → the catalog renders with prices replaced by a
 *   "sign in for pricing" prompt; ordering is gated behind sign-in
 * - signed in, `company_required` → register-your-business state: they have an
 *   account but no company, so trade pricing and ordering stay closed
 * - signed in, any other code → awaiting-approval state. The open-source
 *   policy never gets here; a merchant running an approval flow supplies the
 *   code and this is the buyer's "we are reviewing it" screen
 * - prices visible → the portal chrome + `children`, with the wholesale cart
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
  const [customer, channel, pricingAccess] = await Promise.all([
    getCustomer(),
    getWholesaleChannel(),
    getWholesalePricingAccess(),
  ]);
  const remedy = pricingRemedy(pricingAccess);

  if (!customer) {
    // Browsable postures (prices_hidden, approval_required) null the money
    // fields rather than refusing the read, so render browse surfaces with
    // sign-in prompts instead of the hard wall. Ordering surfaces
    // (allowGuestBrowse=false) still wall guests off, and login_required —
    // which 401s the catalog — always walls.
    if (
      allowGuestBrowse &&
      (channel?.storefront_access === "prices_hidden" ||
        channel?.storefront_access === "approval_required")
    ) {
      return (
        <WholesaleGuestBrowse basePath={basePath}>
          {children()}
        </WholesaleGuestBrowse>
      );
    }

    return (
      <WholesaleSignInWall
        basePath={basePath}
        storefrontAccess={channel?.storefront_access}
      />
    );
  }

  if (remedy !== "none") {
    return (
      <WholesaleApplicationPending
        basePath={basePath}
        customerName={
          [customer.first_name, customer.last_name].filter(Boolean).join(" ") ||
          customer.email
        }
        email={customer.email}
        remedy={remedy}
      />
    );
  }

  const displayName =
    [customer.first_name, customer.last_name].filter(Boolean).join(" ") ||
    customer.email;

  return (
    <CartProvider surface="wholesale">
      <WholesaleHeader basePath={basePath} customerName={displayName} />
      <main>{children()}</main>
      {/* The wholesale portal needs its own drawer bound to THIS provider —
          the root layout's <CartDrawer /> reads the outer DTC context, so
          wholesale add-to-cart / quick-order opens would never reach it. */}
      <CartDrawer />
    </CartProvider>
  );
}
