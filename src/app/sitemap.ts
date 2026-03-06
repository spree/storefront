import type { StoreProduct, StoreTaxon } from "@spree/sdk";
import type { MetadataRoute } from "next";
import { getCountries } from "@/lib/data/countries";
import { getProducts } from "@/lib/data/products";
import { getStore } from "@/lib/data/store";
import { getTaxons } from "@/lib/data/taxonomies";

/**
 * Sitemap locale mode — controls which country/locale combinations are
 * included in the generated sitemap.
 *
 * Set via the SITEMAP_LOCALE_MODE env variable:
 *   - "default"  — only the store's default country and locale (default)
 *   - "selected" — only the countries listed in SITEMAP_COUNTRIES (comma-separated ISO codes)
 *   - "all"      — every country available in the Spree store
 *
 * Each country resolves its locale from country.default_locale, falling back
 * to the store's default locale.
 */
type SitemapLocaleMode = "default" | "selected" | "all";

interface CountryLocale {
  country: string;
  locale: string;
}

/** Google's limit is 50,000 URLs per sitemap file. */
const URLS_PER_SITEMAP = 50_000;
const STATIC_PAGES_PER_LOCALE = 3;
const VALID_LOCALE_MODES: SitemapLocaleMode[] = ["default", "selected", "all"];
const MAX_PAGES = 1000;

/**
 * Module-level cache so that multiple sitemap({id}) calls during the same
 * `next build` process reuse already-fetched data instead of hitting the
 * API O(chunks) times.
 */
let cachedProducts: Promise<StoreProduct[]> | null = null;
let cachedTaxons: Promise<StoreTaxon[]> | null = null;
let cachedCountryLocales: Promise<CountryLocale[]> | null = null;

function getCachedProducts(): Promise<StoreProduct[]> {
  if (!cachedProducts) {
    cachedProducts = fetchAllProducts().catch((err) => {
      cachedProducts = null;
      throw err;
    });
  }
  return cachedProducts;
}

function getCachedTaxons(): Promise<StoreTaxon[]> {
  if (!cachedTaxons) {
    cachedTaxons = fetchAllTaxons().catch((err) => {
      cachedTaxons = null;
      throw err;
    });
  }
  return cachedTaxons;
}

function getCachedCountryLocales(
  store: Awaited<ReturnType<typeof getStore>>,
): Promise<CountryLocale[]> {
  if (!cachedCountryLocales) {
    cachedCountryLocales = resolveCountryLocales(store).catch((err) => {
      cachedCountryLocales = null;
      throw err;
    });
  }
  return cachedCountryLocales;
}

/**
 * Splits the sitemap into multiple files when the total URL count
 * exceeds 50,000 (Google's per-sitemap limit).
 *
 * Next.js generates /sitemap/0.xml, /sitemap/1.xml, etc.
 * robots.ts references all chunks via generateSitemaps().
 *
 * @see https://nextjs.org/docs/app/api-reference/functions/generate-sitemaps
 */
export async function generateSitemaps() {
  const store = await getStore();
  const countryLocales = await getCachedCountryLocales(store);

  // Lightweight count — fetch only 1 record per request to read meta.count.
  // Taxon count is approximate (includes root taxons filtered out during generation),
  // so we may produce one extra sitemap file at most — harmless for SEO.
  const [productCount, taxonCount] = await Promise.all([
    fetchTotalCount("products"),
    fetchTotalCount("taxons"),
  ]);

  const urlsPerLocale = STATIC_PAGES_PER_LOCALE + productCount + taxonCount;
  const totalUrls = urlsPerLocale * countryLocales.length;
  const sitemapCount = Math.max(1, Math.ceil(totalUrls / URLS_PER_SITEMAP));

  return Array.from({ length: sitemapCount }, (_, i) => ({ id: i }));
}

export default async function sitemap(props: {
  id: Promise<string>;
}): Promise<MetadataRoute.Sitemap> {
  const id = Number(await props.id);

  const store = await getStore();
  const baseUrl = (store.url || process.env.NEXT_PUBLIC_SITE_URL || "").replace(
    /\/$/,
    "",
  );

  if (!baseUrl) {
    console.error(
      "Sitemap generation skipped: neither store.url nor NEXT_PUBLIC_SITE_URL is set. " +
        "Sitemaps require absolute URLs.",
    );
    return [];
  }

  const countryLocales = await getCachedCountryLocales(store);

  const [allProducts, allTaxons] = await Promise.all([
    getCachedProducts(),
    getCachedTaxons(),
  ]);

  const nonRootTaxons = allTaxons.filter((t) => !t.is_root);

  // Build entries for all locales, then slice to the requested chunk.
  // For most stores (< 50k URLs) this produces a single chunk so no slicing occurs.
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];

  for (const { country, locale } of countryLocales) {
    const basePath = `${baseUrl}/${country}/${locale}`;

    // Static pages
    entries.push(
      {
        url: basePath,
        lastModified: now,
        changeFrequency: "daily",
        priority: 1,
      },
      {
        url: `${basePath}/products`,
        lastModified: now,
        changeFrequency: "daily",
        priority: 0.8,
      },
      {
        url: `${basePath}/taxonomies`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.7,
      },
    );

    // Product pages with image sitemaps
    for (const product of allProducts) {
      entries.push({
        url: `${basePath}/products/${product.slug}`,
        ...safeLastModified(product.updated_at),
        changeFrequency: "weekly",
        priority: 0.6,
        ...(product.images && product.images.length > 0
          ? {
              images: product.images
                .map((img) => img.original_url)
                .filter((url): url is string => url != null),
            }
          : {}),
      });
    }

    // Category/taxon pages
    for (const taxon of nonRootTaxons) {
      entries.push({
        url: `${basePath}/t/${taxon.permalink}`,
        ...safeLastModified(taxon.updated_at),
        changeFrequency: "weekly",
        priority: 0.5,
      });
    }
  }

  // Return only the slice for this sitemap chunk
  if (id === 0 && entries.length <= URLS_PER_SITEMAP) {
    return entries;
  }
  const start = id * URLS_PER_SITEMAP;
  return entries.slice(start, start + URLS_PER_SITEMAP);
}

/**
 * Resolves the list of country/locale pairs to include in the sitemap
 * based on the SITEMAP_LOCALE_MODE environment variable.
 */
async function resolveCountryLocales(
  store: Awaited<ReturnType<typeof getStore>>,
): Promise<CountryLocale[]> {
  const rawMode = process.env.SITEMAP_LOCALE_MODE || "default";
  let mode: SitemapLocaleMode;
  if (VALID_LOCALE_MODES.includes(rawMode as SitemapLocaleMode)) {
    mode = rawMode as SitemapLocaleMode;
  } else {
    console.warn(
      `Invalid SITEMAP_LOCALE_MODE "${rawMode}". Expected one of: ${VALID_LOCALE_MODES.join(", ")}. Falling back to "default".`,
    );
    mode = "default";
  }

  const storeDefaultLocale =
    store.default_locale || process.env.NEXT_PUBLIC_DEFAULT_LOCALE || "en";

  if (mode === "default") {
    const defaultCountry = (
      process.env.NEXT_PUBLIC_DEFAULT_COUNTRY || "us"
    ).toLowerCase();

    return [{ country: defaultCountry, locale: storeDefaultLocale }];
  }

  // For "all" and "selected" modes we need the countries from the API
  const countriesResponse = await getCountries();
  const allCountries = countriesResponse.data;

  if (mode === "selected") {
    const selectedIsos = (process.env.SITEMAP_COUNTRIES || "")
      .split(",")
      .map((iso) => iso.trim().toLowerCase())
      .filter(Boolean);

    if (selectedIsos.length === 0) {
      console.warn(
        "SITEMAP_LOCALE_MODE is 'selected' but SITEMAP_COUNTRIES is empty. Falling back to default country.",
      );
      const defaultCountry = (
        process.env.NEXT_PUBLIC_DEFAULT_COUNTRY || "us"
      ).toLowerCase();
      return [{ country: defaultCountry, locale: storeDefaultLocale }];
    }

    return selectedIsos.map((iso) => {
      const found = allCountries.find((c) => c.iso.toLowerCase() === iso);
      return {
        country: iso,
        locale: found?.default_locale || storeDefaultLocale,
      };
    });
  }

  // mode === "all"
  return allCountries.map((c) => ({
    country: c.iso.toLowerCase(),
    locale: c.default_locale || storeDefaultLocale,
  }));
}

/**
 * Fetches only the total count for products or taxons without loading all data.
 * Used by generateSitemaps() to calculate the number of sitemap files needed.
 */
async function fetchTotalCount(
  resource: "products" | "taxons",
): Promise<number> {
  const fetcher = resource === "products" ? getProducts : getTaxons;
  const response = await fetcher({ page: 1, per_page: 1 });
  return response.meta.count;
}

function safeLastModified(
  dateStr: string | null | undefined,
): { lastModified: Date } | Record<string, never> {
  if (!dateStr) return {};
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return {};
  return { lastModified: date };
}

async function fetchAllProducts(): Promise<StoreProduct[]> {
  const allProducts: StoreProduct[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const response = await getProducts({
      page,
      per_page: 100,
      includes: "images",
    });
    allProducts.push(...response.data);
    totalPages = response.meta.pages;
    page++;
  } while (page <= totalPages && page <= MAX_PAGES);

  return allProducts;
}

async function fetchAllTaxons(): Promise<StoreTaxon[]> {
  const allTaxons: StoreTaxon[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const response = await getTaxons({ page, per_page: 100 });
    allTaxons.push(...response.data);
    totalPages = response.meta.pages;
    page++;
  } while (page <= totalPages && page <= MAX_PAGES);

  return allTaxons;
}
