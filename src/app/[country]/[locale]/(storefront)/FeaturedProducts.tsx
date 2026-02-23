"use client";

import type { StoreProduct } from "@spree/sdk";
import { useEffect, useState } from "react";
import { ProductGrid } from "@/components/products/ProductGrid";
import { useStore } from "@/contexts/StoreContext";
import { trackViewItemList } from "@/lib/analytics/gtm";
import { getProducts } from "@/lib/data/products";

interface FeaturedProductsProps {
  basePath: string;
}

export function FeaturedProducts({ basePath }: FeaturedProductsProps) {
  const { currency, locale, loading: storeLoading } = useStore();
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait for store context to load (to get correct currency)
    if (storeLoading) return;

    let cancelled = false;

    const fetchProducts = async () => {
      setLoading(true);
      try {
        const response = await getProducts(
          { per_page: 8 },
          { currency, locale },
        );
        if (!cancelled) {
          setProducts(response.data);
          trackViewItemList(
            response.data,
            "featured-products",
            "Featured Products",
            currency,
          );
        }
      } catch (error) {
        console.error("Failed to fetch featured products:", error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchProducts();

    return () => {
      cancelled = true;
    };
  }, [currency, locale, storeLoading]);

  if (loading || storeLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="aspect-square bg-gray-200 rounded-xl mb-4" />
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-1/4" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <ProductGrid
      products={products}
      basePath={basePath}
      listId="featured-products"
      listName="Featured Products"
    />
  );
}
