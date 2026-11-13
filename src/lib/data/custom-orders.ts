"use server";

import type { CustomOrderRequest } from "@spree/sdk";
import { getClient, withAuthRefresh } from "@/lib/spree";

export async function getCustomOrderRequests() {
  return withAuthRefresh((options) =>
    getClient().customer.customOrderRequests.list({ limit: 50 }, options),
  );
}

export async function getCustomOrderRequest(
  id: string,
): Promise<CustomOrderRequest> {
  return withAuthRefresh((options) =>
    getClient().customer.customOrderRequests.get(id, options),
  );
}

export async function cancelCustomOrderRequest(id: string) {
  return withAuthRefresh((options) =>
    getClient().customer.customOrderRequests.cancel(id, options),
  );
}
