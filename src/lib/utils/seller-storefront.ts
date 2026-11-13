import type { Product } from "@spree/sdk";
import type { SellerStorefrontTab } from "@/lib/data/seller-storefront-types";

/** Seller shop content width — aligned with storefront `container` (~1280px). */
export const sellerShopShellClass =
  "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8";

export function getSellerAccentTextColor(hex: string): "#222222" | "#ffffff" {
  const normalized = hex.trim().replace(/^#/, "");
  if (!/^(?:[\da-f]{3}|[\da-f]{6})$/i.test(normalized)) return "#222222";
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((character) => character + character)
          .join("")
      : normalized;
  const value = Number.parseInt(expanded, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  const linearize = (channel: number) => {
    const normalizedChannel = channel / 255;
    return normalizedChannel <= 0.04045
      ? normalizedChannel / 12.92
      : ((normalizedChannel + 0.055) / 1.055) ** 2.4;
  };
  const luminance =
    0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
  const whiteContrast = 1.05 / (luminance + 0.05);
  const darkContrast = (luminance + 0.05) / 0.05;
  return darkContrast >= whiteContrast ? "#222222" : "#ffffff";
}

export function getSellerAccentMutedTextColor(
  textColor: "#222222" | "#ffffff",
): string {
  return textColor === "#222222"
    ? "rgb(34 34 34 / 72%)"
    : "rgb(255 255 255 / 82%)";
}

export function orderProductsByIds(
  products: Product[],
  ids: string[],
): Product[] {
  const byId = new Map(products.map((product) => [product.id, product]));
  return ids.map((id) => byId.get(id)).filter(Boolean) as Product[];
}

export function sellerShopPath(
  basePath: string,
  slug: string,
  tab: SellerStorefrontTab,
  query?: Record<string, string | undefined>,
): string {
  const params = new URLSearchParams({ tab });
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value) params.set(key, value);
    }
  }
  return `${basePath}/sellers/${slug}?${params.toString()}`;
}

export function sellerShopCatalogPath(
  basePath: string,
  slug: string,
  query?: Record<string, string | undefined>,
): string {
  return `${sellerShopPath(basePath, slug, "home", query)}#shop-items`;
}

export function buildSellerShopProductQuery(options: {
  textQuery?: string;
  minPrice?: string;
  maxPrice?: string;
  minRating?: string;
  personalizable?: string;
  onSale?: string;
}): Record<string, string | boolean> | undefined {
  const q: Record<string, string | boolean> = {};
  if (options.textQuery) q.name_cont = options.textQuery;
  if (options.minPrice) q.price_gte = options.minPrice;
  if (options.maxPrice) q.price_lte = options.maxPrice;
  if (options.minRating) q.average_rating_gte = options.minRating;
  if (options.personalizable === "1") q.personalizable = true;
  if (options.onSale === "1") q.on_sale = true;
  return Object.keys(q).length ? q : undefined;
}

export function parseSellerStorefrontTab(
  value: string | undefined,
): SellerStorefrontTab {
  switch (value) {
    case "home":
    case "products":
      return "home";
    case "reviews":
    case "about":
    case "policies":
    case "custom-orders":
      return value;
    default:
      return "home";
  }
}
