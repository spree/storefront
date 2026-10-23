"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ProductReviewSort } from "./ProductReviewsSort";

const RATING_FILTERS = [5, 4, 3, 2, 1] as const;

type ProductReviewsFiltersProps = {
  currentSort: ProductReviewSort;
};

export function ProductReviewsFilters({
  currentSort,
}: ProductReviewsFiltersProps) {
  const t = useTranslations("reviews");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeRating = searchParams.get("review_rating");
  const withMedia = searchParams.get("review_media") === "1";
  const keyword = searchParams.get("review_q") ?? "";

  function hrefWith(patch: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value == null || value === "") params.delete(key);
      else params.set(key, value);
    }
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  return (
    <div className="flex flex-col gap-4">
      <form
        className="flex flex-col gap-2 sm:flex-row sm:items-center"
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const input = form.elements.namedItem("review_q") as HTMLInputElement;
          window.location.assign(
            hrefWith({ review_q: input.value.trim() || null }),
          );
        }}
      >
        <Input
          name="review_q"
          defaultValue={keyword}
          placeholder={t("searchPlaceholder")}
          className="h-9 max-w-md"
          aria-label={t("searchPlaceholder")}
        />
        <button
          type="submit"
          className="inline-flex h-9 items-center justify-center rounded-md border border-[#222] px-4 text-sm font-medium text-[#222] hover:bg-[#f5f5f5]"
        >
          {t("searchAction")}
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        <Link
          href={hrefWith({ review_rating: null })}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium",
            !activeRating
              ? "border-[#222] bg-[#222] text-white"
              : "border-[#e1e3df] text-[#595959]",
          )}
        >
          {t("filterAllRatings")}
        </Link>
        {RATING_FILTERS.map((rating) => (
          <Link
            key={rating}
            href={hrefWith({ review_rating: String(rating) })}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium",
              activeRating === String(rating)
                ? "border-[#222] bg-[#222] text-white"
                : "border-[#e1e3df] text-[#595959]",
            )}
          >
            {t("filterStars", { count: rating })}
          </Link>
        ))}
        <Link
          href={hrefWith({ review_media: withMedia ? null : "1" })}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium",
            withMedia
              ? "border-[#222] bg-[#222] text-white"
              : "border-[#e1e3df] text-[#595959]",
          )}
        >
          {t("filterWithMedia")}
        </Link>
      </div>
    </div>
  );
}
