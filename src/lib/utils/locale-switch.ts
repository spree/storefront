import { getPathWithoutPrefix } from "@/lib/utils/path";

export interface LocaleAlternate {
  hrefLang: string;
  href: string;
}

/**
 * Sections whose detail pages use translated slugs or permalinks, mapped to
 * the page to land on when the target locale's URL for the resource is
 * unknown. Reusing the old slug under another locale answers 404.
 */
const TRANSLATED_SLUG_FALLBACKS: ReadonlyArray<
  [section: string, path: string]
> = [
  ["/wholesale/products/", "/wholesale"],
  ["/products/", "/products"],
  ["/c/", "/products"],
  ["/collections/", "/collections"],
  ["/policies/", ""],
];

/**
 * Read the hreflang alternates the page's metadata rendered. Next.js may
 * stream metadata into `<body>`, so the whole document is searched.
 */
export function readLocaleAlternates(doc: Document): LocaleAlternate[] {
  return Array.from(
    doc.querySelectorAll<HTMLLinkElement>('link[rel="alternate"][hreflang]'),
  ).map((link) => ({
    hrefLang: link.getAttribute("hreflang") ?? "",
    href: link.getAttribute("href") ?? "",
  }));
}

function pathnameOf(href: string): string | null {
  try {
    return new URL(href, "https://storefront.invalid").pathname;
  } catch {
    return null;
  }
}

function isSamePath(a: string, b: string): boolean {
  const normalize = (path: string): string =>
    (pathnameOf(path) ?? path).replace(/\/+$/, "").toLowerCase();
  return normalize(a) === normalize(b);
}

function isUnderBasePath(pathname: string, basePath: string): boolean {
  const path = pathname.toLowerCase();
  const base = basePath.toLowerCase();
  return path === base || path.startsWith(`${base}/`);
}

/**
 * Resolve where a market/locale switch should land for the current page.
 *
 * 1. The target locale's hreflang alternate — the same URL search engines get,
 *    so translated slugs resolve to the target language's slug.
 * 2. The x-default alternate's path. Pages omit alternates for locales without
 *    their own translation; the Store API then serves the default-locale
 *    content, which it also finds by the default-locale slug. An x-default
 *    that is the current detail page itself is skipped: that is the
 *    no-Market-data output, and its slug is the current locale's.
 * 3. For detail pages with translated slugs and no usable alternate, the
 *    section listing (or home), never the old slug.
 * 4. Any other page keeps its path: it carries no translated segments.
 */
export function resolveLocaleSwitchPath(
  pathname: string,
  nextBasePath: string,
  alternates: LocaleAlternate[],
): string {
  const alternatePaths = alternates
    .map((alternate) => ({
      hrefLang: alternate.hrefLang.toLowerCase(),
      path: pathnameOf(alternate.href),
    }))
    .filter(
      (alternate): alternate is { hrefLang: string; path: string } =>
        alternate.path !== null,
    );

  const targetAlternate = alternatePaths.find(
    (alternate) =>
      alternate.hrefLang !== "x-default" &&
      isUnderBasePath(alternate.path, nextBasePath),
  );
  if (targetAlternate) {
    return `${nextBasePath}${getPathWithoutPrefix(targetAlternate.path)}`;
  }

  const pathRest = getPathWithoutPrefix(pathname);
  const fallback = TRANSLATED_SLUG_FALLBACKS.find(([section]) =>
    pathRest.startsWith(section),
  );

  // Without Market data, buildLocalizedAlternates points x-default at the
  // current page itself. On a translated detail page that is the current
  // locale's slug, so it is not a slug the target locale is known to resolve.
  const defaultAlternate = alternatePaths.find(
    (alternate) =>
      alternate.hrefLang === "x-default" &&
      !(fallback && isSamePath(alternate.path, pathname)),
  );
  if (defaultAlternate) {
    return `${nextBasePath}${getPathWithoutPrefix(defaultAlternate.path)}`;
  }

  return `${nextBasePath}${fallback ? fallback[1] : pathRest}`;
}
