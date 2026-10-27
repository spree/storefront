import { INTERNAL_ORIGIN, resolveLocalPath } from "@/lib/utils/path";

/**
 * Name of the customer group the seeded wholesale price list keys off.
 *
 * Pricing only. Whether a buyer may trade at all is their company's standing
 * (see `pricing_access` on any priced payload) — a group decides what a
 * company is charged, never whether it is allowed to buy.
 */
export const WHOLESALE_GROUP_NAME = "Wholesale";

/**
 * Minimum quantity of a single item required to unlock wholesale (trade) pricing.
 * Mirrors the VolumeRule min_quantity on the seeded "Wholesale" price list
 * (spree/core/db/sample_data/wholesale.rb). This is a demo constant — the
 * production version would read the applicable volume rule's min_quantity from
 * the API per variant. Keep in sync with the seed if the seed changes.
 */
export const WHOLESALE_MIN_QUANTITY = 10;

/**
 * Why this viewer cannot see prices, straight from the API — `null` when they
 * can.
 *
 * Read off any priced payload rather than inferred from the session: the
 * server decides, and the code names the remedy, so the storefront does not
 * have to work out whether a missing price means "sign in", "register a
 * business" or "your application is still being reviewed".
 */
export type PricingAccess = string | null | undefined;

/** Whether this viewer may see prices and buy — the API said nothing is missing. */
export function isTradeEnabled(pricingAccess: PricingAccess): boolean {
  return pricingAccess == null;
}

/**
 * What the buyer has to do about a hidden price, derived from the API's code.
 *
 * `login_required` and `company_required` are the open-source codes; anything
 * else is a code the merchant's activation policy supplies (an approval flow
 * adds its own, e.g. a pending application), which reads as "waiting on the
 * merchant" because that is the only thing the buyer can do about it.
 */
export function pricingRemedy(
  pricingAccess: PricingAccess,
): "none" | "sign-in" | "register" | "awaiting-approval" {
  if (pricingAccess == null) return "none";
  if (pricingAccess === "login_required") return "sign-in";
  if (pricingAccess === "company_required") return "register";
  return "awaiting-approval";
}

/**
 * The portal's sign-in destination, optionally carrying `returnTo` as the
 * `?redirect=` target. On a `prices_hidden` channel the catalog root renders for
 * guests, so sign-in affordances need this dedicated page — pointing them at the
 * catalog would land the buyer back where they started. A `redirect` already on
 * `returnTo` is dropped: it is a stale return target from an earlier round trip,
 * and keeping it would nest redirects inside redirects.
 */
export function wholesaleSignInHref(
  basePath: string,
  returnTo?: string | null,
): string {
  const signInPath = `${basePath}/wholesale/sign-in`;
  const target = resolveLocalPath(returnTo);
  if (!target) return signInPath;

  const url = new URL(target, INTERNAL_ORIGIN);
  url.searchParams.delete("redirect");
  const returnPath = `${url.pathname}${url.search}${url.hash}`;
  if (returnPath === signInPath) return signInPath;

  return `${signInPath}?redirect=${encodeURIComponent(returnPath)}`;
}
