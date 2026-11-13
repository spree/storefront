import { Check } from "lucide-react";
import { getTranslations } from "next-intl/server";

type ProductReviewsBuyerHighlightsProps = {
  locale: string;
  attributeScores: Array<Record<string, unknown>>;
};

export async function ProductReviewsBuyerHighlights({
  locale,
  attributeScores,
}: ProductReviewsBuyerHighlightsProps) {
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "reviews",
  });

  const highlights = attributeScores
    .filter((row) => Number(row.average_rating ?? 0) >= 4.5)
    .sort(
      (a, b) => Number(b.average_rating ?? 0) - Number(a.average_rating ?? 0),
    )
    .slice(0, 3)
    .map((row) => String(row.label ?? "").trim())
    .filter(Boolean);

  if (highlights.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] leading-snug text-[#4e4750]">
      <p className="font-semibold">{t("buyerHighlightsLead")}</p>
      <ul className="flex flex-wrap gap-x-4 gap-y-1">
        {highlights.map((phrase) => (
          <li
            key={phrase}
            className="inline-flex items-center gap-1 text-[13px] text-[#4e4750]"
          >
            <Check
              className="size-3.5 shrink-0 stroke-[2.5] text-[#76634a]"
              aria-hidden
            />
            {phrase}
          </li>
        ))}
      </ul>
    </div>
  );
}
