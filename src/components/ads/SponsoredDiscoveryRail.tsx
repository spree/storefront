"use client";

import type { SponsoredSearchResult } from "@spree/sdk";
import { useEffect, useState } from "react";
import { SponsoredProductCard } from "@/components/ads/SponsoredProductCard";
import {
  MarketplacePage,
  MarketplaceSection,
  MarketplaceSectionHeader,
} from "@/components/marketplace";
import type { DiscoveryAdsPlacement } from "@/lib/ads/placements";
import { getOrCreateTrafficSessionToken } from "@/lib/traffic/tokens";

type SponsoredDiscoveryRailProps = {
  placement: DiscoveryAdsPlacement;
  title: string;
  basePath: string;
  currency?: string;
  limit?: number;
  productId?: string;
  categoryId?: string;
  collectionId?: string;
  sellerId?: string;
  organicProductIds?: string[];
  className?: string;
  initialRows?: SponsoredSearchResult[];
};

function apiBaseUrl(): string {
  const publicUrl = process.env.NEXT_PUBLIC_SPREE_API_URL?.replace(/\/$/, "");
  if (publicUrl) return `${publicUrl}/api/v3`;
  return "/api/v3";
}

export function SponsoredDiscoveryRail({
  placement,
  title,
  basePath,
  currency,
  limit = 8,
  productId,
  categoryId,
  collectionId,
  sellerId,
  organicProductIds,
  className,
  initialRows,
}: SponsoredDiscoveryRailProps) {
  const [rows, setRows] = useState<SponsoredSearchResult[]>(initialRows ?? []);
  const [loaded, setLoaded] = useState(Boolean(initialRows?.length));

  useEffect(() => {
    if (initialRows?.length) return;
    const key = process.env.NEXT_PUBLIC_SPREE_PUBLISHABLE_KEY;
    if (!key) {
      setLoaded(true);
      return;
    }
    const body: Record<string, unknown> = {
      placement,
      limit,
      session_token: getOrCreateTrafficSessionToken(),
    };
    if (productId) body.product_id = productId;
    if (categoryId) body.category_id = categoryId;
    if (collectionId) body.collection_id = collectionId;
    if (sellerId) body.seller_id = sellerId;
    if (organicProductIds?.length) body.organic_product_ids = organicProductIds;

    void fetch(`${apiBaseUrl()}/store/advertising/placements`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Spree-API-Key": key,
        "X-Spree-Session-Token": getOrCreateTrafficSessionToken(),
      },
      body: JSON.stringify(body),
      credentials: "include",
    })
      .then((response) => (response.ok ? response.json() : { data: [] }))
      .then((payload: { data?: SponsoredSearchResult[] }) => {
        setRows(payload.data ?? []);
      })
      .catch(() => setRows([]))
      .finally(() => setLoaded(true));
  }, [
    placement,
    limit,
    productId,
    categoryId,
    collectionId,
    sellerId,
    organicProductIds,
    initialRows,
  ]);

  if (!loaded || rows.length === 0) return null;

  return (
    <MarketplaceSection
      className={className}
      data-sponsored-placement={placement}
    >
      <MarketplacePage>
        <MarketplaceSectionHeader density="etsy" title={title} />
        <div className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2">
          {rows.map((row, index) => (
            <div
              key={`${row.ad.ad_listing_id}-${row.product.id}`}
              className="w-[42vw] max-w-[240px] shrink-0 snap-start sm:w-[28vw] md:max-w-[240px]"
            >
              <SponsoredProductCard
                row={row}
                basePath={basePath}
                currency={currency}
                index={index}
                density="rail"
              />
            </div>
          ))}
        </div>
      </MarketplacePage>
    </MarketplaceSection>
  );
}
