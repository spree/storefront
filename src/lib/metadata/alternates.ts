import type { Market } from "@spree/sdk";
import { resolveSupportedLocale, type SupportedLocale } from "@/i18n/locales";
import {
  getDefaultMarketLocaleTarget,
  getMarketDefaultLocale,
  getMarketLocaleTargets,
  type MarketLocaleTarget,
} from "@/i18n/markets";
import { canonicalizeLocale } from "@/i18n/normalize";
import { getStorefrontMarkets } from "@/lib/data/markets";
import { buildCanonicalUrl } from "@/lib/seo";
import { getDefaultCountry, getDefaultLocale } from "@/lib/store";

export interface LocalizedResourcePath {
  path: string;
  fingerprint: string;
}

type LocalizedPathResolver = (
  target: MarketLocaleTarget,
) => Promise<LocalizedResourcePath | null | undefined>;

interface BuildHreflangLanguagesParams {
  storeUrl: string;
  country: string;
  locale: string;
  path: string;
  currentResourceFingerprint?: string;
  resolvePath?: LocalizedPathResolver;
}

export interface LocalizedAlternates {
  canonical: string;
  languages: Record<string, string>;
}

interface StoreHreflangCluster {
  targets: MarketLocaleTarget[];
  currentTarget: MarketLocaleTarget;
  xDefaultTarget: MarketLocaleTarget;
  contentDefaultLocale?: SupportedLocale;
  marketDefaultLocales: Map<string, SupportedLocale>;
  includeCountry: boolean;
}

/**
 * Produce a stable comparison value for fields translated by Spree/Mobility.
 * The Store API falls back to the Store default locale when a translation is
 * absent, so resource alternates are published only when their translated
 * fields differ from that fallback payload.
 */
export function translationFingerprint(...fields: unknown[]): string {
  return JSON.stringify(fields);
}

function getStoreHreflangCluster(
  markets: Market[],
  country: string,
  locale: SupportedLocale,
): StoreHreflangCluster | undefined {
  const targets = getMarketLocaleTargets(markets);
  const normalizedCountry = country.toLowerCase();
  const currentTarget = targets.find(
    (target) =>
      target.country === normalizedCountry && target.locale === locale,
  );
  if (!currentTarget) return undefined;

  const configuredCountry = getDefaultCountry();
  const configuredLocale = resolveSupportedLocale(getDefaultLocale());
  const configuredTarget = configuredLocale
    ? targets.find(
        (target) =>
          target.country === configuredCountry &&
          target.locale === configuredLocale,
      )
    : undefined;
  const marketDefaultTarget = getDefaultMarketLocaleTarget(markets);
  const xDefaultTarget =
    configuredTarget ??
    (marketDefaultTarget
      ? targets.find(
          (target) => targetKey(target) === targetKey(marketDefaultTarget),
        )
      : undefined) ??
    targets[0];
  if (!xDefaultTarget) return undefined;

  const defaultMarket = markets.find((market) => market.default) ?? markets[0];
  const contentDefaultLocale = resolveSupportedLocale(
    defaultMarket?.default_locale,
  );
  const marketDefaultLocales = new Map<string, SupportedLocale>();
  for (const market of markets) {
    const marketDefaultLocale = getMarketDefaultLocale(market);
    if (marketDefaultLocale) {
      marketDefaultLocales.set(market.id, marketDefaultLocale);
    }
  }

  return {
    targets,
    currentTarget,
    xDefaultTarget,
    contentDefaultLocale,
    marketDefaultLocales,
    includeCountry: new Set(targets.map((target) => target.country)).size > 1,
  };
}

function normalizeHrefLang(
  target: MarketLocaleTarget,
  includeCountry: boolean,
): string {
  const canonicalLocale = canonicalizeLocale(target.locale) ?? target.locale;
  if (!includeCountry) return canonicalLocale;

  try {
    const locale = new Intl.Locale(canonicalLocale);
    return [locale.language, locale.script, target.country.toUpperCase()]
      .filter(Boolean)
      .join("-");
  } catch {
    return `${canonicalLocale.split("-")[0].toLowerCase()}-${target.country.toUpperCase()}`;
  }
}

function withLocalePrefix(
  country: string,
  locale: string,
  path: string,
): string {
  const normalizedPath = path ? (path.startsWith("/") ? path : `/${path}`) : "";
  return `/${country.toLowerCase()}/${locale}${normalizedPath}`;
}

/**
 * Build a reciprocal hreflang cluster across every Market served by this
 * storefront. Multi-country stores use regional codes (for example en-US and
 * en-CA) to avoid duplicate language keys.
 *
 * Resource pages provide a stable-ID resolver and fingerprints of translated
 * fields. This prevents Spree's default-locale fallback from being mistaken
 * for a real translation. Resolver failures are omitted without failing all
 * metadata generation.
 */
export async function buildLocalizedAlternates({
  storeUrl,
  country,
  locale,
  path,
  currentResourceFingerprint,
  resolvePath,
}: BuildHreflangLanguagesParams): Promise<LocalizedAlternates> {
  const currentLocale = resolveSupportedLocale(locale);
  const currentUrl = buildCanonicalUrl(
    storeUrl,
    withLocalePrefix(country, locale, path),
  );
  let cluster: StoreHreflangCluster | undefined;

  try {
    const { data: markets } = await getStorefrontMarkets();
    if (currentLocale) {
      cluster = getStoreHreflangCluster(markets, country, currentLocale);
    }
  } catch {
    // Keep self-referencing metadata available during Store API outages.
  }

  if (!cluster || !currentLocale) {
    return {
      canonical: currentUrl,
      languages: {
        ...(currentLocale ? { [currentLocale]: currentUrl } : {}),
        "x-default": currentUrl,
      },
    };
  }

  const currentTarget = cluster.currentTarget;
  const resolvedResources = new Map<
    string,
    Promise<LocalizedResourcePath | null | undefined>
  >();

  if (currentResourceFingerprint !== undefined) {
    resolvedResources.set(
      resourceKey(currentTarget),
      Promise.resolve({ path, fingerprint: currentResourceFingerprint }),
    );
  }

  const resolveLocalizedResource = (
    target: MarketLocaleTarget,
  ): Promise<LocalizedResourcePath | null | undefined> => {
    if (!resolvePath) {
      return Promise.resolve({ path, fingerprint: "" });
    }

    const key = resourceKey(target);
    const cachedResource = resolvedResources.get(key);
    if (cachedResource) return cachedResource;

    const pendingResource = Promise.resolve()
      .then(() => resolvePath(target))
      .catch(() => null);
    resolvedResources.set(key, pendingResource);
    return pendingResource;
  };

  const verifyTranslations = Boolean(
    resolvePath !== undefined &&
      currentResourceFingerprint !== undefined &&
      cluster.contentDefaultLocale,
  );
  const resourcesPromise = Promise.all(
    cluster.targets.map(async (target) => {
      const fallbackTarget = cluster.contentDefaultLocale
        ? { ...target, locale: cluster.contentDefaultLocale }
        : undefined;
      const [resource, fallbackResource] = await Promise.all([
        resolveLocalizedResource(target),
        verifyTranslations && fallbackTarget
          ? resolveLocalizedResource(fallbackTarget)
          : Promise.resolve(undefined),
      ]);
      return { target, resource, fallbackResource };
    }),
  );
  const resolvedResourcesByTarget = await resourcesPromise;

  const languages: Record<string, string> = {};
  const urlsByTarget = new Map<string, string>();
  const fallbackTargets = new Set<string>();

  for (const {
    target,
    resource,
    fallbackResource,
  } of resolvedResourcesByTarget) {
    if (!resource) continue;
    const isFallback = Boolean(
      verifyTranslations &&
        target.locale !== cluster.contentDefaultLocale &&
        fallbackResource &&
        resource.fingerprint === fallbackResource.fingerprint,
    );
    if (isFallback) {
      fallbackTargets.add(targetKey(target));
      continue;
    }

    const hrefLang = normalizeHrefLang(target, cluster.includeCountry);
    const url = buildCanonicalUrl(
      storeUrl,
      withLocalePrefix(target.country, target.locale, resource.path),
    );
    languages[hrefLang] = url;
    urlsByTarget.set(targetKey(target), url);
  }

  languages["x-default"] =
    urlsByTarget.get(targetKey(cluster.xDefaultTarget)) ??
    Object.values(languages)[0] ??
    currentUrl;

  const currentIsFallback = fallbackTargets.has(targetKey(currentTarget));
  const currentMarketDefaultLocale = cluster.marketDefaultLocales.get(
    currentTarget.marketId,
  );
  const currentMarketDefaultTarget = currentMarketDefaultLocale
    ? {
        ...currentTarget,
        locale: currentMarketDefaultLocale,
      }
    : undefined;
  const canonical = currentIsFallback
    ? ((currentMarketDefaultTarget
        ? urlsByTarget.get(targetKey(currentMarketDefaultTarget))
        : undefined) ??
      urlsByTarget.get(targetKey(cluster.xDefaultTarget)) ??
      Object.values(languages)[0] ??
      currentUrl)
    : currentUrl;

  return { canonical, languages };
}

export async function buildHreflangLanguages(
  params: BuildHreflangLanguagesParams,
): Promise<Record<string, string>> {
  return (await buildLocalizedAlternates(params)).languages;
}

function resourceKey(target: MarketLocaleTarget): string {
  return `${target.marketId}:${target.locale.toLowerCase()}`;
}

function targetKey(target: MarketLocaleTarget): string {
  return `${resourceKey(target)}:${target.country.toLowerCase()}`;
}
