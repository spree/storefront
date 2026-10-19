"use server";

import type { DataRequest } from "@spree/sdk";
import { getClient } from "@/lib/spree";
import { actionResult } from "./utils";

export type DataRequestLookup =
  | { found: true; dataRequest: DataRequest }
  | { found: false; reason: "invalid" | "error" };

/**
 * Look up the data request an emailed confirmation token belongs to. A token
 * Spree does not recognise is "invalid"; anything else that fails (network,
 * server, rate limit) is "error", so the page can offer a retry rather than
 * calling a good link broken.
 */
export async function getDataRequest(
  token: string,
): Promise<DataRequestLookup> {
  try {
    return {
      found: true,
      dataRequest: await getClient().dataRequests.get(token),
    };
  } catch (error) {
    const status =
      error && typeof error === "object" && "status" in error
        ? (error as { status?: number }).status
        : undefined;
    return { found: false, reason: status === 404 ? "invalid" : "error" };
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
