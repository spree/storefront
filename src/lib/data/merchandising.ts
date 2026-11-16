"use server";

import type {
  MerchandisingListParams,
  StoreMerchandisingPlacement,
} from "@spree/sdk";
import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import { getClient, getLocaleOptions } from "@/lib/spree";
import { marketplaceFor } from "@/lib/spree/marketplace";

async function cachedListMerchandising(
  params: MerchandisingListParams,
  options: { locale?: string; country?: string },
) {
  "use cache: remote";
  cacheLife("minutes");
  cacheTag("merchandising", `merchandising-${params.surface ?? "homepage"}`);
  try {
    return await marketplaceFor(getClient()).merchandising.list(
      params,
      options,
    );
  } catch {
    return { data: [] };
  }
}

export async function getMerchandisingPlacements(
  params: MerchandisingListParams = { surface: "homepage" },
): Promise<StoreMerchandisingPlacement[]> {
  try {
    const options = await getLocaleOptions();
    const response = await cachedListMerchandising(params, options);
    return response.data ?? [];
  } catch {
    return [];
  }
}

export async function getMerchandisingPlacementsForPreview(
  params: MerchandisingListParams = { surface: "homepage" },
): Promise<StoreMerchandisingPlacement[]> {
  await connection();
  try {
    const options = await getLocaleOptions();
    const response = await marketplaceFor(getClient()).merchandising.list(
      params,
      options,
    );
    return response.data ?? [];
  } catch {
    return [];
  }
}
