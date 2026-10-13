import { compareMoney, type Price } from "@spree/sdk";

/**
 * The amount to show struck through beside a reduced price: the price before
 * a price list took effect, or else the compare-at price. Null when the price
 * is not reduced, or when prices are hidden.
 */
export function strikethroughAmount(
  price: Price | null | undefined,
  originalPrice: Price | null | undefined,
): string | null {
  const amount = price?.amount;
  if (!amount) return null;

  if (originalPrice?.amount && compareMoney(amount, originalPrice.amount) < 0) {
    return originalPrice.amount;
  }
  if (
    price.compare_at_amount &&
    compareMoney(amount, price.compare_at_amount) < 0
  ) {
    return price.compare_at_amount;
  }
  return null;
}
