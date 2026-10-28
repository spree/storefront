export function formatDate(
  dateString: string | null,
  fallback = "-",
  locale = "en-US",
): string {
  if (!dateString) return fallback;
  return new Date(dateString).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(
  dateString: string | null,
  locale = "en-US",
): string {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * A payment or fulfillment status, translated under the "orders" namespace.
 * A status without a translation, such as one an extension adds, reads as
 * its own words ("in_production" → "in production").
 */
export function getStatusLabel(
  status: string | null,
  t: { (key: string): string; has(key: string): boolean },
): string {
  if (!status) return t("notAvailable");
  // Map API statuses like "partially_paid" to translation keys like "partiallyPaid"
  const key = status.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
  return t.has(key) ? t(key) : status.replace(/_/g, " ");
}

// Orders saved before Spree 6.0 can carry the 5.6 values (balance_due,
// credit_owed, pending, void, ready, shipped) until they are next updated, so those are mapped too.
export function getPaymentStatusColor(status: string | null): string {
  switch (status) {
    case "paid":
      return "bg-green-100 text-green-800";
    case "none":
    case "authorized":
    case "partially_paid":
    case "overcharged":
    case "balance_due":
    case "credit_owed":
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "partially_refunded":
    case "refunded":
      return "bg-blue-100 text-blue-800";
    case "voided":
    case "failed":
    case "void":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

export function getFulfillmentStatusColor(status: string | null): string {
  switch (status) {
    case "fulfilled":
    case "delivered":
    case "shipped":
      return "bg-green-100 text-green-800";
    case "unfulfilled":
    case "backorder":
    case "pending":
    case "ready":
      return "bg-yellow-100 text-yellow-800";
    case "partial":
      return "bg-blue-100 text-blue-800";
    case "canceled":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

const regionNames = new Map<string, Intl.DisplayNames | null>();

function regionNamesFor(locale: string): Intl.DisplayNames | null {
  if (!regionNames.has(locale)) {
    try {
      regionNames.set(
        locale,
        new Intl.DisplayNames([locale], { type: "region" }),
      );
    } catch {
      regionNames.set(locale, null);
    }
  }
  return regionNames.get(locale) ?? null;
}

/** A country's name in the reader's language, from its ISO 3166-1 code. */
export function countryName(iso: string, locale: string): string {
  return regionNamesFor(locale)?.of(iso) ?? iso;
}

/** Countries sorted by their name in the reader's language. */
export function sortByCountryName<T extends { iso: string }>(
  countries: T[],
  locale: string,
): T[] {
  const collator = new Intl.Collator(locale);
  return countries
    .map((country) => ({ country, name: countryName(country.iso, locale) }))
    .sort((a, b) => collator.compare(a.name, b.name))
    .map(({ country }) => country);
}
