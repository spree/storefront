"use client";

import type {
  AvailabilityFilter,
  OptionFilter,
  PriceRangeFilter,
  ProductFiltersResponse,
  RatingFilter,
} from "@spree/sdk";
import { SlidersHorizontal } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { JSX } from "react";
import { memo, useCallback, useMemo, useState } from "react";
import { AvailabilityDropdownContent } from "@/components/products/filters/AvailabilityDropdownContent";
import { FilterBarSkeleton } from "@/components/products/filters/FilterBarSkeleton";
import { FilterChips } from "@/components/products/filters/FilterChips";
import { FilterDropdown } from "@/components/products/filters/FilterDropdown";
import { MobileFilterDrawer } from "@/components/products/filters/MobileFilterDrawer";
import { OptionDropdownContent } from "@/components/products/filters/OptionDropdownContent";
import { PriceDropdownContent } from "@/components/products/filters/PriceDropdownContent";
import { RatingDropdownContent } from "@/components/products/filters/RatingDropdownContent";
import { SortDropdownContent } from "@/components/products/filters/SortDropdownContent";
import { getActiveFilterCount } from "@/lib/utils/filters";
import { generatePriceBuckets } from "@/lib/utils/price-buckets";
import type { ActiveFilters, AvailabilityStatus } from "@/types/filters";

interface FilterBarProps {
  filtersData: ProductFiltersResponse | null;
  filtersLoading: boolean;
  activeFilters: ActiveFilters;
  totalCount: number;
  /** When set, default sort label falls back to relevance without a URL param. */
  searchQuery?: string;
  layout?: "horizontal" | "left_sidebar" | "right_sidebar" | "left_drawer";
  onFilterChange: (filters: ActiveFilters) => void;
}

export const FilterBar = memo(function FilterBar({
  filtersData,
  filtersLoading,
  activeFilters,
  totalCount,
  searchQuery,
  layout = "horizontal",
  onFilterChange,
}: FilterBarProps): JSX.Element | null {
  const t = useTranslations("products");
  const locale = useLocale();
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [showMobileDrawer, setShowMobileDrawer] = useState(false);
  const sidebarLayout = layout === "left_sidebar" || layout === "right_sidebar";
  const drawerOnly = layout === "left_drawer";

  const toggleDropdown = useCallback((id: string) => {
    setOpenDropdownId((prev) => (prev === id ? null : id));
  }, []);

  const closeDropdown = useCallback(() => {
    setOpenDropdownId(null);
  }, []);

  const handleOptionValueToggle = useCallback(
    (optionValueId: string) => {
      const newOptionValues = activeFilters.optionValues.includes(optionValueId)
        ? activeFilters.optionValues.filter((id) => id !== optionValueId)
        : [...activeFilters.optionValues, optionValueId];
      onFilterChange({ ...activeFilters, optionValues: newOptionValues });
    },
    [activeFilters, onFilterChange],
  );

  const handlePriceChange = useCallback(
    (min?: number, max?: number) => {
      onFilterChange({ ...activeFilters, priceMin: min, priceMax: max });
    },
    [activeFilters, onFilterChange],
  );

  const handleAvailabilityChange = useCallback(
    (availability?: AvailabilityStatus) => {
      onFilterChange({ ...activeFilters, availability });
    },
    [activeFilters, onFilterChange],
  );

  const handleSortChange = useCallback(
    (sortBy: string) => {
      onFilterChange({ ...activeFilters, sortBy });
      closeDropdown();
    },
    [activeFilters, onFilterChange, closeDropdown],
  );

  const handleRatingChange = useCallback(
    (ratingMin?: number) => {
      onFilterChange({ ...activeFilters, ratingMin });
      closeDropdown();
    },
    [activeFilters, onFilterChange, closeDropdown],
  );

  const clearFilters = useCallback(() => {
    onFilterChange({
      optionValues: [],
      priceMin: undefined,
      priceMax: undefined,
      availability: undefined,
      personalizable: undefined,
      ratingMin: undefined,
      sortBy: activeFilters.sortBy,
    });
  }, [onFilterChange, activeFilters.sortBy]);

  const handlePersonalizableToggle = useCallback(() => {
    onFilterChange({
      ...activeFilters,
      personalizable: activeFilters.personalizable ? undefined : true,
    });
  }, [activeFilters, onFilterChange]);

  const priceBuckets = useMemo(() => {
    if (!filtersData) return [];
    const priceFilter = filtersData.filters.find(
      (f) => f.type === "price_range",
    ) as PriceRangeFilter | undefined;
    if (!priceFilter) return [];
    return generatePriceBuckets(
      priceFilter.min,
      priceFilter.max,
      priceFilter.currency,
      { t, locale },
    );
  }, [filtersData, t, locale]);

  const optionFilters = useMemo(() => {
    if (!filtersData) return [];
    return filtersData.filters.filter(
      (f) => f.type === "option",
    ) as OptionFilter[];
  }, [filtersData]);

  const badgeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const filter of optionFilters) {
      counts[filter.id] = filter.options.filter((o) =>
        activeFilters.optionValues.includes(o.id),
      ).length;
    }
    return counts;
  }, [optionFilters, activeFilters.optionValues]);

  const priceBadge =
    activeFilters.priceMin !== undefined || activeFilters.priceMax !== undefined
      ? 1
      : 0;

  const availabilityBadge = activeFilters.availability ? 1 : 0;
  const personalizableBadge = activeFilters.personalizable ? 1 : 0;
  const ratingBadge = activeFilters.ratingMin !== undefined ? 1 : 0;

  const totalActiveFilters = getActiveFilterCount(activeFilters);

  const hasActiveFilters = totalActiveFilters > 0;

  const activeSortBy =
    activeFilters.sortBy ||
    (searchQuery ? "relevance" : filtersData?.default_sort);

  if (!filtersData) {
    if (filtersLoading) return <FilterBarSkeleton />;
    return (
      <p className="mb-6 border-b border-marketplace-border pb-4 text-sm text-marketplace-muted-foreground">
        {t("productCount", { count: totalCount })}
      </p>
    );
  }

  const availabilityFilter = filtersData.filters.find(
    (f) => f.type === "availability",
  ) as AvailabilityFilter | undefined;

  const hasPriceFilter =
    filtersData.filters.some((f) => f.type === "price_range") &&
    priceBuckets.length > 0;

  const ratingFilter = filtersData.filters.find((f) => f.type === "rating") as
    | RatingFilter
    | undefined;

  return (
    <div className={`mb-7 min-w-0 ${sidebarLayout ? "md:mb-0" : ""}`}>
      <div
        className={`${drawerOnly ? "hidden" : "hidden md:flex"} ${sidebarLayout ? "flex-col items-stretch gap-4 border-b-0 pb-0" : "flex-wrap items-center justify-between gap-3 border-b border-marketplace-border pb-4"}`}
      >
        <div
          data-theme-filter-controls
          className={`flex min-w-0 ${sidebarLayout ? "flex-col items-stretch gap-2" : "flex-wrap items-center gap-2"}`}
        >
          <button
            data-theme-filter-drawer-trigger
            type="button"
            onClick={() => setShowMobileDrawer(true)}
            aria-haspopup="dialog"
            aria-expanded={showMobileDrawer}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-marketplace-border bg-marketplace-curator px-4 text-sm font-medium text-marketplace-foreground shadow-sm transition-colors hover:bg-marketplace-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marketplace-brand"
          >
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            <span>{t("allFilters")}</span>
          </button>
          {optionFilters.map((filter) => (
            <FilterDropdown
              key={filter.id}
              label={filter.label}
              badgeCount={badgeCounts[filter.id]}
              isOpen={openDropdownId === filter.id}
              onToggle={() => toggleDropdown(filter.id)}
              onClose={closeDropdown}
            >
              <OptionDropdownContent
                filter={filter}
                selectedValues={activeFilters.optionValues}
                onToggle={handleOptionValueToggle}
              />
            </FilterDropdown>
          ))}

          {hasPriceFilter && (
            <FilterDropdown
              label={t("price")}
              badgeCount={priceBadge}
              isOpen={openDropdownId === "price"}
              onToggle={() => toggleDropdown("price")}
              onClose={closeDropdown}
            >
              <PriceDropdownContent
                priceBuckets={priceBuckets}
                activeFilters={activeFilters}
                onPriceChange={handlePriceChange}
              />
            </FilterDropdown>
          )}

          {availabilityFilter && (
            <FilterDropdown
              label={t("availability")}
              badgeCount={availabilityBadge}
              isOpen={openDropdownId === "availability"}
              onToggle={() => toggleDropdown("availability")}
              onClose={closeDropdown}
            >
              <AvailabilityDropdownContent
                filter={availabilityFilter}
                selected={activeFilters.availability}
                onChange={handleAvailabilityChange}
              />
            </FilterDropdown>
          )}

          {ratingFilter && ratingFilter.options.length > 0 && (
            <FilterDropdown
              label={t("ratingFilter")}
              badgeCount={ratingBadge}
              isOpen={openDropdownId === "rating"}
              onToggle={() => toggleDropdown("rating")}
              onClose={closeDropdown}
            >
              <RatingDropdownContent
                filter={ratingFilter}
                selectedMinimum={activeFilters.ratingMin}
                onChange={handleRatingChange}
              />
            </FilterDropdown>
          )}

          <button
            type="button"
            onClick={handlePersonalizableToggle}
            aria-pressed={Boolean(activeFilters.personalizable)}
            className={`rounded-[var(--marketplace-radius-sm)] border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marketplace-brand ${
              activeFilters.personalizable
                ? "border-marketplace-brand bg-marketplace-surface-subtle text-marketplace-brand"
                : "border-marketplace-border text-marketplace-foreground hover:bg-marketplace-surface-subtle"
            }`}
          >
            {t("personalizable")}
            {personalizableBadge ? (
              <span className="sr-only">{t("filterActive")}</span>
            ) : null}
          </button>
        </div>

        <div
          data-theme-listing-toolbar
          className={`flex items-center gap-3 ${sidebarLayout ? "justify-between border-t border-marketplace-border pt-3" : ""}`}
        >
          <span className="text-sm text-marketplace-muted-foreground">
            {t("productCount", { count: totalCount })}
          </span>
          <FilterDropdown
            label={t("sort")}
            isOpen={openDropdownId === "sort"}
            onToggle={() => toggleDropdown("sort")}
            onClose={closeDropdown}
            align="right"
          >
            <SortDropdownContent
              sortOptions={filtersData.sort_options}
              activeSortBy={activeSortBy}
              onSortChange={handleSortChange}
            />
          </FilterDropdown>
        </div>
      </div>

      <div
        className={`${drawerOnly ? "flex items-center" : "flex items-center md:hidden"} min-w-0 gap-3 border-b border-marketplace-border pb-4`}
      >
        <button
          data-theme-filter-drawer-trigger
          type="button"
          onClick={() => setShowMobileDrawer(true)}
          aria-haspopup="dialog"
          aria-expanded={showMobileDrawer}
          className={`flex items-center gap-2 rounded-[var(--marketplace-radius-sm)] border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marketplace-brand ${
            hasActiveFilters
              ? "border-marketplace-brand bg-marketplace-surface-subtle text-marketplace-brand"
              : "border-marketplace-border text-marketplace-foreground"
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>{t("allFilters")}</span>
          {hasActiveFilters && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-marketplace-brand text-xs text-marketplace-brand-foreground">
              {totalActiveFilters}
            </span>
          )}
        </button>

        <div data-theme-listing-toolbar className="ml-auto">
          <FilterDropdown
            label={t("sort")}
            isOpen={openDropdownId === "sort-mobile"}
            onToggle={() => toggleDropdown("sort-mobile")}
            onClose={closeDropdown}
            align="right"
          >
            <SortDropdownContent
              sortOptions={filtersData.sort_options}
              activeSortBy={activeSortBy}
              onSortChange={handleSortChange}
            />
          </FilterDropdown>
        </div>
      </div>

      {hasActiveFilters && (
        <FilterChips
          activeFilters={activeFilters}
          filtersData={filtersData}
          priceBuckets={priceBuckets}
          onRemoveOptionValue={(id) => handleOptionValueToggle(id)}
          onRemovePrice={() => handlePriceChange(undefined, undefined)}
          onRemoveAvailability={() => handleAvailabilityChange(undefined)}
          onRemovePersonalizable={() =>
            onFilterChange({ ...activeFilters, personalizable: undefined })
          }
          onRemoveRating={() =>
            onFilterChange({ ...activeFilters, ratingMin: undefined })
          }
          onClearAll={clearFilters}
        />
      )}

      <MobileFilterDrawer
        isOpen={showMobileDrawer}
        onClose={() => setShowMobileDrawer(false)}
        filtersData={filtersData}
        activeFilters={activeFilters}
        priceBuckets={priceBuckets}
        onApply={onFilterChange}
      />
    </div>
  );
});
