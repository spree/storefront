import type { CollaborationCredit, Product, Seller } from "@spree/sdk";
import { getSellerStorefront } from "@/lib/data/sellers";
import type { MadeTogetherMaker, MadeTogetherPresentation } from "./types";

function hasStarSellerBadge(
  seller: Pick<Seller, "badges"> | undefined,
): boolean {
  return (
    seller?.badges?.some(
      (badge) => badge.key === "star_seller" && badge.awarded_at != null,
    ) ?? false
  );
}

function makerFromSeller(
  seller: Seller,
  basePath: string,
  craftContribution: string | null,
  key: string,
): MadeTogetherMaker {
  return {
    key,
    name: seller.name,
    slug: seller.slug,
    href: seller.slug ? `${basePath}/sellers/${seller.slug}` : null,
    logoUrl: seller.square_logo_url || seller.logo_url,
    craftContribution,
    averageRating: seller.average_rating,
    reviewsCount: seller.reviews_count ?? 0,
    starSeller: hasStarSellerBadge(seller),
  };
}

async function makerFromCredit(
  credit: CollaborationCredit,
  basePath: string,
): Promise<MadeTogetherMaker> {
  const slug = credit.seller_slug;
  let enriched: Seller | null = null;
  if (slug) {
    try {
      const storefront = await getSellerStorefront(slug);
      enriched = storefront.seller;
    } catch {
      enriched = null;
    }
  }

  const name =
    credit.display_name || enriched?.name || credit.seller_name || "Maker";

  return {
    key: credit.id,
    name,
    slug,
    href: slug ? `${basePath}/sellers/${slug}` : null,
    logoUrl: enriched?.square_logo_url || enriched?.logo_url || null,
    craftContribution: credit.craft_contribution,
    averageRating: enriched?.average_rating ?? null,
    reviewsCount: enriched?.reviews_count ?? 0,
    starSeller: hasStarSellerBadge(enriched ?? undefined),
  };
}

/**
 * Buyer-facing roster for a co-created product: seller of record plus credited
 * partners, with enough display metadata for the PDP Made together block.
 */
export async function buildMadeTogetherPresentation(
  product: Product,
  credits: CollaborationCredit[],
  basePath: string,
): Promise<MadeTogetherPresentation | null> {
  if (credits.length === 0) return null;

  const makers: MadeTogetherMaker[] = [];
  const seenSlugs = new Set<string>();

  const sellerOfRecord = product.seller;
  if (sellerOfRecord?.slug) {
    seenSlugs.add(sellerOfRecord.slug);
    makers.push(
      makerFromSeller(sellerOfRecord, basePath, null, sellerOfRecord.id),
    );
  }

  for (const credit of credits) {
    if (credit.seller_slug && seenSlugs.has(credit.seller_slug)) continue;
    const maker = await makerFromCredit(credit, basePath);
    if (maker.slug) seenSlugs.add(maker.slug);
    makers.push(maker);
  }

  const rated = makers.filter(
    (maker) =>
      maker.averageRating != null && Number.isFinite(maker.averageRating),
  );
  const aggregateRating =
    rated.length > 0
      ? rated.reduce((sum, maker) => sum + maker.averageRating!, 0) /
        rated.length
      : null;

  const productRating =
    product.average_rating != null &&
    Number.isFinite(product.average_rating) &&
    (product.reviews_count ?? 0) > 0
      ? product.average_rating
      : null;

  const compactRating = aggregateRating ?? productRating;

  return { makers, aggregateRating, compactRating };
}
