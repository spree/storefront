"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ProductReviewSort } from "./ProductReviewsSort";

const RATING_FILTERS = [5, 4, 3, 2, 1] as const;

type ProductReviewsFiltersProps = {
  currentSort?: ProductReviewSort;
  compact?: boolean;
};

export function ProductReviewsFilters({
  compact = false,
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

  const chipClass = (active: boolean) =>
    cn(
      "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
      active
        ? "border-marketplace-brand bg-marketplace-brand text-marketplace-brand-foreground"
        : "border-marketplace-border-subtle bg-marketplace-muted text-marketplace-muted-foreground hover:border-marketplace-border hover:text-marketplace-foreground",
    );

  return (
    <div className={cn("flex flex-col gap-3", compact && "gap-3")}>
      <form
        className={cn(
          "flex gap-2",
          compact
            ? "flex-col sm:flex-row sm:items-center"
            : "flex-col sm:flex-row sm:items-center",
        )}
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
          className={cn(
            "h-9 border-marketplace-border bg-marketplace-surface",
            compact ? "w-full sm:max-w-xs" : "max-w-md",
          )}
          aria-label={t("searchPlaceholder")}
        />
        <button
          type="submit"
          className="inline-flex h-9 shrink-0 items-center justify-center rounded-full border border-marketplace-brand bg-marketplace-brand px-4 text-sm font-medium text-marketplace-brand-foreground transition-transform active:scale-[0.98]"
        >
          {t("searchAction")}
        </button>
      </form>

      <div
        className={cn(
          "flex gap-2",
          compact
            ? "scrollbar-thin -mx-1 overflow-x-auto px-1 pb-0.5"
            : "flex-wrap",
        )}
      >
        <Link
          href={hrefWith({ review_rating: null })}
          className={chipClass(!activeRating)}
        >
          {t("filterAllRatings")}
        </Link>
        {RATING_FILTERS.map((rating) => (
          <Link
            key={rating}
            href={hrefWith({ review_rating: String(rating) })}
            className={chipClass(activeRating === String(rating))}
          >
            {t("filterStars", { count: rating })}
          </Link>
        ))}
        <Link
          href={hrefWith({ review_media: withMedia ? null : "1" })}
          className={chipClass(withMedia)}
        >
          {t("filterWithMedia")}
        </Link>
      </div>
    </div>
  );
}
