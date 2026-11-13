"use server";

import { getProduct } from "./products";
import { estimateProductShipping } from "./shipping-estimates";
import { actionResult } from "./utils";

export type CartShippingEstimateLine = {
  slug: string;
  variantId: string;
  quantity: number;
};

export async function estimateCartShipping(input: {
  lines: CartShippingEstimateLine[];
  countryCode: string;
  postalCode?: string;
  stateCode?: string;
}) {
  return actionResult(async () => {
    let totalAmount = 0;
    let currency: string | null = null;
    let pricedLineCount = 0;

    for (const line of input.lines) {
      if (!line.slug || !line.variantId) continue;

      const product = await getProduct(line.slug).catch(() => null);
      if (!product?.id) continue;

      const quote = await estimateProductShipping({
        productId: product.id,
        countryCode: input.countryCode,
        postalCode: input.postalCode,
        stateCode: input.stateCode,
        variantId: line.variantId,
        quantity: line.quantity,
      });

      if (!quote.success || !quote.estimate) continue;

      const amount = Number.parseFloat(String(quote.estimate.amount ?? ""));
      if (!Number.isFinite(amount)) continue;

      pricedLineCount += 1;
      totalAmount += amount;
      currency = quote.estimate.currency ?? currency;
    }

    if (pricedLineCount === 0) {
      return { estimate: null as null };
    }

    const resolvedCurrency = currency ?? "USD";
    const free = totalAmount === 0;
    const displayAmount = free
      ? "$0.00"
      : new Intl.NumberFormat(undefined, {
          style: "currency",
          currency: resolvedCurrency,
        }).format(totalAmount);

    return {
      estimate: {
        amount: totalAmount.toFixed(2),
        currency: resolvedCurrency,
        display_amount: displayAmount,
        free,
      },
    };
  }, "Failed to estimate cart shipping");
}
