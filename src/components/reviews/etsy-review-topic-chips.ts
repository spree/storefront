import type { Product } from "@spree/sdk";

export type EtsyTopicChipDef = {
  id: string;
  label: string;
  patch: Record<string, string | null>;
};

type AttributeScoreRow = {
  key?: string | number;
  label?: string;
  ratings_count?: number;
};

export function buildEtsyTopicChipDefs(
  product: Product,
  attributeScores: AttributeScoreRow[],
  mediaReviewCount: number,
  labels: {
    filterWithMedia: string;
    filterTopicCount: (label: string, count: number) => string;
    filterStarsCount: (stars: number, count: number) => string;
  },
  ratingDistribution: Product["rating_distribution"] = product.rating_distribution,
): EtsyTopicChipDef[] {
  const chips: EtsyTopicChipDef[] = [];
  const distribution = ratingDistribution ?? {};

  const starBuckets = [5, 4, 3, 2, 1] as const;
  for (const stars of starBuckets) {
    const count =
      Number(distribution[String(stars)] ?? distribution[stars] ?? 0) || 0;
    if (count <= 0) continue;
    chips.push({
      id: `rating-${stars}`,
      label: labels.filterStarsCount(stars, count),
      patch: {
        review_rating: String(stars),
        review_media: null,
        review_q: null,
      },
    });
  }

  for (const row of attributeScores) {
    const count = Number(row.ratings_count ?? 0);
    const label = String(row.label ?? "").trim();
    if (!label || count <= 0) continue;
    chips.push({
      id: `attr-${String(row.key ?? label)}`,
      label: labels.filterTopicCount(label, count),
      patch: {
        review_q: label,
        review_rating: null,
        review_media: null,
      },
    });
  }

  if (mediaReviewCount > 0) {
    chips.push({
      id: "media",
      label: labels.filterTopicCount(labels.filterWithMedia, mediaReviewCount),
      patch: {
        review_media: "1",
        review_rating: null,
        review_q: null,
      },
    });
  }

  chips.sort((a, b) => {
    const countA = Number(a.label.match(/\((\d+)\)\s*$/)?.[1] ?? 0);
    const countB = Number(b.label.match(/\((\d+)\)\s*$/)?.[1] ?? 0);
    return countB - countA;
  });

  return chips.slice(0, 8);
}
