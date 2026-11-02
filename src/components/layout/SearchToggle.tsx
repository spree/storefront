"use client";

import { Search, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

const SearchBar = dynamic(
  () =>
    import("@/components/search/SearchBar").then((mod) => ({
      default: mod.SearchBar,
    })),
  {
    loading: () => (
      <div className="h-10 w-full bg-gray-100 rounded-md animate-pulse" />
    ),
  },
);

interface SearchToggleProps {
  basePath: string;
  /** Left slot (e.g. mobile menu) */
  left: ReactNode;
  /** Center slot (e.g. logo) */
  center: ReactNode;
  /** Rendered before the search button in the right section */
  rightStart: ReactNode;
  /** Rendered after the search button in the right section */
  rightEnd: ReactNode;
}

export function SearchToggle({
  basePath,
  left,
  center,
  rightStart,
  rightEnd,
}: SearchToggleProps) {
  const t = useTranslations("header");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchTriggerRef = useRef<HTMLButtonElement>(null);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    searchTriggerRef.current?.focus();
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 h-16 relative">
      {/* Normal header content */}
      <div
        className={`absolute inset-0 transition-[opacity,transform] duration-300 ease-in-out ${
          searchOpen
            ? "translate-y-4 opacity-0 pointer-events-none"
            : "translate-y-0 opacity-100"
        }`}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-full">
          <div className="flex items-center h-full w-full">
            {/* Left section */}
            <div className="flex items-center flex-1">{left}</div>

            {/* Center section */}
            <div className="flex justify-center min-w-0">{center}</div>

            {/* Right section */}
            <div className="flex items-center flex-1 justify-end space-x-2">
              {rightStart}

              {/* Search toggle */}
              <Button
                ref={searchTriggerRef}
                variant="ghost"
                size="icon-lg"
                onClick={() => setSearchOpen(true)}
                aria-label={t("openSearch")}
                aria-expanded={searchOpen}
                aria-controls="search-overlay"
              >
                <Search className="size-5" />
              </Button>

              {rightEnd}
            </div>
          </div>
        </div>
      </div>

      {/* Click-outside overlay */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={closeSearch}
          role="presentation"
        />
      )}

      {/* Search bar overlay */}
      <div
        id="search-overlay"
        inert={!searchOpen}
        onKeyDown={(e) => {
          if (e.key === "Escape") closeSearch();
        }}
        className={`absolute inset-0 z-50 transition-[opacity,transform] duration-300 ease-in-out ${
          searchOpen
            ? "translate-y-0 opacity-100"
            : "-translate-y-4 opacity-0 pointer-events-none"
        }`}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center gap-3">
          <div className="flex-1">
            <SearchBar
              key={String(searchOpen)}
              basePath={basePath}
              autoFocus={searchOpen}
              onNavigate={closeSearch}
            />
          </div>
          <Button
            variant="ghost"
            size="icon-lg"
            onClick={closeSearch}
            aria-label={t("closeSearch")}
          >
            <X className="size-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
