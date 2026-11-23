import type { Category, Media, Product, Store } from "@spree/sdk";
import { ensureProtocol, getStoreUrl } from "@/lib/store";

/**
 * Default social image path (stored in public/).
 * Replace public/social-image.png with your own 1200x630 OG image.
 */
export const SOCIAL_IMAGE_PATH = "/social-image.webp";

/**
 * Build a full canonical URL from a store URL and a relative path.
 */
export function buildCanonicalUrl(storeUrl: string, path: string): string {
  const base = ensureProtocol(storeUrl).replace(/\/$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

/**
 * Strip HTML tags from a string.
 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

/**
 * Build JSON-LD Product schema.
 * https://schema.org/Product
 */
export function buildProductJsonLd(
  product: Product,
  canonicalUrl: string,
): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    url: canonicalUrl,
  };

  if (product.description) {
    schema.description = stripHtml(product.description);
  }

  if (product.default_variant?.sku) {
    schema.sku = product.default_variant.sku;
  }

  const imageUrls = (product.media || [])
    .map((img: Media) => img.original_url || img.large_url)
    .filter(Boolean);
  // Fall back to thumbnail_url if no media from expand
  if (imageUrls.length === 0 && product.thumbnail_url) {
    imageUrls.push(product.thumbnail_url);
  }
  if (imageUrls.length > 0) {
    schema.image = imageUrls;
  }

  if (product.price?.amount && product.price?.currency) {
    schema.offers = {
      "@type": "Offer",
      url: canonicalUrl,
      priceCurrency: product.price.currency,
      price: product.price.amount,
      // Matches the product page: stock that cannot be bought is not on offer.
      availability:
        product.in_stock && product.purchasable
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
    };
  }

  return schema;
}

/**
 * Build JSON-LD BreadcrumbList schema from a category with ancestors.
 * https://schema.org/BreadcrumbList
 */
export function buildBreadcrumbJsonLd(
  category: Category,
  basePath: string,
  storeUrl: string,
  product?: { name: string; slug: string },
): Record<string, unknown> {
  const items: Array<{ name: string; url: string }> = [
    { name: "Home", url: buildCanonicalUrl(storeUrl, basePath) },
  ];

  if (category.ancestors) {
    for (const ancestor of category.ancestors) {
      if (!ancestor.is_root) {
        items.push({
          name: ancestor.name,
          url: buildCanonicalUrl(
            storeUrl,
            `${basePath}/c/${ancestor.permalink}`,
          ),
        });
      }
    }
  }

  items.push({
    name: category.name,
    url: buildCanonicalUrl(storeUrl, `${basePath}/c/${category.permalink}`),
  });

  if (product) {
    items.push({
      name: product.name,
      url: buildCanonicalUrl(storeUrl, `${basePath}/products/${product.slug}`),
    });
  }

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/** A profile handle as merchants type it, with or without a leading `@`. */
const PROFILE_HANDLE = /^@?([\w.-]+)$/;

/** An X (Twitter) username: 1–15 letters, digits or underscores. */
const TWITTER_USERNAME = /^\w{1,15}$/;

/**
 * Parse a profile URL typed with or without its protocol (`x.com/acme`).
 * Only http(s) URLs with a path are accepted: a bare domain is not a profile.
 */
function parseProfileUrl(value: string): URL | null {
  try {
    const url = new URL(ensureProtocol(value));
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.pathname.length > 1 ? url : null;
  } catch {
    return null;
  }
}

/**
 * A social profile URL from a Store API value, which holds whatever the
 * merchant typed in Spree Admin: a handle (`acme`, `@acme`), a URL without
 * its protocol (`facebook.com/acme`) or a full URL. Anything else is dropped.
 */
export function socialProfileUrl(
  value: string | null | undefined,
  host: string,
): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (trimmed.includes("/")) return parseProfileUrl(trimmed)?.href ?? null;
  const handle = PROFILE_HANDLE.exec(trimmed)?.[1];
  return handle ? `https://${host}/${handle}` : null;
}

/**
 * The store's X (Twitter) account as an `@handle`, for the `twitter:site`
 * meta tag. Accepts the same handle-or-URL value as `socialProfileUrl`, and
 * returns null when no valid username can be read from it.
 */
export function twitterHandle(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const candidate = trimmed.includes("/")
    ? parseProfileUrl(trimmed)?.pathname.split("/")[1]
    : trimmed;
  const username = candidate?.replace(/^@/, "");
  return username && TWITTER_USERNAME.test(username) ? `@${username}` : null;
}

/**
 * Build JSON-LD Organization schema from the store's name, branding, social
 * accounts and support email (Spree Admin → Settings → Store).
 * https://schema.org/Organization
 */
export function buildOrganizationJsonLd(store: Store): Record<string, unknown> {
  const storeUrl = getStoreUrl();

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: store.name,
    ...(storeUrl ? { url: storeUrl } : {}),
  };

  if (store.logo_url) {
    schema.logo = store.logo_url;
  }

  const sameAs = [
    socialProfileUrl(store.facebook, "facebook.com"),
    socialProfileUrl(store.twitter, "x.com"),
    socialProfileUrl(store.instagram, "instagram.com"),
  ].filter((url): url is string => url !== null);
  if (sameAs.length > 0) {
    schema.sameAs = sameAs;
  }

  if (store.customer_support_email) {
    schema.contactPoint = {
      "@type": "ContactPoint",
      email: store.customer_support_email,
      contactType: "customer service",
    };
  }

  return schema;
}
