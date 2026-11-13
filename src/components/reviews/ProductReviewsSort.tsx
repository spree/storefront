"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const SORTS = ["newest", "highest", "lowest", "most_helpful"] as const;
export type ProductReviewSort = (typeof SORTS)[number];

interface ProductReviewsSortProps {
  current: ProductReviewSort;
  compact?: boolean;
}

export function ProductReviewsSort({
  current,
  compact = false,
}: ProductReviewsSortProps) {
  const t = useTranslations("reviews");
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function hrefFor(sort: ProductReviewSort) {
    const params = new URLSearchParams(searchParams.toString());
    if (sort === "most_helpful") {
      params.delete("review_sort");
    } else {
      params.set("review_sort", sort);
    }
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  return (
    <nav
      aria-label={t("sortBy")}
      className={cn(
        "flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3",
        compact &&
          "border-t border-marketplace-border-subtle pt-4 sm:border-t-0 sm:pt-0",
      )}
    >
      <span className="text-xs font-medium uppercase tracking-wide text-marketplace-muted-foreground">
        {t("sortBy")}
      </span>
      <div
        className={cn(
          "inline-flex gap-0.5 rounded-full border border-marketplace-border-subtle bg-marketplace-muted p-0.5",
          compact ? "w-full overflow-x-auto sm:w-auto" : "flex-wrap",
        )}
      >
        {SORTS.map((sort) => (
          <Link
            key={sort}
            href={hrefFor(sort)}
            scroll={false}
            aria-current={current === sort ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marketplace-brand focus-visible:ring-offset-1",
              current === sort
                ? "bg-marketplace-surface-elevated text-marketplace-foreground shadow-sm"
                : "text-marketplace-muted-foreground hover:text-marketplace-foreground",
            )}
          >
            {t(`sort_${sort}`)}
          </Link>
        ))}
      </div>
    </nav>
  );
}
