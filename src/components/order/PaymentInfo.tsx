import {
  type CreditCard,
  compareMoney,
  type Payment,
  type StoreCredit,
} from "@spree/sdk";
import { useTranslations } from "next-intl";
import { PaymentIcon } from "react-svg-credit-card-payment-icons";
import { useFormatMoney } from "@/hooks/useFormatMoney";
import { getCardIconType, getCardLabel } from "@/lib/utils/credit-card";

interface PaymentInfoProps {
  payment: Payment;
  /** The order's currency; payments carry none of their own. */
  currency: string;
  /**
   * What gift cards paid on the order. A gift card is redeemed as store
   * credit, so a store credit payment of exactly this amount is the gift card.
   */
  giftCardTotal?: string | null;
}

export function PaymentInfo({
  payment,
  currency,
  giftCardTotal,
}: PaymentInfoProps) {
  const t = useTranslations("orders");
  const tc = useTranslations("common");
  const formatMoney = useFormatMoney();
  const source = payment.source;

  if (payment.source_type === "credit_card" && source) {
    const card = source as CreditCard;
    return (
      <div className="flex items-center gap-3">
        <PaymentIcon
          type={getCardIconType(card.brand)}
          format="flatRounded"
          width={40}
        />
        <div>
          <p className="text-sm font-medium text-gray-900">
            {t("cardEndingIn", {
              label: getCardLabel(card.brand),
              digits: card.last4,
            })}
          </p>
          <p className="text-xs text-gray-500">
            {t("cardExpires", {
              month: String(card.month).padStart(2, "0"),
              year: card.year,
            })}
          </p>
        </div>
      </div>
    );
  }

  if (payment.source_type === "store_credit" && source) {
    const credit = source as StoreCredit;
    const paidByGiftCard =
      !!giftCardTotal &&
      !!payment.amount &&
      compareMoney(payment.amount, giftCardTotal) === 0;
    const label = paidByGiftCard ? tc("giftCard") : t("storeCredit");
    return (
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500">
          {t("storeCreditApplied", {
            amount: formatMoney(payment.amount, currency),
            remaining: formatMoney(credit.amount_remaining, credit.currency),
          })}
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm font-medium text-gray-900">
        {payment.payment_method?.name}
      </p>
      <p className="text-xs text-gray-500">
        {formatMoney(payment.amount, currency)}
      </p>
    </div>
  );
}
