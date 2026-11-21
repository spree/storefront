/**
 * Centralized store configuration.
 *
 * All store-level environment variables are accessed here so the rest of the
 * codebase has a single source of truth with consistent fallback values.
 *
 * The store name, SEO title and meta description come from the Store API
 * instead — see `getStore()` in `@/lib/data/store`.
 */

/**
 * Ensure a URL has a protocol prefix.
 * If the URL doesn't start with http:// or https://, prepend https://.
 */
export function ensureProtocol(url: string): string {
  const trimmed = url.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

/**
 * Get the store URL, preferring NEXT_PUBLIC_SITE_URL and falling back to
 * NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL. In development, falls back to
 * http://localhost:3001. Returns undefined in production when unconfigured
 * so misconfiguration surfaces immediately.
 */
export function getStoreUrl(): string | undefined {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL;
  if (raw) return ensureProtocol(raw);
  return process.env.NODE_ENV === "development"
    ? "http://localhost:3001"
    : undefined;
}

/**
 * Store name used when the Store API can't be reached, and as the default for
 * email templates rendered outside a webhook (e.g. previews).
 */
export const FALLBACK_STORE_NAME = "Spree Store";

/**
 * Get the default country ISO code (lowercase).
 */
export function getDefaultCountry(): string {
  return (process.env.NEXT_PUBLIC_DEFAULT_COUNTRY || "us").toLowerCase();
}

/**
 * Get the default locale code.
 */
export function getDefaultLocale(): string {
  return process.env.NEXT_PUBLIC_DEFAULT_LOCALE || "en";
}

/**
 * Get the "from" address for transactional emails.
 */
export function getStoreEmailFrom(): string {
  return process.env.EMAIL_FROM || "orders@example.com";
}

/**
 * Returns true when EMAIL_FROM is not set and getStoreEmailFrom() will
 * return the fallback address.
 */
export function isStoreEmailFromFallback(): boolean {
  return !process.env.EMAIL_FROM;
}
