"use client";

import type { OptionFilter, ProductFiltersResponse } from "@spree/sdk";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { getAvailabilityLabel } from "@/lib/utils/filters";
import {
  findMatchingBucket,
  type PriceBucket,
} from "@/lib/utils/price-buckets";
import type { ActiveFilters } from "@/types/filters";

interface FilterChipsProps {
  activeFilters: ActiveFilters;
  filtersData: ProductFiltersResponse | null;
  priceBuckets: PriceBucket[];
  onRemoveOptionValue: (optionValueId: string) => void;
  onRemovePrice: () => void;
  onRemoveAvailability: () => void;
  onRemovePersonalizable?: () => void;
  onRemoveRating?: () => void;
  onClearAll: () => void;
}

export function FilterChips({
  activeFilters,
  filtersData,
  priceBuckets,
  onRemoveOptionValue,
  onRemovePrice,
  onRemoveAvailability,
  onRemovePersonalizable,
  onRemoveRating,
  onClearAll,
}: FilterChipsProps) {
  const t = useTranslations("products");
  const chips: { key: string; label: string; onRemove: () => void }[] = [];

  if (filtersData) {
    for (const optionValueId of activeFilters.optionValues) {
      const optionFilter = filtersData.filters.find(
        (f) =>
          f.type === "option" &&
          (f as OptionFilter).options.some((o) => o.id === optionValueId),
      ) as OptionFilter | undefined;

      if (optionFilter) {
        const option = optionFilter.options.find((o) => o.id === optionValueId);
        if (option) {
          chips.push({
            key: `option-${optionValueId}`,
            label: t("optionFilterChip", {
              filter: optionFilter.label,
              value: option.label,
            }),
            onRemove: () => onRemoveOptionValue(optionValueId),
          });
        }
      }
    }
  }

  if (
    activeFilters.priceMin !== undefined ||
    activeFilters.priceMax !== undefined
  ) {
    const matchingBucket = findMatchingBucket(
      priceBuckets,
      activeFilters.priceMin,
      activeFilters.priceMax,
    );
    chips.push({
      key: "price",
      label: t("priceLabel", {
        value: matchingBucket?.label || t("customPrice"),
      }),
      onRemove: onRemovePrice,
    });
  }

  if (activeFilters.availability) {
    chips.push({
      key: "availability",
      label: getAvailabilityLabel(activeFilters.availability, t),
      onRemove: onRemoveAvailability,
    });
  }

  if (activeFilters.personalizable && onRemovePersonalizable) {
    chips.push({
      key: "personalizable",
      label: t("personalizable"),
      onRemove: onRemovePersonalizable,
    });
  }

  if (activeFilters.ratingMin !== undefined && onRemoveRating) {
    chips.push({
      key: "rating",
      label: t("ratingStarsUp", { count: activeFilters.ratingMin }),
      onRemove: onRemoveRating,
    });
  }

  if (chips.length === 0) return null;

  return (
    <fieldset className="mt-4 flex min-w-0 flex-wrap items-center gap-2 border-0 p-0">
      <legend className="sr-only">{t("filters")}</legend>
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-1.5 rounded-full border border-marketplace-border bg-marketplace-surface px-2.5 py-1 text-sm text-marketplace-foreground shadow-[var(--marketplace-shadow-card)]"
        >
          <span>{chip.label}</span>
          <button
            type="button"
            onClick={chip.onRemove}
            className="rounded-full p-0.5 text-marketplace-foreground transition-colors hover:bg-marketplace-surface focus-visible:outline-2 focus-visible:outline-marketplace-brand"
            aria-label={t("clearFilter", { label: chip.label })}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </span>
      ))}
      <Button variant="link" size="sm" onClick={onClearAll}>
        {t("clearAll")}
      </Button>
    </fieldset>
  );
}
