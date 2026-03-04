"use client";

import type {
  AvailabilityFilter,
  OptionFilter,
  PriceRangeFilter,
  ProductFiltersResponse,
} from "@spree/sdk";
import { memo, useState } from "react";
import { ChevronDownIcon } from "@/components/icons";

const SORT_LABELS: Record<string, string> = {
  manual: "Manual",
  best_selling: "Best Selling",
  "price asc": "Price (low-high)",
  "price desc": "Price (high-low)",
  "available_on desc": "Newest",
  "available_on asc": "Oldest",
  "name asc": "Name (A-Z)",
  "name desc": "Name (Z-A)",
};

const AVAILABILITY_LABELS: Record<string, string> = {
  in_stock: "In Stock",
  out_of_stock: "Out of Stock",
};

interface ProductFiltersProps {
  taxonId?: string;
  filtersData: ProductFiltersResponse | null;
  loading: boolean;
  onFilterChange: (filters: ActiveFilters) => void;
}

export interface ActiveFilters {
  priceMin?: number;
  priceMax?: number;
  optionValues: string[]; // option value IDs
  availability?: "in_stock" | "out_of_stock";
  sortBy?: string;
}

export const ProductFilters = memo(function ProductFilters({
  filtersData,
  loading,
  onFilterChange,
}: ProductFiltersProps) {
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({
    optionValues: [],
  });
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["price"]),
  );

  const updateFilters = (updater: (prev: ActiveFilters) => ActiveFilters) => {
    const next = updater(activeFilters);
    setActiveFilters(next);
    onFilterChange(next);
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const handleOptionValueToggle = (optionValueId: string) => {
    updateFilters((prev) => {
      const newOptionValues = prev.optionValues.includes(optionValueId)
        ? prev.optionValues.filter((id) => id !== optionValueId)
        : [...prev.optionValues, optionValueId];
      return { ...prev, optionValues: newOptionValues };
    });
  };

  const handlePriceChange = (min?: number, max?: number) => {
    updateFilters((prev) => ({ ...prev, priceMin: min, priceMax: max }));
  };

  const handleAvailabilityChange = (
    availability?: "in_stock" | "out_of_stock",
  ) => {
    updateFilters((prev) => ({ ...prev, availability }));
  };

  const handleSortChange = (sortBy: string) => {
    updateFilters((prev) => ({ ...prev, sortBy }));
  };

  const clearFilters = () => {
    const reset: ActiveFilters = { optionValues: [] };
    setActiveFilters(reset);
    onFilterChange(reset);
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-gray-200 rounded w-1/2" />
        <div className="h-10 bg-gray-200 rounded" />
        <div className="h-6 bg-gray-200 rounded w-1/2" />
        <div className="h-10 bg-gray-200 rounded" />
      </div>
    );
  }

  if (!filtersData) {
    return null;
  }

  const hasActiveFilters =
    activeFilters.priceMin !== undefined ||
    activeFilters.priceMax !== undefined ||
    activeFilters.optionValues.length > 0 ||
    activeFilters.availability !== undefined;

  return (
    <div className="space-y-6">
      {/* Sort */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Sort by
        </label>
        <select
          value={activeFilters.sortBy || filtersData.default_sort}
          onChange={(e) => handleSortChange(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        >
          {filtersData.sort_options.map((option) => (
            <option key={option.id} value={option.id}>
              {SORT_LABELS[option.id] || option.id}
            </option>
          ))}
        </select>
      </div>

      {/* Reset Filters */}
      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="text-sm text-primary-500 hover:text-primary-800"
        >
          Reset filters
        </button>
      )}

      {/* Filters */}
      {filtersData.filters.map((filter) => {
        switch (filter.type) {
          case "price_range":
            return (
              <FilterSection
                key={filter.id}
                title="Price"
                expanded={expandedSections.has(filter.id)}
                onToggle={() => toggleSection(filter.id)}
              >
                <PriceFilter
                  key={`${activeFilters.priceMin}-${activeFilters.priceMax}`}
                  filter={filter as PriceRangeFilter}
                  minValue={activeFilters.priceMin}
                  maxValue={activeFilters.priceMax}
                  onChange={handlePriceChange}
                />
              </FilterSection>
            );
          case "availability":
            return (
              <FilterSection
                key={filter.id}
                title="Availability"
                expanded={expandedSections.has(filter.id)}
                onToggle={() => toggleSection(filter.id)}
              >
                <AvailabilityFilterSection
                  filter={filter as AvailabilityFilter}
                  selected={activeFilters.availability}
                  onChange={handleAvailabilityChange}
                />
              </FilterSection>
            );
          case "option":
            return (
              <FilterSection
                key={filter.id}
                title={(filter as OptionFilter).presentation}
                expanded={expandedSections.has(filter.id)}
                onToggle={() => toggleSection(filter.id)}
              >
                <OptionFilterSection
                  filter={filter as OptionFilter}
                  selectedValues={activeFilters.optionValues}
                  onToggle={handleOptionValueToggle}
                />
              </FilterSection>
            );
          default:
            return null;
        }
      })}

      {/* Total count */}
      <div className="text-sm text-gray-500 pt-4 border-t">
        {filtersData.total_count} products
      </div>
    </div>
  );
});

// Filter Section wrapper with expand/collapse
function FilterSection({
  title,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-gray-200 pb-4">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full text-left"
      >
        <span className="text-sm font-medium text-gray-900">{title}</span>
        <ChevronDownIcon
          className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>
      {expanded && <div className="mt-4">{children}</div>}
    </div>
  );
}

// Price Range Filter
function PriceFilter({
  filter,
  minValue,
  maxValue,
  onChange,
}: {
  filter: PriceRangeFilter;
  minValue?: number;
  maxValue?: number;
  onChange: (min?: number, max?: number) => void;
}) {
  const [localMin, setLocalMin] = useState(minValue?.toString() || "");
  const [localMax, setLocalMax] = useState(maxValue?.toString() || "");

  const handleApply = () => {
    onChange(
      localMin ? parseFloat(localMin) : undefined,
      localMax ? parseFloat(localMax) : undefined,
    );
  };

  return (
    <div className="space-y-3">
      <div className="text-xs text-gray-500">
        Range: {filter.currency} {filter.min.toFixed(2)} -{" "}
        {filter.max.toFixed(2)}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          placeholder="Min"
          value={localMin}
          onChange={(e) => setLocalMin(e.target.value)}
          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
        />
        <span className="text-gray-400">-</span>
        <input
          type="number"
          placeholder="Max"
          value={localMax}
          onChange={(e) => setLocalMax(e.target.value)}
          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
        />
      </div>
      <button
        onClick={handleApply}
        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm py-1 rounded"
      >
        Apply
      </button>
    </div>
  );
}

// Availability Filter
function AvailabilityFilterSection({
  filter,
  selected,
  onChange,
}: {
  filter: AvailabilityFilter;
  selected?: "in_stock" | "out_of_stock";
  onChange: (value?: "in_stock" | "out_of_stock") => void;
}) {
  return (
    <div className="space-y-2">
      {filter.options.map((option) => (
        <label
          key={option.id}
          className="flex items-center gap-2 cursor-pointer"
        >
          <input
            type="radio"
            name="availability"
            checked={selected === option.id}
            onChange={() => onChange(option.id as "in_stock" | "out_of_stock")}
            className="text-primary-500"
          />
          <span className="text-sm text-gray-700">
            {AVAILABILITY_LABELS[option.id] || option.id}
          </span>
          <span className="text-xs text-gray-400">({option.count})</span>
        </label>
      ))}
      {selected && (
        <button
          onClick={() => onChange(undefined)}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          Clear
        </button>
      )}
    </div>
  );
}

// Option Filter (Size, Color, etc.)
function OptionFilterSection({
  filter,
  selectedValues,
  onToggle,
}: {
  filter: OptionFilter;
  selectedValues: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="space-y-2 max-h-48 overflow-y-auto">
      {filter.options.map((option) => (
        <label
          key={option.id}
          className="flex items-center gap-2 cursor-pointer"
        >
          <input
            type="checkbox"
            checked={selectedValues.includes(option.id)}
            onChange={() => onToggle(option.id)}
            className="rounded text-primary-500"
          />
          <span className="text-sm text-gray-700">{option.presentation}</span>
          <span className="text-xs text-gray-400">({option.count})</span>
        </label>
      ))}
    </div>
  );
}
