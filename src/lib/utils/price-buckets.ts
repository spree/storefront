import { compareMoney, isDecimalString } from "@spree/sdk";

export interface PriceBucket {
  id: string;
  label: string;
  min?: number;
  max?: number;
}

const THRESHOLDS = [50, 100, 200];

function formatCurrency(
  amount: number,
  currency: string,
  locale?: string,
): string {
  try {
    return new Intl.NumberFormat(locale || "en", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

/**
 * Optional translation helpers for bucket labels.
 * Pass `t` from `useTranslations("products")` and a locale string
 * to get labels like "Poniżej $50" instead of "Under $50".
 */
interface BucketLabelOptions {
  t?: (key: string, values?: Record<string, string>) => string;
  locale?: string;
}

/**
 * Buckets for the price filter. The range comes from the API as decimal
 * strings; the thresholds are whole amounts in the currency.
 */
export function generatePriceBuckets(
  filterMin: string,
  filterMax: string,
  currency: string,
  options?: BucketLabelOptions,
): PriceBucket[] {
  const { t, locale } = options || {};
  const buckets: PriceBucket[] = [];
  if (!isDecimalString(filterMin) || !isDecimalString(filterMax))
    return buckets;

  const below = (amount: string, threshold: number) =>
    compareMoney(amount, String(threshold)) < 0;
  const above = (amount: string, threshold: number) =>
    compareMoney(amount, String(threshold)) > 0;

  if (below(filterMin, THRESHOLDS[0])) {
    const price = formatCurrency(THRESHOLDS[0], currency, locale);
    buckets.push({
      id: `under-${THRESHOLDS[0]}`,
      label: t ? t("priceUnder", { price }) : `Under ${price}`,
      max: THRESHOLDS[0],
    });
  }

  for (let i = 0; i < THRESHOLDS.length - 1; i++) {
    if (
      above(filterMax, THRESHOLDS[i]) &&
      below(filterMin, THRESHOLDS[i + 1])
    ) {
      const min = formatCurrency(THRESHOLDS[i], currency, locale);
      const max = formatCurrency(THRESHOLDS[i + 1], currency, locale);
      buckets.push({
        id: `${THRESHOLDS[i]}-${THRESHOLDS[i + 1]}`,
        label: t ? t("priceRangeBucket", { min, max }) : `${min} - ${max}`,
        min: THRESHOLDS[i],
        max: THRESHOLDS[i + 1],
      });
    }
  }

  const lastThreshold = THRESHOLDS[THRESHOLDS.length - 1];
  if (above(filterMax, lastThreshold)) {
    const price = formatCurrency(lastThreshold, currency, locale);
    buckets.push({
      id: `${lastThreshold}-plus`,
      label: t ? t("priceAbove", { price }) : `${price}+`,
      min: lastThreshold,
    });
  }

  return buckets;
}

export function findMatchingBucket(
  buckets: PriceBucket[],
  priceMin?: number,
  priceMax?: number,
): PriceBucket | undefined {
  return buckets.find(
    (b) =>
      (b.min === undefined ? priceMin === undefined : b.min === priceMin) &&
      (b.max === undefined ? priceMax === undefined : b.max === priceMax),
  );
}
