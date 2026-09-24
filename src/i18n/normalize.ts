/** Return a canonical BCP 47 locale, accepting Rails-style underscores. */
export function canonicalizeLocale(
  value: string | undefined,
): string | undefined {
  if (!value) return undefined;

  try {
    return Intl.getCanonicalLocales(value.trim().replaceAll("_", "-"))[0];
  } catch {
    return undefined;
  }
}

/** Convert a locale to the lowercase form used in storefront URL segments. */
export function toRouteLocale(value: string | undefined): string | undefined {
  return canonicalizeLocale(value)?.toLowerCase();
}

/** Match a locale case-insensitively while preserving the configured spelling. */
export function matchLocale(
  value: string | undefined,
  supportedLocales: readonly string[],
): string | undefined {
  const canonical = canonicalizeLocale(value)?.toLowerCase();
  if (!canonical) return undefined;

  return supportedLocales.find(
    (supported) => canonicalizeLocale(supported)?.toLowerCase() === canonical,
  );
}

/**
 * Match an exact locale first, then its base language (for example en-US → en).
 * This is used for browser language negotiation, not explicit route validation.
 */
export function negotiateLocale(
  value: string | undefined,
  supportedLocales: readonly string[],
): string | undefined {
  const exact = matchLocale(value, supportedLocales);
  if (exact) return exact;

  const canonical = canonicalizeLocale(value);
  if (!canonical) return undefined;

  try {
    return matchLocale(new Intl.Locale(canonical).language, supportedLocales);
  } catch {
    return undefined;
  }
}

/**
 * Resolve an Accept-Language header according to its q weights. Entries with
 * q=0 are explicitly unacceptable and are ignored; equal weights retain the
 * browser's original order.
 */
export function negotiateAcceptLanguage(
  header: string | null | undefined,
  supportedLocales: readonly string[],
): string | undefined {
  if (!header) return undefined;

  const preferences = header
    .split(",")
    .map((part, index) => {
      const [candidate, ...parameters] = part.trim().split(";");
      const qualityParameter = parameters.find((parameter) =>
        parameter.trim().toLowerCase().startsWith("q="),
      );
      const quality = qualityParameter
        ? Number(qualityParameter.trim().slice(2))
        : 1;
      const validQuality =
        Number.isFinite(quality) && quality >= 0 && quality <= 1 ? quality : 0;

      return {
        candidate: candidate.trim(),
        index,
        quality: validQuality,
      };
    })
    .filter(
      ({ candidate, quality }) =>
        candidate !== "*" && candidate.length > 0 && quality > 0,
    )
    .sort((left, right) =>
      right.quality === left.quality
        ? left.index - right.index
        : right.quality - left.quality,
    );

  for (const { candidate } of preferences) {
    const locale = negotiateLocale(candidate, supportedLocales);
    if (locale) return locale;
  }

  return undefined;
}
