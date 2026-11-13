import { getProductReviewAttributeScores } from "@/lib/data/reviews";
import { StarRatingDisplay } from "./StarRating";

type ReviewAttributeBreakdownProps = {
  productSlug: string;
  locale: string;
  embedded?: boolean;
};

export async function ReviewAttributeBreakdown({
  productSlug,
  embedded = false,
}: ReviewAttributeBreakdownProps) {
  const scores = await getProductReviewAttributeScores(productSlug);
  if (scores.length === 0) return null;

  return (
    <div
      className={
        embedded
          ? "mt-5 border-t border-marketplace-border-subtle pt-5"
          : "mt-5 border-t border-marketplace-border-subtle pt-5"
      }
    >
      <ul className="space-y-3">
        {scores.map((row) => (
          <li
            key={String(row.key)}
            className="flex flex-wrap items-center justify-between gap-2 text-sm"
          >
            <span className="font-medium text-marketplace-foreground">
              {String(row.label)}
            </span>
            <div className="flex items-center gap-2 text-marketplace-muted-foreground">
              <StarRatingDisplay
                rating={Number(row.average_rating)}
                size="sm"
                tone="dark"
              />
              <span className="tabular-nums text-xs">
                {Number(row.average_rating).toFixed(1)} ·{" "}
                {String(row.ratings_count)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
