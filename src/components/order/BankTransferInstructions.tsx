import { formatMoney } from "@spree/sdk";
import { Landmark } from "lucide-react";
import { useTranslations } from "next-intl";
import { CopyReferenceButton } from "@/components/order/CopyReferenceButton";
import {
  type BankTransferQuote,
  formatBankTransferDeadline,
} from "@/lib/bank-transfer";

interface BankTransferInstructionsProps {
  quote: BankTransferQuote;
  locale: string;
}

/**
 * How to pay an order by bank transfer: the amount, the deadline, the
 * reference and every set of bank details. Shown on the thank-you page and
 * the account's order page.
 *
 * The reference is the most prominent thing here. A transfer without it
 * can't be matched to the order automatically, which means work for a person.
 * Schemes (`faster_payments`, `swift`) are internal codes and aren't shown.
 */
export function BankTransferInstructions({
  quote,
  locale,
}: BankTransferInstructionsProps) {
  const t = useTranslations("bankTransfer");
  const deadline = formatBankTransferDeadline(quote.expiresAt, locale);

  return (
    <section className="rounded-xl border-2 border-amber-300 bg-amber-50 px-6 py-5">
      <div className="flex items-center gap-2">
        <Landmark className="h-5 w-5 text-amber-700" aria-hidden />
        <h2 className="text-lg font-semibold text-gray-900">{t("title")}</h2>
      </div>

      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-gray-600">{t("amount")}</dt>
        <dd className="font-semibold text-gray-900">
          {formatMoney(quote.amount, quote.currency, locale)}
        </dd>
      </dl>
      {deadline && (
        <p className="mt-1 text-sm text-gray-700">
          {t("payBy", { date: deadline })}
        </p>
      )}

      <div className="mt-4 rounded-lg border border-amber-200 bg-white px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          {t("reference")}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <p className="font-mono text-2xl font-bold tracking-wider text-gray-900 select-all">
            {quote.reference}
          </p>
          <CopyReferenceButton reference={quote.reference} />
        </div>
        <p className="mt-2 text-sm text-gray-600">{t("referenceHint")}</p>
      </div>

      {quote.bankDetails.map((set, index) => (
        <div
          // Detail sets have no id; their order is the account's own and fixed.
          key={index}
          className="mt-4 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm"
        >
          {set.label && (
            <h3 className="mb-2 font-semibold text-gray-900">{set.label}</h3>
          )}
          {set.beneficiaryName && (
            <p className="mb-2 text-gray-700">
              {t("accountName", { name: set.beneficiaryName })}
            </p>
          )}
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            {set.fields.map((field) => (
              <div key={`${field.label}:${field.value}`} className="contents">
                <dt className="text-gray-600">{field.label}</dt>
                <dd className="font-mono text-gray-900 select-all">
                  {field.value}
                </dd>
              </div>
            ))}
          </dl>
          {set.beneficiaryAddress && (
            <p className="mt-2 whitespace-pre-line text-gray-600">
              {set.beneficiaryAddress}
            </p>
          )}
        </div>
      ))}
    </section>
  );
}
