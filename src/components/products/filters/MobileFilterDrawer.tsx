"use client";

import type {
  AvailabilityFilter,
  OptionFilter,
  ProductFiltersResponse,
  RatingFilter,
} from "@spree/sdk";
import { Check, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  getActiveFilterCount,
  getAvailabilityLabel,
} from "@/lib/utils/filters";
import type { PriceBucket } from "@/lib/utils/price-buckets";
import { findMatchingBucket } from "@/lib/utils/price-buckets";
import {
  type ActiveFilters,
  type AvailabilityStatus,
  isAvailabilityStatus,
} from "@/types/filters";

interface MobileFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filtersData: ProductFiltersResponse | null;
  activeFilters: ActiveFilters;
  priceBuckets: PriceBucket[];
  onApply: (filters: ActiveFilters) => void;
}

export function MobileFilterDrawer({
  isOpen,
  onClose,
  filtersData,
  activeFilters,
  priceBuckets,
  onApply,
}: MobileFilterDrawerProps) {
  const t = useTranslations("products");
  const common = useTranslations("common");
  const [stagedFilters, setStagedFilters] =
    useState<ActiveFilters>(activeFilters);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Only sync when the drawer opens, not when activeFilters changes while open
  useEffect(() => {
    if (isOpen) {
      setStagedFilters(activeFilters);
    }
  }, [isOpen]);

  const handleOptionValueToggle = useCallback((optionValueId: string) => {
    setStagedFilters((prev) => {
      const newOptionValues = prev.optionValues.includes(optionValueId)
        ? prev.optionValues.filter((id) => id !== optionValueId)
        : [...prev.optionValues, optionValueId];
      return { ...prev, optionValues: newOptionValues };
    });
  }, []);

  const handlePriceChange = useCallback((min?: number, max?: number) => {
    setStagedFilters((prev) => ({ ...prev, priceMin: min, priceMax: max }));
  }, []);

  const handleAvailabilityChange = useCallback((value?: AvailabilityStatus) => {
    setStagedFilters((prev) => ({ ...prev, availability: value }));
  }, []);

  const handleClearAll = useCallback(() => {
    setStagedFilters((prev) => ({
      optionValues: [],
      priceMin: undefined,
      priceMax: undefined,
      availability: undefined,
      personalizable: undefined,
      ratingMin: undefined,
      sortBy: prev.sortBy,
    }));
  }, []);

  const handleApply = useCallback(() => {
    onApply(stagedFilters);
    onClose();
  }, [stagedFilters, onApply, onClose]);

  const stagedCount = getActiveFilterCount(stagedFilters);

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        side="left"
        className="flex w-full max-w-sm flex-col gap-0 border-marketplace-border bg-marketplace-surface p-0 text-marketplace-foreground shadow-2xl"
        showCloseButton={false}
        overlayClassName="bg-marketplace-foreground/35 backdrop-blur-[1px]"
        aria-describedby={undefined}
      >
        <SheetTitle className="sr-only">{t("filters")}</SheetTitle>

        <div className="flex min-h-16 items-center justify-between border-b border-marketplace-border px-6 py-4">
          <h2 className="font-serif text-2xl font-medium tracking-tight text-marketplace-foreground">
            {t("filters")}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label={t("closeFilters")}
            className="rounded-full text-marketplace-muted-foreground hover:bg-marketplace-surface-subtle hover:text-marketplace-foreground"
          >
            <X className="size-5" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 space-y-7 overflow-y-auto px-6 py-5">
          {filtersData?.filters.map((filter) => {
            switch (filter.type) {
              case "option":
                return (
                  <MobileOptionSection
                    key={filter.id}
                    filter={filter as OptionFilter}
                    selectedValues={stagedFilters.optionValues}
                    onToggle={handleOptionValueToggle}
                  />
                );
              case "price_range":
                return (
                  <MobilePriceSection
                    key={filter.id}
                    priceBuckets={priceBuckets}
                    activeFilters={stagedFilters}
                    onPriceChange={handlePriceChange}
                  />
                );
              case "availability":
                return (
                  <MobileAvailabilitySection
                    key={filter.id}
                    filter={filter as AvailabilityFilter}
                    selected={stagedFilters.availability}
                    onChange={handleAvailabilityChange}
                  />
                );
              case "rating":
                return (
                  <MobileRatingSection
                    key={filter.id}
                    filter={filter as RatingFilter}
                    selectedMinimum={stagedFilters.ratingMin}
                    onChange={(minimum) =>
                      setStagedFilters((prev) => ({
                        ...prev,
                        ratingMin: minimum,
                      }))
                    }
                  />
                );
              default:
                return null;
            }
          })}

          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
              {t("personalizable")}
            </h3>
            <button
              type="button"
              aria-pressed={Boolean(stagedFilters.personalizable)}
              onClick={() =>
                setStagedFilters((prev) => ({
                  ...prev,
                  personalizable: prev.personalizable ? undefined : true,
                }))
              }
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-colors ${
                stagedFilters.personalizable
                  ? "bg-gray-50 font-medium text-primary"
                  : "hover:bg-gray-50"
              }`}
            >
              <span>{t("personalizable")}</span>
              {stagedFilters.personalizable ? (
                <Check className="h-4 w-4" aria-hidden />
              ) : null}
            </button>
          </div>
        </div>

        <div className="border-t border-marketplace-border bg-marketplace-surface px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {stagedCount > 0 && (
            <Button
              variant="ghost"
              className="mb-2 h-9 w-full text-sm text-marketplace-muted-foreground hover:text-marketplace-foreground"
              onClick={handleClearAll}
            >
              {t("clearAllFiltersCount", { count: stagedCount })}
            </Button>
          )}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="h-11 flex-1 rounded-full border-marketplace-border bg-marketplace-surface font-medium text-marketplace-foreground hover:bg-marketplace-surface-subtle"
              onClick={onClose}
            >
              {common("cancel")}
            </Button>
            <Button
              className="h-11 flex-1 rounded-full bg-marketplace-foreground font-semibold text-marketplace-surface hover:bg-marketplace-foreground/90"
              onClick={handleApply}
            >
              {common("apply")}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function MobileRatingSection({
  filter,
  selectedMinimum,
  onChange,
}: {
  filter: RatingFilter;
  selectedMinimum?: number;
  onChange: (minimum?: number) => void;
}) {
  const t = useTranslations("products");
  if (!filter.options.length) return null;

  return (
    <div>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
        {t("ratingFilter")}
      </h3>
      <div className="space-y-1">
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm ${
            selectedMinimum === undefined ? "bg-gray-50 font-medium" : ""
          }`}
        >
          {t("anyRating")}
        </button>
        {filter.options.map((option) => {
          const active = selectedMinimum === option.minimum;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.minimum)}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm ${
                active ? "bg-gray-50 font-medium text-primary" : ""
              }`}
            >
              <span>{t("ratingStarsUp", { count: option.minimum })}</span>
              {active ? <Check className="h-4 w-4" /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MobileOptionSection({
  filter,
  selectedValues,
  onToggle,
}: {
  filter: OptionFilter;
  selectedValues: string[];
  onToggle: (id: string) => void;
}) {
  const isColorFilter = filter.kind === "color_swatch";

  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
        {filter.label}
      </h3>
      {isColorFilter ? (
        <div className="space-y-1">
          {filter.options.map((option) => {
            const isSelected = selectedValues.includes(option.id);
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onToggle(option.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                  isSelected ? "bg-gray-50" : "hover:bg-gray-50"
                }`}
              >
                <span
                  className={`w-7 h-7 rounded-lg shrink-0 border-2 transition-colors overflow-hidden ${
                    isSelected
                      ? "border-gray-500 ring-2 ring-primary-200"
                      : "border-gray-200"
                  }`}
                  style={
                    option.image_url
                      ? {
                          backgroundImage: `url(${option.image_url})`,
                          backgroundSize: "cover",
                        }
                      : option.color_code
                        ? { backgroundColor: option.color_code }
                        : { backgroundColor: "#e5e7eb" }
                  }
                />
                <span
                  className={`text-sm flex-1 text-left ${isSelected ? "font-medium text-gray-900" : "text-gray-700"}`}
                >
                  {option.label}
                </span>
                <span className="text-xs text-gray-400">({option.count})</span>
                {isSelected && (
                  <Check className="w-4 h-4 text-primary shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {filter.options.map((option) => {
            const isSelected = selectedValues.includes(option.id);
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onToggle(option.id)}
                className={`px-3.5 py-2 text-sm rounded-xl border transition-colors ${
                  isSelected
                    ? "border-gray-500 bg-primary text-white"
                    : "border-gray-300 text-gray-700 hover:border-gray-400"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MobilePriceSection({
  priceBuckets,
  activeFilters,
  onPriceChange,
}: {
  priceBuckets: PriceBucket[];
  activeFilters: ActiveFilters;
  onPriceChange: (min?: number, max?: number) => void;
}) {
  const t = useTranslations("products");

  if (priceBuckets.length === 0) return null;

  const selectedBucket = findMatchingBucket(
    priceBuckets,
    activeFilters.priceMin,
    activeFilters.priceMax,
  );

  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
        {t("price")}
      </h3>
      <div className="space-y-1">
        {priceBuckets.map((bucket) => {
          const isSelected = selectedBucket?.id === bucket.id;
          return (
            <button
              key={bucket.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => {
                if (isSelected) {
                  onPriceChange(undefined, undefined);
                } else {
                  onPriceChange(bucket.min, bucket.max);
                }
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl transition-colors ${
                isSelected
                  ? "bg-gray-50 font-medium text-gray-900"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <span className="flex-1 text-left">{bucket.label}</span>
              {isSelected && (
                <Check className="w-4 h-4 text-primary shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MobileAvailabilitySection({
  filter,
  selected,
  onChange,
}: {
  filter: AvailabilityFilter;
  selected?: AvailabilityStatus;
  onChange: (value?: AvailabilityStatus) => void;
}) {
  const t = useTranslations("products");

  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
        {t("availability")}
      </h3>
      <div className="space-y-1">
        {filter.options.map((option) => {
          const isSelected = selected === option.id;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => {
                if (isSelected) {
                  onChange(undefined);
                } else if (isAvailabilityStatus(option.id)) {
                  onChange(option.id);
                }
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl transition-colors ${
                isSelected
                  ? "bg-gray-50 font-medium text-gray-900"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <span className="flex-1 text-left">
                {getAvailabilityLabel(option.id, t)}
              </span>
              <span className="text-xs text-gray-400">({option.count})</span>
              {isSelected && (
                <Check className="w-4 h-4 text-primary shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
