"use server";

import type {
  Address,
  AddressCreateParams,
  AddressUpdateParams,
} from "@spree/sdk";
import { updateTag } from "next/cache";
import { getClient, withAuthRefresh } from "@/lib/spree";
import { actionResult, withFallback } from "./utils";

export async function getAddresses() {
  return withFallback(
    async () => {
      return withAuthRefresh(async (options) => {
        return getClient().customer.addresses.list(undefined, options);
      });
    },
    { data: [] } as { data: Address[] },
  );
}

export async function getAddress(id: string) {
  return withFallback(async () => {
    return withAuthRefresh(async (options) => {
      return getClient().customer.addresses.get(id, options);
    });
  }, null);
}

export async function createAddress(address: AddressCreateParams) {
  return actionResult(async () => {
    const result = await withAuthRefresh(async (options) => {
      return getClient().customer.addresses.create(address, options);
    });
    updateTag("addresses");
    return { address: result };
  }, "Failed to create address");
}

export async function updateAddress(id: string, address: AddressUpdateParams) {
  return actionResult(async () => {
    const result = await withAuthRefresh(async (options) => {
      return getClient().customer.addresses.update(id, address, options);
    });
    updateTag("addresses");
    return { address: result };
  }, "Failed to update address");
}

export async function deleteAddress(id: string) {
  return actionResult(async () => {
    await withAuthRefresh(async (options) => {
      return getClient().customer.addresses.delete(id, options);
    });
    updateTag("addresses");
    return {};
  }, "Failed to delete address");
}
