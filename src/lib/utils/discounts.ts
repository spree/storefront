/**
 * Everything taken off an order or cart, as a negative decimal string, or
 * null when nothing is.
 *
 * Spree 6 counts only promotions in `discount_total`. A discount written any
 * other way, like spree-bank_payments' bank transfer discount (a `manual`
 * one), is only in `adjustment_total`, which Spree sums as every discount
 * plus fees plus added tax. So the discounts are what's left of it once fees
 * and added tax come off. Without this, a summary reads "subtotal + shipping"
 * to a total that is lower than both.
 *
 * Exact decimal arithmetic: the amounts never pass through a JavaScript
 * number, like `formatMoney`.
 */
export function totalDiscount(totals: {
  adjustment_total?: string | null;
  discount_total?: string | null;
  fee_total?: string | null;
  additional_tax_total?: string | null;
}): string | null {
  const adjustments = toUnits(totals.adjustment_total);
  const discounts =
    adjustments === null
      ? toUnits(totals.discount_total)
      : adjustments -
        (toUnits(totals.fee_total) ?? ZERO) -
        (toUnits(totals.additional_tax_total) ?? ZERO);

  if (discounts === null || discounts >= ZERO) return null;
  return fromUnits(discounts);
}

const SCALE = 4;
const ZERO = BigInt(0);

function toUnits(value: string | null | undefined): bigint | null {
  if (typeof value !== "string") return null;
  const match = /^(-)?(\d+)(?:\.(\d+))?$/.exec(value.trim());
  if (!match) return null;
  const fraction = (match[3] ?? "").padEnd(SCALE, "0").slice(0, SCALE);
  const units = BigInt(match[2] + fraction);
  return match[1] ? -units : units;
}

function fromUnits(units: bigint): string {
  const negative = units < ZERO;
  const digits = (negative ? -units : units)
    .toString()
    .padStart(SCALE + 1, "0");
  const whole = digits.slice(0, -SCALE);
  const fraction = digits.slice(-SCALE).replace(/0+$/, "").padEnd(2, "0");
  return `${negative ? "-" : ""}${whole}.${fraction}`;
}
