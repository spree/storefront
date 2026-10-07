"use client";

import type { Cart } from "@spree/sdk";
import { CircleAlert, Wallet, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  applyStoreCredit,
  getStoreCreditBalance,
  removeStoreCredit,
  type StoreCreditBalance,
} from "@/lib/data/store-credits";
import { unsignedAmount } from "@/lib/utils/format";

interface StoreCreditSectionProps {
  cart: Cart;
  /** Balance read on the server; null for guests and when it can't be read. */
  initialBalance: StoreCreditBalance | null;
  onCartUpdate: (cart: Cart) => void;
  processing?: boolean;
}

/**
 * Store credit as its own widget rather than a payment method: it reduces the
 * amount due instead of settling the order, and when it covers the order in
 * full the payment-method selector disappears entirely (PaymentSection reads
 * the same zero `amount_due`).
 */
export function StoreCreditSection({
  cart,
  initialBalance,
  onCartUpdate,
  processing = false,
}: StoreCreditSectionProps) {
  const t = useTranslations("storeCredit");
  const [balance, setBalance] = useState(initialBalance);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const appliedAmount = parseFloat(cart.store_credit_total ?? "0");
  const isApplied = Number.isFinite(appliedAmount) && appliedAmount > 0;
  const hasBalance = (balance?.amount ?? 0) > 0;

  // Nothing to offer and nothing applied — stay out of the way. Guests land
  // here too, since their balance is always null.
  if (!isApplied && !hasBalance) return null;

  const run = async (
    action: () => Promise<
      { success: true; cart: Cart } | { success: false; error: string }
    >,
    fallbackMessage: string,
  ) => {
    setPending(true);
    setError(null);

    try {
      const result = await action();
      if (!result.success) {
        setError(result.error || fallbackMessage);
        return;
      }
      onCartUpdate(result.cart);
      // Applying/releasing credit moves the customer's balance, so re-read it
      // rather than deriving it from the cart.
      setBalance(await getStoreCreditBalance());
    } catch {
      setError(fallbackMessage);
    } finally {
      setPending(false);
    }
  };

  // What's left to collect after the credit — not `covered_by_store_credit`,
  // which only says the customer holds enough credit, applied or not.
  const amountDue = parseFloat(cart.amount_due ?? cart.total ?? "");
  const coversOrder = Number.isFinite(amountDue) && amountDue === 0;

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900">{t("title")}</h2>

      <div className="mt-2 rounded-sm border bg-gray-50 px-4 py-3.5">
        {isApplied ? (
          <>
            <div className="flex items-center gap-3">
              <Wallet
                className="h-5 w-5 flex-shrink-0 text-green-700"
                strokeWidth={1.5}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {t("appliedAmount", {
                    amount: unsignedAmount(cart.display_store_credit_total),
                  })}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {coversOrder
                    ? t("coversOrder")
                    : t("partiallyCovers", {
                        amount: cart.display_amount_due ?? "",
                      })}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  run(() => removeStoreCredit(cart.id), t("failedToRemove"))
                }
                disabled={pending || processing}
                aria-label={t("remove")}
                className="flex-shrink-0 cursor-pointer p-0.5 text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {hasBalance && (
              <p className="mt-2 text-xs text-gray-500">
                {t("remainingBalance", {
                  amount: balance?.displayAmount ?? "",
                })}
              </p>
            )}
          </>
        ) : (
          <div className="flex items-center gap-3">
            <Wallet
              className="h-5 w-5 flex-shrink-0 text-gray-400"
              strokeWidth={1.5}
            />
            <p className="min-w-0 flex-1 text-sm text-gray-700">
              {t("availableBalance", { amount: balance?.displayAmount ?? "" })}
            </p>
            <Button
              type="button"
              size="sm"
              onClick={() =>
                run(() => applyStoreCredit(cart.id), t("failedToApply"))
              }
              disabled={pending || processing}
            >
              {pending ? t("applying") : t("apply")}
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-2 rounded-sm border border-red-300 bg-red-50 px-4 py-3">
          <p className="flex items-center gap-2 text-sm text-red-700">
            <CircleAlert className="h-4 w-4 flex-shrink-0" />
            {error}
          </p>
        </div>
      )}
    </div>
  );
}
