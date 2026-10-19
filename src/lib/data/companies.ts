"use server";

import type { Address, Company, SelectableAddress } from "@spree/sdk";
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
 * Which addresses checkout may offer for this cart — the buyer's own book
 * plus the sites of the company the purchase is for, each carrying the book
 * it came out of so the picker can label them.
 *
 * The cart is asked rather than the two books separately, because the cart is
 * the one place that knows which company the purchase is for. That is not
 * always stated: a buyer with a single membership gets it resolved for them,
 * and reproducing that rule here is how checkout ends up offering a book the
 * cart would then refuse an id from.
 *
 * Requires a signed-in customer. A guest has no book and no company, so
 * callers skip it rather than spend a failing round-trip.
 */
export async function getCartAddresses(
  cartId: string,
): Promise<SelectableAddress[]> {
  return withFallback(async () => {
    const { data } = await withAuthRefresh(async (options) => {
      return getClient().carts.addresses.list(cartId, undefined, options);
    });
    return data;
  }, []);
}
