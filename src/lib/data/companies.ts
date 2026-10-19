"use server";

import type { Address, Company } from "@spree/sdk";
import { getClient, withAuthRefresh } from "@/lib/spree";
import { getAddresses } from "./addresses";
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
 * Which addresses checkout may offer for this cart, split by the book they
 * came out of so the picker can label them.
 *
 * A purchase for a company offers the company's sites *and* the buyer's own,
 * which is exactly what the cart accepts as `shipping_address_id`. The two
 * are kept apart rather than merged: a warehouse and someone's flat in one
 * unlabelled list is how a pallet ends up on a driveway, so the guard against
 * that mis-click is making the distinction visible, not hiding half the list.
 *
 * The company is the cart's own choice when it made one. Otherwise a buyer
 * with exactly one membership is unambiguous and resolves to it — which is
 * what the server does when the cart stays silent, so checkout has to offer
 * the same book the cart would accept an id from.
 *
 * @param cartCompanyId `company_id` from the cart, null until the buyer picks
 *   a node and when they are buying personally.
 */
export async function getCheckoutAddressBook(
  cartCompanyId: string | null | undefined,
): Promise<{
  /** The company the purchase is for, or null for a personal one. */
  company: { id: string; name: string } | null;
  /** The company's sites, including the ones it inherits. Empty without one. */
  companyAddresses: Address[];
  /** The buyer's own book. */
  personalAddresses: Address[];
}> {
  const company = await resolveCompany(cartCompanyId);
  const { data: personalAddresses } = await getAddresses();

  if (!company) {
    return { company: null, companyAddresses: [], personalAddresses };
  }

  const companyAddresses = await getCompanyAddresses(company.id);
  return { company, companyAddresses, personalAddresses };
}

async function resolveCompany(cartCompanyId: string | null | undefined) {
  // Read the named node rather than matching it against the membership rows:
  // standing covers a node and everything beneath it, so a buyer may legitimately
  // buy for a division they hold no membership row of their own on.
  if (cartCompanyId) {
    const company = await getCompany(cartCompanyId);
    return company ? { id: company.id, name: company.name } : null;
  }

  const { data: memberships } = await getCompanyMemberships();
  if (memberships.length !== 1) return null;

  const sole = memberships[0]?.company;
  return sole ? { id: sole.id, name: sole.name } : null;
}
