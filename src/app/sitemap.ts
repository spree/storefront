import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { DEFAULT_LOCALE, resolveSupportedLocale } from "@/i18n/locales";
import {
  getMarketLocaleTargets,
  type MarketLocaleTarget,
} from "@/i18n/markets";
import {
  getSitemapCategoryPage,
  getSitemapCollectionPage,
  getSitemapMarkets,
  getSitemapProductPage,
  getSitemapResourceCount,
  getSitemapSellerPage,
  type SitemapCategory,
  type SitemapCollection,
  type SitemapProduct,
  type SitemapResource,
  type SitemapSeller,
} from "@/lib/data/sitemap";
import { isMarketplaceEnabled } from "@/lib/spree";
import { getDefaultCountry, getDefaultLocale, getStoreUrl } from "@/lib/store";

type CountryLocale = MarketLocaleTarget;

interface LocaleOptions {
  locale: string;
  country: string;
}

type SitemapEntry = MetadataRoute.Sitemap[number];

interface LocaleCatalog extends LocaleOptions {
  marketId: string;
  /** Items per resource; 0 for a resource that is disabled or skipped. */
  counts: Record<SitemapResource, number>;
}

/**
 * A sitemap entry whose `url` is relative to `/{country}/{locale}`, so a
 * translated page can be shared by every country using that locale. `null`
 * marks an item that is counted but not listed (a root category).
 */
type RelativeEntry = SitemapEntry | null;

/** Store API pages already requested during one sitemap response. */
type PageCaches = Record<
  SitemapResource,
  Map<string, Promise<RelativeEntry[]>>
>;

interface ResourceSource {
  /** Off resources are never counted or fetched. */
  enabled: () => boolean;
  /**
   * Optional resources are extras: a failing count skips them for that
   * locale instead of failing the sitemap.
   */
  optional: boolean;
  loadPage: (
    marketId: string,
    page: number,
    limit: number,
    options: LocaleOptions,
  ) => Promise<RelativeEntry[]>;
}

/**
 * Every resource listed per country/locale, in sitemap order. Chunk
 * positions follow this order.
 */
const RESOURCES: Record<SitemapResource, ResourceSource> = {
  products: {
    enabled: () => true,
    optional: false,
    loadPage: async (...args) =>
      (await getSitemapProductPage(...args)).map(productEntry),
  },
  categories: {
    enabled: () => true,
    optional: false,
    loadPage: async (...args) =>
      (await getSitemapCategoryPage(...args)).map(categoryEntry),
  },
  collections: {
    enabled: () => true,
    optional: true,
    loadPage: async (...args) =>
      (await getSitemapCollectionPage(...args)).map(collectionEntry),
  },
  sellers: {
    enabled: isMarketplaceEnabled,
    optional: true,
    loadPage: async (...args) =>
      (await getSitemapSellerPage(...args)).map(sellerEntry),
  },
};

const RESOURCE_ORDER = Object.keys(RESOURCES) as SitemapResource[];

/**
 * Google permits 50,000 URLs, but 10,000 keeps each request below roughly 100
 * Store API pages and avoids long-running sitemap responses on large catalogs.
 */
const URLS_PER_SITEMAP = 10_000;
const ITEMS_PER_PAGE = 100;
const MAX_PAGES = 1000;
const MAX_CONCURRENT_PAGE_REQUESTS = 8;
const MAX_CONCURRENT_CATALOG_REQUESTS = 4;
/** Maximum items we can actually fetch, given pagination limits. */
const MAX_FETCHABLE_ITEMS = ITEMS_PER_PAGE * MAX_PAGES;

/**
 * Default locale options for build-time API calls. During build, cookies() is
 * not available, so sitemap requests always pass explicit locale options.
 */
function getDefaultLocaleOptions(): LocaleOptions {
  return {
    locale: getDefaultLocale(),
    country: getDefaultCountry(),
  };
}

async function resolveLocaleCatalogs(
  countryLocales: CountryLocale[],
): Promise<Map<string, LocaleCatalog>> {
  const uniqueTargets = new Map<string, CountryLocale>();

  for (const target of countryLocales) {
    const key = catalogKey(target);
    if (!uniqueTargets.has(key)) uniqueTargets.set(key, target);
  }

  const targets = Array.from(uniqueTargets.entries());
  const entries: Array<readonly [string, LocaleCatalog]> = [];
  for (
    let offset = 0;
    offset < targets.length;
    offset += MAX_CONCURRENT_CATALOG_REQUESTS
  ) {
    const batch = targets.slice(
      offset,
      offset + MAX_CONCURRENT_CATALOG_REQUESTS,
    );
    entries.push(
      ...(await Promise.all(
        batch.map(
          async ([key, target]) =>
            [key, await buildLocaleCatalog(target)] as const,
        ),
      )),
    );
  }
  return new Map(entries);
}

function catalogKey(target: { marketId: string; locale: string }): string {
  return `${target.marketId}:${target.locale.toLowerCase()}`;
}

/**
 * Splits the sitemap into bounded files. Counts are fetched once per
 * Market/locale pair: countries in one Market share an inventory, while two
 * Markets using the same locale may expose entirely different catalogs.
 */
export async function generateSitemaps(): Promise<Array<{ id: number }>> {
  try {
    const countryLocales = await resolveCountryLocales();
    const catalogs = await resolveLocaleCatalogs(countryLocales);
    const totalUrls = countryLocales.reduce((total, target) => {
      const catalog = catalogs.get(catalogKey(target));
      return total + (catalog ? catalogSize(catalog) : 0);
    }, 0);
    const sitemapCount = Math.max(1, Math.ceil(totalUrls / URLS_PER_SITEMAP));

    return Array.from({ length: sitemapCount }, (_, id) => ({ id }));
  } catch {
    // API may be unavailable at build time. Return a single sitemap chunk that
    // will be populated on demand when the API recovers.
    return [{ id: 0 }];
  }
}

export default async function sitemap(props: {
  id: Promise<string>;
}): Promise<MetadataRoute.Sitemap> {
  await connection();
  const id = Number(await props.id);
  if (!Number.isSafeInteger(id) || id < 0) return [];

  const baseUrl = resolveBaseUrl();
  if (!baseUrl) return [];

  let countryLocales: CountryLocale[];
  let catalogs: Map<string, LocaleCatalog>;

  try {
    countryLocales = await resolveCountryLocales();
    catalogs = await resolveLocaleCatalogs(countryLocales);
  } catch (error) {
    console.error("Sitemap generation failed: API unavailable.", error);
    return [];
  }

  const chunkStart = id * URLS_PER_SITEMAP;
  const chunkEnd = chunkStart + URLS_PER_SITEMAP;
  const entries: MetadataRoute.Sitemap = [];
  const pageCaches = Object.fromEntries(
    RESOURCE_ORDER.map((resource) => [resource, new Map()]),
  ) as PageCaches;
  let targetStart = 0;

  for (const target of countryLocales) {
    const catalog = catalogs.get(catalogKey(target));
    if (!catalog) continue;

    const targetEnd = targetStart + catalogSize(catalog);
    if (targetEnd <= chunkStart) {
      targetStart = targetEnd;
      continue;
    }
    if (targetStart >= chunkEnd) break;

    const basePath = `${baseUrl}/${target.country}/${target.locale}`;
    appendStaticEntries(entries, basePath, targetStart, chunkStart, chunkEnd);

    // Each resource occupies the next `count` positions after the last.
    let resourceStart = targetStart + staticEntries(basePath).length;
    const requests = RESOURCE_ORDER.map((resource) => {
      const start = resourceStart;
      resourceStart += catalog.counts[resource];
      const range = intersectRange(start, resourceStart, chunkStart, chunkEnd);
      return range
        ? fetchEntryRange(
            resource,
            catalog,
            range.start - start,
            range.end - start,
            pageCaches,
          )
        : Promise.resolve([]);
    });
    const results = await Promise.allSettled(requests);

    for (const [index, result] of results.entries()) {
      if (result.status === "fulfilled") {
        for (const entry of result.value) {
          if (entry) entries.push({ ...entry, url: `${basePath}${entry.url}` });
        }
      } else {
        console.error(
          `Sitemap: skipping ${RESOURCE_ORDER[index]} for ${target.country}/${target.locale}.`,
          result.reason,
        );
      }
    }

    targetStart = targetEnd;
  }

  return entries;
}

function resolveBaseUrl(): string | undefined {
  const candidate = (getStoreUrl() || "").replace(/\/$/, "");

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error(`Unsupported protocol: ${parsed.protocol}`);
    }
    return parsed.origin + parsed.pathname.replace(/\/$/, "");
  } catch {
    console.error(
      "Sitemap generation skipped: neither NEXT_PUBLIC_SITE_URL nor " +
        "NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL is set or valid. " +
        "Sitemaps require absolute http(s) URLs.",
    );
    return undefined;
  }
}

function catalogSize(catalog: LocaleCatalog): number {
  return RESOURCE_ORDER.reduce(
    (size, resource) => size + catalog.counts[resource],
    staticEntries("").length,
  );
}

function intersectRange(
  rangeStart: number,
  rangeEnd: number,
  chunkStart: number,
  chunkEnd: number,
): { start: number; end: number } | undefined {
  const start = Math.max(rangeStart, chunkStart);
  const end = Math.min(rangeEnd, chunkEnd);
  return start < end ? { start, end } : undefined;
}

/**
 * Fixed pages listed once per country/locale. The count feeds chunk
 * positioning, so it must not depend on anything but configuration.
 */
function staticEntries(basePath: string): MetadataRoute.Sitemap {
  return [
    { url: basePath, changeFrequency: "daily", priority: 1 },
    {
      url: `${basePath}/products`,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${basePath}/collections`,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    ...(isMarketplaceEnabled()
      ? [
          {
            url: `${basePath}/sellers`,
            changeFrequency: "weekly" as const,
            priority: 0.6,
          },
        ]
      : []),
  ];
}

function appendStaticEntries(
  entries: MetadataRoute.Sitemap,
  basePath: string,
  targetStart: number,
  chunkStart: number,
  chunkEnd: number,
): void {
  for (const [offset, entry] of staticEntries(basePath).entries()) {
    const position = targetStart + offset;
    if (position >= chunkStart && position < chunkEnd) entries.push(entry);
  }
}

function productEntry(product: SitemapProduct): SitemapEntry {
  return {
    url: `/products/${product.slug}`,
    ...(product.updated_at
      ? { lastModified: new Date(product.updated_at) }
      : {}),
    changeFrequency: "weekly",
    priority: 0.6,
    ...(product.media && product.media.length > 0
      ? {
          images: product.media
            .map((image) => image.original_url || image.large_url)
            .filter((url: string | null): url is string => url != null),
        }
      : {}),
  };
}

function categoryEntry(category: SitemapCategory): RelativeEntry {
  if (category.is_root) return null;
  return {
    url: `/c/${category.permalink}`,
    ...(category.updated_at
      ? { lastModified: new Date(category.updated_at) }
      : {}),
    changeFrequency: "weekly",
    priority: 0.5,
  };
}

function collectionEntry(collection: SitemapCollection): SitemapEntry {
  return {
    url: `/collections/${collection.permalink}`,
    changeFrequency: "weekly",
    priority: 0.5,
  };
}

function sellerEntry(seller: SitemapSeller): SitemapEntry {
  return {
    url: `/sellers/${seller.slug}`,
    changeFrequency: "weekly",
    priority: 0.5,
  };
}

/** Resolve every valid country/locale URL exposed by configured Markets. */
async function resolveCountryLocales(): Promise<CountryLocale[]> {
  const localeOptions = getDefaultLocaleOptions();
  const markets = await getSitemapMarkets(localeOptions);
  const targets = getMarketLocaleTargets(markets);

  return targets.length > 0
    ? targets
    : [
        {
          marketId: "default",
          country: localeOptions.country,
          locale:
            resolveSupportedLocale(localeOptions.locale) ?? DEFAULT_LOCALE,
        },
      ];
}

async function buildLocaleCatalog(
  target: CountryLocale,
): Promise<LocaleCatalog> {
  const localeOptions = { locale: target.locale, country: target.country };
  const counts = await Promise.all(
    RESOURCE_ORDER.map(async (resource) => {
      const source = RESOURCES[resource];
      if (!source.enabled()) return 0;
      const count = getSitemapResourceCount(
        resource,
        target.marketId,
        localeOptions,
      );
      // An optional extra that fails to count drops only its own pages,
      // never the products and categories alongside it.
      return source.optional
        ? count.catch((error) => {
            console.error(
              `Sitemap: skipping ${resource} for ${target.country}/${target.locale}.`,
              error,
            );
            return 0;
          })
        : count;
    }),
  );

  return {
    marketId: target.marketId,
    ...localeOptions,
    counts: Object.fromEntries(
      RESOURCE_ORDER.map((resource, index) => [
        resource,
        Math.min(counts[index], MAX_FETCHABLE_ITEMS),
      ]),
    ) as Record<SitemapResource, number>,
  };
}

function fetchEntryRange(
  resource: SitemapResource,
  catalog: LocaleCatalog,
  start: number,
  end: number,
  pageCaches: PageCaches,
): Promise<RelativeEntry[]> {
  return fetchItemRange(start, end, (page) =>
    getCachedPage(resource, catalog, page, pageCaches[resource]),
  );
}

async function fetchItemRange<T>(
  start: number,
  end: number,
  loadPage: (page: number) => Promise<T[]>,
): Promise<T[]> {
  if (start >= end) return [];

  const firstPage = Math.floor(start / ITEMS_PER_PAGE) + 1;
  const lastPage = Math.ceil(end / ITEMS_PER_PAGE);
  const pages = Array.from(
    { length: lastPage - firstPage + 1 },
    (_, index) => firstPage + index,
  );
  const items: T[] = [];

  for (
    let offset = 0;
    offset < pages.length;
    offset += MAX_CONCURRENT_PAGE_REQUESTS
  ) {
    const batch = pages.slice(offset, offset + MAX_CONCURRENT_PAGE_REQUESTS);
    const results = await Promise.all(batch.map(loadPage));
    for (const result of results) items.push(...result);
  }

  const loadedRangeStart = (firstPage - 1) * ITEMS_PER_PAGE;
  return items.slice(start - loadedRangeStart, end - loadedRangeStart);
}

function getCachedPage(
  resource: SitemapResource,
  catalog: LocaleCatalog,
  page: number,
  cache: PageCaches[SitemapResource],
): Promise<RelativeEntry[]> {
  const key = `${catalogKey(catalog)}:${page}`;
  let cached = cache.get(key);
  if (!cached) {
    cached = RESOURCES[resource]
      .loadPage(catalog.marketId, page, ITEMS_PER_PAGE, {
        locale: catalog.locale,
        country: catalog.country,
      })
      .catch((error) => {
        cache.delete(key);
        throw error;
      });
    cache.set(key, cached);
  }
  return cached;
}
