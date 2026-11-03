import type { Order, ReturnReason } from "@spree/sdk";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { OrderAccess } from "@/lib/data/returns";
import { canRequestReturn } from "@/lib/utils/returns";
import { ReturnRequestForm } from "./ReturnRequestForm";

interface ReturnRequestPageProps {
  order: Order | null;
  reasons: ReturnReason[];
  locale: string;
  orderHref: string;
  access?: OrderAccess;
  /** Where a guest whose link no longer works can ask for a new one. */
  findHref?: string;
}

/** The request form with its heading, or why there is nothing to request. */
export async function ReturnRequestPage({
  order,
  reasons,
  locale,
  orderHref,
  access,
  findHref,
}: ReturnRequestPageProps) {
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "returns.form",
  });

  if (!order) {
    return (
      <div className="text-center py-12 space-y-4">
        <h1 className="text-xl font-medium text-gray-900">{t("notFound")}</h1>
        {findHref && (
          <Link href={findHref} className="text-primary font-medium">
            {t("findOrder")}
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <Link
        href={orderHref}
        className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-flex items-center gap-1"
      >
        <ChevronLeft className="w-4 h-4" />
        {t("backToOrder")}
      </Link>
      <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
      <p className="text-sm text-gray-500 mt-1 mb-6">
        {t("subtitle", { number: order.number })}
      </p>
      {canRequestReturn(order) ? (
        <ReturnRequestForm
          order={order}
          reasons={reasons}
          orderHref={orderHref}
          locale={locale}
          access={access}
        />
      ) : (
        <p className="text-sm text-gray-600">
          {order.returns_eligibility?.errors?.[0]?.message ??
            t("nothingToReturn")}
        </p>
      )}
    </div>
  );
}
