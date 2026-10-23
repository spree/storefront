"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const SORTS = ["newest", "highest", "lowest", "most_helpful"] as const;
export type ProductReviewSort = (typeof SORTS)[number];

interface ProductReviewsSortProps {
  current: ProductReviewSort;
}

export function ProductReviewsSort({ current }: ProductReviewsSortProps) {
  const t = useTranslations("reviews");
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function hrefFor(sort: ProductReviewSort) {
    const params = new URLSearchParams(searchParams.toString());
    if (sort === "newest") {
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
      className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3"
    >
      <span className="text-xs font-medium uppercase tracking-wide text-[#595959]">
        {t("sortBy")}
      </span>
      <div className="inline-flex flex-wrap gap-1">
        {SORTS.map((sort) => (
          <Link
            key={sort}
            href={hrefFor(sort)}
            scroll={false}
            aria-current={current === sort ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marketplace-brand focus-visible:ring-offset-1",
              current === sort
                ? "bg-[#f5f5f5] text-[#222] underline decoration-[#222] decoration-2 underline-offset-4"
                : "text-[#595959] hover:bg-[#f5f5f5] hover:text-[#222]",
            )}
          >
            {t(`sort_${sort}`)}
          </Link>
        ))}
      </div>
    </nav>
  );
}
