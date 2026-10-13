"use client";

import type { Cart } from "@spree/sdk";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFormatMoney } from "@/hooks/useFormatMoney";

interface CouponCodeProps {
  cart: Cart;
  onApply: (code: string) => Promise<{ success: boolean; error?: string }>;
  onRemoveDiscount: (
    code: string,
  ) => Promise<{ success: boolean; error?: string }>;
  onRemoveGiftCard: (
    giftCardId: string,
  ) => Promise<{ success: boolean; error?: string }>;
}

export function CouponCode({
  cart,
  onApply,
  onRemoveDiscount,
  onRemoveGiftCard,
}: CouponCodeProps) {
  const t = useTranslations("coupon");
  const formatMoney = useFormatMoney();
  const [code, setCode] = useState("");
  const [applying, setApplying] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const appliedDiscounts = cart.discounts || [];
  const couponPromotions = appliedDiscounts.filter(
    (p): p is typeof p & { code: string } => !!p.code,
  );
  const appliedGiftCard = cart.gift_card;

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setApplying(true);
    setError(null);

    try {
      const result = await onApply(code.trim());
      if (result.success) {
        setCode("");
      } else {
        setError(result.error || t("invalidCode"));
      }
    } catch {
      setError(t("invalidCode"));
    } finally {
      setApplying(false);
    }
  };

  const handleRemoveDiscount = async (discountCode: string) => {
    setRemoving(discountCode);
    setError(null);

    try {
      const result = await onRemoveDiscount(discountCode);
      if (!result.success) {
        setError(result.error || t("failedToRemove"));
      }
    } catch {
      setError(t("failedToRemove"));
    } finally {
      setRemoving(null);
    }
  };

  const handleRemoveGiftCard = async () => {
    if (!appliedGiftCard) return;

    setRemoving(appliedGiftCard.id);
    setError(null);

    try {
      const result = await onRemoveGiftCard(appliedGiftCard.id);
      if (!result.success) {
        setError(result.error || t("failedToRemoveGiftCard"));
      }
    } catch {
      setError(t("failedToRemoveGiftCard"));
    } finally {
      setRemoving(null);
    }
  };

  // Hide the input only when both a coupon and a gift card are applied
  const hasAllCodesApplied = couponPromotions.length > 0 && !!appliedGiftCard;

  return (
    <div>
      {/* Applied discount codes */}
      {couponPromotions.length > 0 && (
        <div className="space-y-2 mb-3">
          {couponPromotions.map((promotion) => (
            <div
              key={promotion.id}
              className="flex items-center justify-between rounded-sm border border-gray-200 bg-gray-50 px-3 py-2"
            >
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-gray-900">
                  {promotion.code || promotion.name}
                </span>
                <span className="text-gray-500">
                  {formatMoney(promotion.amount, cart.currency)}
                </span>
              </div>
              {promotion.code && (
                <button
                  onClick={() => handleRemoveDiscount(promotion.code)}
                  disabled={removing === promotion.code}
                  aria-label={t("removeCoupon", {
                    code: promotion.code || promotion.name,
                  })}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer p-0.5"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Applied gift card */}
      {appliedGiftCard && (
        <div className="space-y-2 mb-3">
          <div className="flex items-center justify-between rounded-sm border border-gray-200 bg-gray-50 px-3 py-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium text-gray-900">
                {t("giftCardCode", { code: appliedGiftCard.code })}
              </span>
              <span className="text-gray-500">
                -{formatMoney(cart.gift_card_total, cart.currency)}
              </span>
            </div>
            <button
              onClick={handleRemoveGiftCard}
              disabled={removing === appliedGiftCard.id}
              aria-label={t("removeGiftCard")}
              className="text-gray-400 hover:text-gray-600 cursor-pointer p-0.5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Apply new code — single input for discount codes and gift cards */}
      {!hasAllCodesApplied && (
        <form onSubmit={handleApply} className="flex gap-2">
          <Input
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setError(null);
            }}
            placeholder={t("placeholder")}
            aria-label={t("placeholder")}
            aria-invalid={!!error}
            className="flex-1"
          />
          <Button type="submit" disabled={applying || !code.trim()}>
            {applying ? t("applying") : t("apply")}
          </Button>
        </form>
      )}

      {error && <p className="text-xs text-red-600 mt-1.5">{error}</p>}
    </div>
  );
}
