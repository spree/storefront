"use client";

import { SearchBar } from "@/components/search/SearchBar";

interface MarketplaceHomeHeroSearchProps {
  basePath: string;
}

export function MarketplaceHomeHeroSearch({
  basePath,
}: MarketplaceHomeHeroSearchProps) {
  return (
    <div
      className="mt-5 w-full max-w-[var(--marketplace-header-search-max-width,42rem)]"
      data-theme-section="home-hero-search"
    >
      <SearchBar basePath={basePath} appearance="etsy" />
    </div>
  );
}
