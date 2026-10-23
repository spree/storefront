import { formatMoney } from "@spree/sdk";
import { useLocale } from "next-intl";
import { useCallback } from "react";

/**
 * Formats decimal-string amounts from the API in their currency and the
 * reader's language. A missing amount or currency formats as an empty string; pass
 * `{ unitPrice: true }` for a unit price, which may carry up to four decimals.
 */
export function useFormatMoney() {
  const locale = useLocale();
  return useCallback(
    (
      amount: string | null | undefined,
      currency: string | null | undefined,
      options?: { unitPrice?: boolean },
    ) => (currency ? formatMoney(amount, currency, locale, options) : ""),
    [locale],
  );
}
