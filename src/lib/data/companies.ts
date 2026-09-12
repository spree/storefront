"use server";

import type {
  Address,
  Company,
  CompanyAddressParams,
  CompanyInvitation,
  CompanyMembership,
  Order,
} from "@spree/sdk";
import { updateTag } from "next/cache";
import { getClient, withAuthRefresh } from "@/lib/spree";
import { actionResult, withFallback } from "./utils";

/**
 * The buyer's own standing — the companies they may act for. Empty for an
 * ordinary shopper, which is what hides the whole company section.
 */
/** The membership rows the account endpoint returns, each with its node. */
export type CompanyMembershipWithCompany = CompanyMembership & {
  company: Company;
};

export async function getMyCompanies() {
  return withFallback(
    async () => {
      return withAuthRefresh(async (options) => {
        return getClient().account.companies(options);
      });
    },
    { data: [] } as { data: CompanyMembershipWithCompany[] },
  );
}

export async function getCompany(id: string) {
  return withFallback(async () => {
    return withAuthRefresh(async (options) => {
      return getClient().companies.get(id, options);
    });
  }, null);
}

export async function updateCompany(id: string, params: { name?: string }) {
  return actionResult(async () => {
    const result = await withAuthRefresh(async (options) => {
      return getClient().companies.update(id, params, options);
    });
    updateTag("companies");
    return { company: result as Company };
  }, "Failed to update company");
}

export async function getCompanyMembers(companyId: string) {
  return withFallback(
    async () => {
      return withAuthRefresh(async (options) => {
        return getClient().companies.members.list(
          companyId,
          undefined,
          options,
        );
      });
    },
    { data: [] } as { data: CompanyMembership[] },
  );
}

/**
 * Adds someone by email. The server decides what that means: an existing
 * customer becomes a member at once, anyone else is emailed an invitation —
 * so the response is one or the other, told apart by its id prefix.
 */
export async function addCompanyMember(companyId: string, email: string) {
  return actionResult(async () => {
    const result = await withAuthRefresh(async (options) => {
      return getClient().companies.members.create(
        companyId,
        { customer_email: email },
        options,
      );
    });
    updateTag("companies");
    return { member: result };
  }, "Failed to add member");
}

export async function removeCompanyMember(companyId: string, id: string) {
  return actionResult(async () => {
    await withAuthRefresh(async (options) => {
      return getClient().companies.members.delete(companyId, id, options);
    });
    updateTag("companies");
    return {};
  }, "Failed to remove member");
}

export async function getCompanyInvitations(companyId: string) {
  return withFallback(
    async () => {
      return withAuthRefresh(async (options) => {
        return getClient().companies.invitations.list(
          companyId,
          undefined,
          options,
        );
      });
    },
    { data: [] } as { data: CompanyInvitation[] },
  );
}

/** Revokes rather than erases: the emailed token then stops resolving. */
export async function revokeCompanyInvitation(companyId: string, id: string) {
  return actionResult(async () => {
    await withAuthRefresh(async (options) => {
      return getClient().companies.invitations.delete(companyId, id, options);
    });
    updateTag("companies");
    return {};
  }, "Failed to revoke invitation");
}

/**
 * The node's sites and the ones it inherits from its ancestors — the same set
 * checkout will accept an address id from.
 */
export async function getCompanyAddresses(companyId: string) {
  return withFallback(
    async () => {
      return withAuthRefresh(async (options) => {
        return getClient().companies.addresses.list(
          companyId,
          undefined,
          options,
        );
      });
    },
    { data: [] } as { data: Address[] },
  );
}

export async function createCompanyAddress(
  companyId: string,
  address: CompanyAddressParams,
) {
  return actionResult(async () => {
    const result = await withAuthRefresh(async (options) => {
      return getClient().companies.addresses.create(
        companyId,
        address,
        options,
      );
    });
    updateTag("companies");
    return { address: result };
  }, "Failed to create address");
}

export async function updateCompanyAddress(
  companyId: string,
  id: string,
  address: Partial<CompanyAddressParams>,
) {
  return actionResult(async () => {
    const result = await withAuthRefresh(async (options) => {
      return getClient().companies.addresses.update(
        companyId,
        id,
        address,
        options,
      );
    });
    updateTag("companies");
    return { address: result };
  }, "Failed to update address");
}

export async function deleteCompanyAddress(companyId: string, id: string) {
  return actionResult(async () => {
    await withAuthRefresh(async (options) => {
      return getClient().companies.addresses.delete(companyId, id, options);
    });
    updateTag("companies");
    return {};
  }, "Failed to delete address");
}

/** Completed purchases across the node's subtree, not just this node. */
export async function getCompanyOrders(companyId: string, page = 1) {
  return withFallback(
    async () => {
      return withAuthRefresh(async (options) => {
        return getClient().companies.orders.list(companyId, { page }, options);
      });
    },
    { data: [] } as { data: Order[] },
  );
}

/**
 * The invitation behind a token from the invite email. Deliberately
 * unauthenticated — the invitee has no account yet, which is the whole point
 * of the flow.
 */
export async function lookupCompanyInvitation(token: string) {
  return withFallback(async () => {
    return getClient().companyInvitations.lookup(token);
  }, null);
}

/**
 * Accepts by token. Pass registration details for someone with no account —
 * it is created with the invited email — or call it authenticated to bind the
 * invitation to the signed-in customer.
 */
export async function acceptCompanyInvitation(
  token: string,
  params?: {
    first_name?: string;
    last_name?: string;
    password?: string;
    password_confirmation?: string;
  },
) {
  return actionResult(async () => {
    const result = await withAuthRefresh(async (options) => {
      return getClient().companyInvitations.accept(token, params, options);
    });
    updateTag("companies");
    return { membership: result };
  }, "Failed to accept invitation");
}
