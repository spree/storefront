"use client";

import { Check, ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import type { EtsyTopicChipDef } from "./etsy-review-topic-chips";
import type { ProductReviewSort } from "./ProductReviewsSort";

const SORTS: ProductReviewSort[] = [
  "most_helpful",
  "newest",
  "highest",
  "lowest",
];

const etsyPill =
  "inline-flex shrink-0 items-center gap-1 rounded-full bg-[#f0edeb] px-4 py-2 text-[13px] font-medium text-[#373139] transition-colors hover:bg-[#e8e3df] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#635566] focus-visible:ring-offset-2";

const etsyPillActive =
  "inline-flex shrink-0 items-center rounded-full bg-[#302a31] px-4 py-2 text-[13px] font-medium text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#635566] focus-visible:ring-offset-2";

type ProductReviewsEtsyFiltersProps = {
  currentSort: ProductReviewSort;
  topicChips: EtsyTopicChipDef[];
};

function chipIsActive(
  searchParams: URLSearchParams,
  patch: Record<string, string | null>,
): boolean {
  for (const [key, value] of Object.entries(patch)) {
    if (value == null) continue;
    return searchParams.get(key) === value;
  }
  return false;
}

export function ProductReviewsEtsyFilters({
  currentSort,
  topicChips,
}: ProductReviewsEtsyFiltersProps) {
  const t = useTranslations("reviews");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const scrollerRef = useRef<HTMLDivElement>(null);

  function hrefWith(patch: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value == null || value === "") params.delete(key);
      else params.set(key, value);
    }
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  function hrefForSort(sort: ProductReviewSort) {
    const params = new URLSearchParams(searchParams.toString());
    if (sort === "most_helpful") params.delete("review_sort");
    else params.set("review_sort", sort);
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  const sortLabel =
    currentSort === "most_helpful"
      ? t("sortSuggested")
      : currentSort === "newest"
        ? t("sortMostRecent")
        : currentSort === "highest"
          ? t("sortHighestRating")
          : t("sortLowestRating");

  const scrollNext = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({
      left: Math.min(240, el.clientWidth * 0.8),
      behavior: "smooth",
    });
  }, []);

  const anyTopicActive =
    searchParams.has("review_rating") ||
    searchParams.has("review_media") ||
    searchParams.has("review_q");

  return (
    <div
      className="relative flex min-w-0 items-center gap-1"
      role="toolbar"
      aria-label={t("filterToolbar")}
    >
      <details className="group relative z-30 shrink-0">
        <summary
          className={cn(
            etsyPill,
            "h-9 w-[158px] cursor-pointer list-none justify-between marker:hidden [&::-webkit-details-marker]:hidden",
          )}
        >
          {sortLabel}
          <ChevronDown
            className="size-4 text-[#514751] transition-transform group-open:rotate-180"
            aria-hidden
          />
        </summary>
        <div
          className="absolute left-0 top-full z-50 mt-1 w-[158px] overflow-hidden rounded-lg border border-[#e2ddd8] bg-white py-1 shadow-[0_8px_24px_rgba(45,37,44,0.18)]"
          role="menu"
        >
          {SORTS.map((sort) => {
            const selected = currentSort === sort;
            return (
              <Link
                key={sort}
                href={hrefForSort(sort)}
                scroll={false}
                aria-current={selected ? "true" : undefined}
                className={cn(
                  "flex min-h-[42px] items-center justify-between border-b border-transparent px-4 text-[13px] text-[#373139] transition-colors last:border-b-0 hover:bg-[#f3f0ed] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#635566]",
                  selected &&
                    "border-b-[#5269d8] bg-[#d8d2cc] font-medium hover:bg-[#d8d2cc]",
                )}
                role="menuitem"
              >
                {sort === "most_helpful"
                  ? t("sortSuggested")
                  : sort === "newest"
                    ? t("sortMostRecent")
                    : sort === "highest"
                      ? t("sortHighestRating")
                      : t("sortLowestRating")}
                {selected ? <Check className="size-4" aria-hidden /> : null}
              </Link>
            );
          })}
        </div>
      </details>

      <div
        ref={scrollerRef}
        className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {topicChips.map((chip) => {
          const active = chipIsActive(searchParams, chip.patch);
          return (
            <Link
              key={chip.id}
              href={
                active
                  ? hrefWith({
                      review_rating: null,
                      review_media: null,
                      review_q: null,
                    })
                  : hrefWith(chip.patch)
              }
              scroll={false}
              className={active ? etsyPillActive : etsyPill}
            >
              {chip.label}
            </Link>
          );
        })}

        {anyTopicActive ? (
          <Link
            href={hrefWith({
              review_rating: null,
              review_media: null,
              review_q: null,
            })}
            scroll={false}
            className={etsyPill}
          >
            {t("filterClearTopics")}
          </Link>
        ) : null}
      </div>

      {topicChips.length > 2 ? (
        <button
          type="button"
          onClick={scrollNext}
          className="grid size-9 shrink-0 place-items-center rounded-full bg-[#efefef] text-[#222] hover:bg-[#e3e3e3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#222] focus-visible:ring-offset-2"
          aria-label={t("filterScrollNext")}
        >
          <ChevronRight className="size-5" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
