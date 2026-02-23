"use client";

import type { StoreProduct } from "@spree/sdk";
import { notFound } from "next/navigation";
import { useEffect, useState } from "react";
import { useStore } from "@/contexts/StoreContext";
import { trackViewItem } from "@/lib/analytics/gtm";
import { getProduct } from "@/lib/data/products";
import { ProductDetails } from "./ProductDetails";

interface ProductDetailsWrapperProps {
  slug: string;
  basePath: string;
}

export function ProductDetailsWrapper({
  slug,
  basePath,
}: ProductDetailsWrapperProps) {
  const { currency, locale, loading: storeLoading } = useStore();
  const [product, setProduct] = useState<StoreProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Wait for store context to load (to get correct currency)
    if (storeLoading) return;

    let cancelled = false;

    const fetchProduct = async () => {
      setLoading(true);
      try {
        const data = await getProduct(
          slug,
          { includes: "variants,images,option_types" },
          { currency, locale },
        );
        if (!cancelled) {
          setProduct(data);
          setError(false);
          trackViewItem(data, currency);
        }
      } catch (err) {
        console.error("Failed to fetch product:", err);
        if (!cancelled) {
          setError(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchProduct();

    return () => {
      cancelled = true;
    };
  }, [slug, currency, locale, storeLoading]);

  if (loading || storeLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Image skeleton */}
          <div className="aspect-square bg-gray-200 rounded-xl animate-pulse" />

          {/* Content skeleton */}
          <div className="space-y-4">
            <div className="h-8 bg-gray-200 rounded w-3/4 animate-pulse" />
            <div className="h-6 bg-gray-200 rounded w-1/4 animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse" />
            <div className="mt-8 space-y-2">
              <div className="h-4 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    notFound();
  }

  return <ProductDetails product={product} basePath={basePath} />;
}
