"use client";

import type { SponsoredSearchResult } from "@spree/sdk";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { useEffect, useRef } from "react";
import { ProductCard } from "@/components/products/ProductCard";
import {
  recordSponsoredImpression,
  sponsoredProductNavigateHref,
} from "@/lib/ads/sponsored-measurement";
import { productDetailPathSegment } from "@/lib/discovery-context";

type SponsoredProductCardProps = {
  row: SponsoredSearchResult;
  basePath: string;
  index?: number;
  currency?: string;
  categoryId?: string;
  density?:
    | "default"
    | "standard"
    | "compact"
    | "editorial"
    | "rail"
    | "discovery";
};

export function SponsoredProductCard({
  row,
  basePath,
  index,
  currency,
  categoryId,
  density = "standard",
}: SponsoredProductCardProps) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const product = row.product;
  const ad = row.ad;
  const slug = productDetailPathSegment(product);
  const placeholderHref = `${basePath}/products/${slug}`;

  useEffect(() => {
    const node = rootRef.current;
    if (!node || !ad.impression_token) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          recordSponsoredImpression(ad.impression_token);
          observer.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [ad.impression_token]);

  const handleNavigate = (event: MouseEvent<HTMLAnchorElement>) => {
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    ) {
      return;
    }
    event.preventDefault();
    void sponsoredProductNavigateHref(basePath, slug, ad).then((href) => {
      router.push(href);
    });
  };

  return (
    <div ref={rootRef} className="h-full">
      <ProductCard
        product={product}
        basePath={basePath}
        categoryId={categoryId}
        index={index}
        href={placeholderHref}
        currency={currency}
        density={density}
        showFavorite={density !== "discovery"}
        recommendationClick={undefined}
        listId={`sponsored-${ad.placement}`}
        listName={ad.disclosure_label || "Sponsored"}
        sponsoredDisclosure={ad.disclosure_label || "Sponsored"}
        onSponsoredNavigate={handleNavigate}
      />
    </div>
  );
}
