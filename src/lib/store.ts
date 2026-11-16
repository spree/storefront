/**
 * Centralized store configuration.
 *
 * All store-level environment variables are accessed here so the rest of the
 * codebase has a single source of truth with consistent fallback values.
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
 * Get the store name from environment variables.
 */
export function getStoreName(): string {
  return process.env.NEXT_PUBLIC_STORE_NAME || "Oddkeeps";
}

/**
 * Get the store description from environment variables.
 */
export function getStoreDescription(): string {
  return (
    process.env.NEXT_PUBLIC_STORE_DESCRIPTION ||
    "Discover distinctive products from independent sellers."
  );
}

export function getSellerOnboardingUrl(): string | undefined {
  const url = process.env.SELLER_ONBOARDING_URL;
  return url ? ensureProtocol(url) : undefined;
}

export function getSellerPanelUrl(): string | undefined {
  const url = process.env.SELLER_PANEL_URL;
  return url ? ensureProtocol(url) : undefined;
}

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
 * Get the SEO title, preferring STORE_SEO_TITLE and falling back to the
 * store name (NEXT_PUBLIC_STORE_NAME).
 */
export function getStoreSeoTitle(): string {
  return process.env.STORE_SEO_TITLE || getStoreName();
}

/**
 * Get the meta description, preferring STORE_META_DESCRIPTION and falling
 * back to the store description (NEXT_PUBLIC_STORE_DESCRIPTION).
 */
export function getStoreMetaDescription(): string {
  return process.env.STORE_META_DESCRIPTION || getStoreDescription();
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
