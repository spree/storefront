"use client";

import { useTranslations } from "next-intl";
import {
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { getSortOptionLabel } from "@/lib/utils/filters";

interface SortDropdownContentProps {
  sortOptions: { id: string; label?: string | null }[];
  activeSortBy?: string;
  onSortChange: (sortBy: string) => void;
}

export function SortDropdownContent({
  sortOptions,
  activeSortBy,
  onSortChange,
}: SortDropdownContentProps) {
  const t = useTranslations("products");

  return (
    <DropdownMenuRadioGroup value={activeSortBy} onValueChange={onSortChange}>
      {sortOptions.map((option) => (
        <DropdownMenuRadioItem key={option.id} value={option.id}>
          {getSortOptionLabel(option, t)}
        </DropdownMenuRadioItem>
      ))}
    </DropdownMenuRadioGroup>
  );
}
