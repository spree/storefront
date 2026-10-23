import { getProductReviewAttributeScores } from "@/lib/data/reviews";
import { StarRatingDisplay } from "./StarRating";

type ReviewAttributeBreakdownProps = {
  productSlug: string;
  locale: string;
};

export async function ReviewAttributeBreakdown({
  productSlug,
}: ReviewAttributeBreakdownProps) {
  const scores = await getProductReviewAttributeScores(productSlug);
  if (scores.length === 0) return null;

  return (
    <div className="mt-4 rounded-xl border border-[#e1e3df] bg-[#faf9f7] px-4 py-4">
      <ul className="space-y-3">
        {scores.map((row) => (
          <li
            key={String(row.key)}
            className="flex flex-wrap items-center justify-between gap-2 text-sm"
          >
            <span className="font-medium text-[#222]">{String(row.label)}</span>
            <div className="flex items-center gap-2 text-[#595959]">
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
