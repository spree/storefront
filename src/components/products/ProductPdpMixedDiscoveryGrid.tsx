"use client";

import type { Product, SponsoredSearchResult } from "@spree/sdk";
import type { CSSProperties } from "react";
import { SponsoredProductCard } from "@/components/ads/SponsoredProductCard";
import { mergeOrganicWithSponsored } from "@/lib/ads/merge-sponsored-listing";
import type { RecommendationClickContext } from "@/lib/analytics/recommendation-click";
import { ProductCard } from "./ProductCard";
import { ProductGrid } from "./ProductGrid";

const PDP_GRID_COLUMNS = 6;
const PDP_GRID_MOBILE_COLUMNS = 2;

type ProductPdpMixedDiscoveryGridProps = {
  organic: Product[];
  sponsoredRows?: SponsoredSearchResult[];
  basePath: string;
  currency?: string;
  listId: string;
  listName: string;
  recommendationClick?: RecommendationClickContext;
};

export function ProductPdpMixedDiscoveryGrid({
  organic,
  sponsoredRows = [],
  basePath,
  currency,
  listId,
  listName,
  recommendationClick,
}: ProductPdpMixedDiscoveryGridProps) {
  if (!organic.length && !sponsoredRows.length) return null;

  if (!sponsoredRows.length) {
    return (
      <ProductGrid
        products={organic}
        basePath={basePath}
        currency={currency}
        listId={listId}
        listName={listName}
        density="discovery"
        columns={PDP_GRID_COLUMNS}
        mobileColumns={PDP_GRID_MOBILE_COLUMNS}
        priorityCount={6}
      />
    );
  }

  const cells = mergeOrganicWithSponsored(organic, sponsoredRows);

  return (
    <div
      className="theme-product-grid grid"
      style={
        {
          "--marketplace-product-grid-columns": String(PDP_GRID_COLUMNS),
          "--marketplace-product-grid-mobile-columns": String(
            PDP_GRID_MOBILE_COLUMNS,
          ),
        } as CSSProperties
      }
      data-pdp-discovery-grid
    >
      {cells.map((cell, index) =>
        cell.kind === "sponsored" ? (
          <SponsoredProductCard
            key={`sponsored-${cell.row.ad.ad_listing_id}`}
            row={cell.row}
            basePath={basePath}
            index={index}
            currency={currency}
            density="discovery"
          />
        ) : (
          <ProductCard
            key={cell.product.id}
            product={cell.product}
            basePath={basePath}
            index={index}
            listId={listId}
            listName={listName}
            fetchPriority={index < 6 ? "high" : undefined}
            currency={currency}
            density="discovery"
            showFavorite={false}
            recommendationClick={recommendationClick}
          />
        ),
      )}
    </div>
  );
}
