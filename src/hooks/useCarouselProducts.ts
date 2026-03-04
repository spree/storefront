import type { StoreProduct } from "@spree/sdk";
import { useEffect, useState } from "react";
import { getProducts, getTaxonProducts } from "@/lib/data/products";

interface UseCarouselProductsOptions {
  taxonId?: string;
  limit?: number;
}

interface UseCarouselProductsResult {
  products: StoreProduct[];
  loading: boolean;
  error: string | null;
}

export function useCarouselProducts({
  taxonId,
  limit = 8,
}: UseCarouselProductsOptions = {}): UseCarouselProductsResult {
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = { limit };

        const response = taxonId
          ? await getTaxonProducts(taxonId, params)
          : await getProducts(params);

        if (!cancelled) {
          setProducts(response.data);
        }
      } catch (err) {
        console.error("Failed to fetch carousel products:", err);
        if (!cancelled) {
          setError("Failed to load products. Please try again later.");
        }
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
  }, [taxonId, limit]);

  return { products, loading, error };
}
