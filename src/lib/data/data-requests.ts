"use server";

import type { DataRequest } from "@spree/sdk";
import { getClient } from "@/lib/spree";
import { actionResult } from "./utils";

/**
 * Look up the data request an emailed confirmation token belongs to.
 * Returns null for a token Spree does not recognise.
 */
export async function getDataRequest(
  token: string,
): Promise<DataRequest | null> {
  try {
    return await getClient().dataRequests.get(token);
  } catch {
    return null;
  }
}

/**
 * Confirm a data request with its emailed token. Called from a button press
 * only: some mail scanners open links and run the page's scripts.
 */
export async function confirmDataRequest(token: string) {
  return actionResult(
    async () => ({
      dataRequest: await getClient().dataRequests.confirm(token),
    }),
    "Could not confirm the request",
  );
}
