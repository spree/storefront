"use server";

import {
  type Channel,
  formatMoney,
  type Price,
  type ProductListParams,
} from "@spree/sdk";
import {
  getAccessToken,
  getLocaleOptions,
  getWholesaleClient,
  isWholesaleEnabled,
  withAuthRefresh,
} from "@/lib/spree";
import {
  getProduct as getProductBySurface,
  getProductFilters as getProductFiltersBySurface,
  getProducts as getProductsBySurface,
} from "./products";
import { withFallback } from "./utils";

function formatVariantPrice(
  price: Price | null | undefined,
  locale: string | undefined,
): string | undefined {
  if (!price?.amount || !price.currency) return undefined;
  return formatMoney(price.amount, price.currency, locale, { unitPrice: true });
}

/**
 * Fetch the wholesale channel's resolved configuration (access posture, guest
 * checkout). Reachable without authentication even on the gated channel so the
 * portal can render a sign-in wall.
 *
 * Returns null when the wholesale addon is off. The `(wholesale)` layout 404s
 * those routes, but Next.js renders layouts and pages concurrently — during
 * static generation the page below it still runs, so this must not throw when
 * the addon is disabled. Null is already the "channel unreachable" value every
 * caller handles, so a DTC-only build degrades to the sign-in wall rather than
 * failing the build.
 */
export async function getWholesaleChannel(): Promise<Channel | null> {
  if (!isWholesaleEnabled()) return null;

  return withFallback(async () => getWholesaleClient().channel.get(), null);
}

// --- Surface-bound product fetchers for the wholesale PLP/PDP ---
//
// These wrap the surface-aware data functions with the `'wholesale'` surface
// pre-bound, giving the `(params) => Promise` shape that <ProductListing>'s
// fetcher props expect. The channel 401s guests, so these must run for an
// authenticated, approved buyer.

export async function getWholesaleProducts(params?: ProductListParams) {
  return getProductsBySurface(params, "wholesale");
}

export async function getWholesaleProductFilters(
  params?: Record<string, unknown>,
) {
  return getProductFiltersBySurface(params, "wholesale");
}

export async function getWholesaleProduct(
  slugOrId: string,
  params?: { expand?: string[] },
) {
  return getProductBySurface(slugOrId, params, "wholesale");
}

/** A selectable variant in the quick-order autocomplete. */
export interface WholesaleVariantSuggestion {
  variantId: string;
  productName: string;
  /** Variant option label ("Matte Black"), absent for single-variant products. */
  optionsText?: string;
  sku: string;
  displayPrice?: string;
  purchasable: boolean;
}

/**
 * Search the wholesale catalog for variants matching a free-text query (product
 * name or SKU), for the quick-order autocomplete. Flattens products to variants
 * so buyers can pick the exact colour/size rather than just the product.
 * Requires the customer JWT — the channel 401s guests.
 */
export async function searchWholesaleVariants(
  query: string,
  limit = 8,
): Promise<WholesaleVariantSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const token = await getAccessToken();
  if (!token) return [];

  return withFallback(async () => {
    const { locale } = await getLocaleOptions();
    const response = await withAuthRefresh((options) =>
      getWholesaleClient().products.list(
        { search: trimmed, expand: ["variants"], limit },
        options,
      ),
    );

    const suggestions: WholesaleVariantSuggestion[] = [];
    for (const product of response.data) {
      // Products always expose at least a default variant; list every variant
      // so multi-variant products are individually selectable.
      for (const variant of product.variants ?? []) {
        if (!variant.sku) continue;
        suggestions.push({
          variantId: variant.id,
          productName: product.name,
          optionsText: variant.options_text || undefined,
          sku: variant.sku,
          displayPrice: formatVariantPrice(variant.price, locale),
          purchasable: variant.purchasable ?? false,
        });
        if (suggestions.length >= limit) return suggestions;
      }
    }
    return suggestions;
  }, []);
}

/**
 * Resolve a SKU to a purchasable variant on the wholesale channel, for the
 * quick-order form. Searches products by SKU and returns the first matching
 * variant with enough detail to add it to the cart. Requires the customer JWT.
 */
export async function findWholesaleVariantBySku(sku: string): Promise<
  | {
      found: true;
      variantId: string;
      productName: string;
      productSlug: string;
      sku: string;
      optionsText?: string;
      displayPrice?: string;
      purchasable: boolean;
    }
  | { found: false }
> {
  const trimmed = sku.trim();
  if (!trimmed) return { found: false };

  const token = await getAccessToken();
  if (!token) return { found: false };

  return withFallback(
    async () => {
      const { locale } = await getLocaleOptions();
      const response = await withAuthRefresh((options) =>
        getWholesaleClient().products.list(
          {
            // Full-text search spans product name + SKU; we match the exact
            // SKU against the returned variants below.
            search: trimmed,
            expand: ["variants"],
            limit: 5,
          },
          options,
        ),
      );

      for (const product of response.data) {
        const variant = product.variants?.find(
          (v) => v.sku?.toLowerCase() === trimmed.toLowerCase(),
        );
        if (variant) {
          return {
            found: true as const,
            variantId: variant.id,
            productName: product.name,
            productSlug: product.slug,
            sku: variant.sku ?? trimmed,
            optionsText: variant.options_text || undefined,
            displayPrice: formatVariantPrice(variant.price, locale),
            purchasable: variant.purchasable ?? false,
          };
        }
      }

      return { found: false as const };
    },
    { found: false as const },
  );
}
