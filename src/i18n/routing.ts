import { toRouteLocale } from "@/i18n/normalize";

export const REQUEST_PATHNAME_HEADER = "x-spree-request-pathname";
export const REQUEST_SEARCH_HEADER = "x-spree-request-search";

interface LocalizedRedirectParams {
  country: string;
  locale: string;
  pathname?: string | null;
  search?: string | null;
}

const LOCALIZED_PREFIX = /^\/[a-z]{2}\/[a-z]{2,3}(?:-[a-z0-9]{2,8})*(?=\/|$)/i;

/** Replace only the country/locale prefix while retaining the requested page. */
export function buildLocalizedRedirectPath({
  country,
  locale,
  pathname,
  search,
}: LocalizedRedirectParams): string {
  const normalizedLocale =
    toRouteLocale(locale) ?? locale.trim().replaceAll("_", "-").toLowerCase();
  const prefix = `/${country.toLowerCase()}/${normalizedLocale}`;
  const matchedPrefix = pathname?.match(LOCALIZED_PREFIX)?.[0];
  const suffix = matchedPrefix ? pathname?.slice(matchedPrefix.length) : "";
  const normalizedSearch = search?.startsWith("?") ? search : "";

  return `${prefix}${suffix || ""}${normalizedSearch}`;
}
