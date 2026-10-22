"use server";

import type { Address, Cart, Company } from "@spree/sdk";
import { getClient, withAuthRefresh } from "@/lib/spree";
import { withFallback } from "./utils";

/** The buyer's company memberships in this store, each with its node. */
export async function getCompanyMemberships() {
  return withFallback(
    async () => {
      return withAuthRefresh(async (options) => {
        return getClient().account.companies(options);
      });
    },
    { data: [] as Array<{ company: Company }> },
  );
}

/** A company node. Resolved through the buyer's standing, so a node they
 * cannot act for is a 404 rather than a readable record. */
export async function getCompany(id: string) {
  return withFallback(async () => {
    return withAuthRefresh(async (options) => {
      return getClient().companies.get(id, options);
    });
  }, null);
}

/**
 * A company node's sites, including the ones it inherits from the nodes above
 * it — a division ships to its headquarters' docks as readily as to its own.
 */
export async function getCompanyAddresses(
  companyId: string,
): Promise<Address[]> {
  return withFallback(async () => {
    const { data } = await withAuthRefresh(async (options) => {
      return getClient().companies.addresses.list(
        companyId,
        undefined,
        options,
      );
    });
    return data;
  }, []);
}

/**
 * Names the company on a cart that has not named one, when the buyer belongs
 * to exactly one.
 *
 * The server will not infer this. A cart offers a company's sites only once
 * it names the company, deliberately — a membership is standing, not a
 * decision about who this particular purchase is for. Choosing is the
 * storefront's job, and a buyer with a single membership has nothing to
 * choose between, so checkout chooses for them rather than hiding their
 * employer's sites behind a picker with one option.
 *
 * Several memberships are left alone: picking one would be guessing which
 * business is being bought for, and the wrong guess invoices the wrong one.
 *
 * @returns the cart as the server left it, repriced for the company, or null
 *   when nothing was written — callers keep the cart they already had.
 */
export async function adoptSoleStandingCompany(
  cart: Cart,
): Promise<Cart | null> {
  if (cart.company_id) return null;

  const { data: memberships } = await getCompanyMemberships();
  if (memberships.length !== 1) return null;

  const company = memberships[0]?.company;
  if (!company) return null;

  return withFallback(async () => {
    return withAuthRefresh(async (options) => {
      return getClient().carts.update(
        cart.id,
        { company_id: company.id },
        options,
      );
    });
  }, null);
}

/**
 * Which addresses checkout may offer for this cart — the buyer's own book
 * plus the sites of the company the cart names, each carrying the book it
 * came out of so the picker can label them.
 *
 * The cart is asked rather than the two books separately, because the cart
 * decides what it will accept. Rebuilding the list here is how a picker ends
 * up offering a site the cart then refuses an id from, silently.
 *
 * Requires a signed-in customer. A guest has no book and no company, so
 * callers skip it rather than spend a failing round-trip.
 */
export async function getCartAddresses(cartId: string): Promise<Address[]> {
  return withFallback(async () => {
    const { data } = await withAuthRefresh(async (options) => {
      return getClient().carts.addresses.list(cartId, undefined, options);
    });
    return data;
  }, []);
}
