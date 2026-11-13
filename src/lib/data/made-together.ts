"use server";

import { unstable_noStore as noStore } from "next/cache";
import { getProductCollaborators } from "@/lib/data/collaborators";
import { getProduct } from "@/lib/data/products";
import { buildMadeTogetherPresentation } from "@/lib/made-together/build-presentation";
import type { MadeTogetherPresentation } from "@/lib/made-together/types";

/**
 * Loads buyer-facing Made together data for the PDP buy box and collective
 * section. Safe to call from the client when the server render had no credits.
 */
export async function loadMadeTogetherPresentation(
  productIdOrSlug: string,
  basePath: string,
): Promise<MadeTogetherPresentation | null> {
  noStore();
  const collaborators = await getProductCollaborators(productIdOrSlug);
  if (collaborators.data.length === 0) return null;

  const product = await getProduct(productIdOrSlug, {
    expand: ["seller"],
  });
  return buildMadeTogetherPresentation(product, collaborators.data, basePath);
}
