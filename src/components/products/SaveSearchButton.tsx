"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { createSavedSearch } from "@/lib/data/saved-searches";
import { activeFiltersToSavedSearchFilters } from "@/lib/utils/saved-search-filters";
import type { ActiveFilters } from "@/types/filters";

interface SaveSearchButtonProps {
  query?: string;
  filters: ActiveFilters;
}

export function SaveSearchButton({ query, filters }: SaveSearchButtonProps) {
  const t = useTranslations("products");
  const { isAuthenticated } = useAuth();
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const canSave = Boolean(
    query ||
      filters.personalizable ||
      filters.ratingMin !== undefined ||
      filters.availability ||
      filters.priceMin !== undefined ||
      filters.priceMax !== undefined ||
      filters.optionValues.length > 0,
  );

  const name = useMemo(() => {
    if (query) return query.slice(0, 80);
    if (filters.personalizable) return t("personalizable");
    return t("saveSearchDefaultName");
  }, [query, filters.personalizable, t]);

  if (!isAuthenticated || !canSave) return null;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending || saved}
      onClick={() => {
        startTransition(async () => {
          const result = await createSavedSearch({
            name,
            query: query || undefined,
            filters: activeFiltersToSavedSearchFilters(filters),
            notifications_enabled: false,
          });
          if (result.success) setSaved(true);
        });
      }}
    >
      {saved ? t("searchSaved") : t("saveThisSearch")}
    </Button>
  );
}
