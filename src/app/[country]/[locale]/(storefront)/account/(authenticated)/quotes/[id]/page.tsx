import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { AccountPageHeader } from "@/components/account/AccountPageHeader";
import { QuoteActions } from "@/components/account/QuoteActions";
import { Button } from "@/components/ui/button";
import { acceptQuote, getQuote, rejectQuote } from "@/lib/data/quotes";

interface QuoteDetailPageProps {
  params: Promise<{ country: string; locale: string; id: string }>;
}

export default async function QuoteDetailPage({
  params,
}: QuoteDetailPageProps) {
  await connection();
  const { country, locale, id } = await params;
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "quotes",
  });
  const basePath = `/${country}/${locale}`;

  let quote;
  try {
    quote = await getQuote(id);
  } catch {
    notFound();
  }

  const checkoutTarget =
    "checkout_cart_id" in quote && quote.checkout_cart_id
      ? quote.checkout_cart_id
      : quote.order_id;

  return (
    <div data-testid="account-quote-detail">
      <AccountPageHeader title={quote.number} />
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-marketplace-muted-foreground">{t("status")}</dt>
          <dd data-testid="account-quote-status">{quote.status}</dd>
        </div>
        <div>
          <dt className="text-marketplace-muted-foreground">{t("revision")}</dt>
          <dd data-testid="account-quote-revision">{quote.revision_number}</dd>
        </div>
        <div>
          <dt className="text-marketplace-muted-foreground">{t("expires")}</dt>
          <dd>{quote.expires_at ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-marketplace-muted-foreground">{t("total")}</dt>
          <dd>{quote.order_total ?? "—"}</dd>
        </div>
      </dl>

      <QuoteActions
        quoteId={quote.id}
        status={quote.status}
        orderId={quote.order_id}
        basePath={basePath}
        acceptQuote={acceptQuote}
        rejectQuote={rejectQuote}
      />

      {quote.status === "accepted" && checkoutTarget ? (
        <div className="mt-6">
          <Button asChild>
            <Link
              href={`${basePath}/checkout/${checkoutTarget}`}
              data-testid="account-quote-checkout"
            >
              {t("continueCheckout")}
            </Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
