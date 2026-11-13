import Link from "next/link";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { AccountEmptyState } from "@/components/account/AccountEmptyState";
import { AccountPageHeader } from "@/components/account/AccountPageHeader";
import { Button } from "@/components/ui/button";
import { getQuotes } from "@/lib/data/quotes";

interface QuotesPageProps {
  params: Promise<{ country: string; locale: string }>;
}

export default async function QuotesPage({ params }: QuotesPageProps) {
  await connection();
  const { country, locale } = await params;
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "quotes",
  });
  const basePath = `/${country}/${locale}`;
  const response = await getQuotes({ limit: 50, sort: "-created_at" });
  const quotes = response.data;

  return (
    <div>
      <AccountPageHeader title={t("title")} />
      {quotes.length === 0 ? (
        <AccountEmptyState
          illustration="order-history-empty"
          title={t("emptyTitle")}
          description={t("emptyDescription")}
        />
      ) : (
        <ul
          className="divide-y divide-marketplace-border-subtle"
          data-testid="account-quotes-list"
        >
          {quotes.map((quote) => (
            <li key={quote.id} className="py-4">
              <Link
                href={`${basePath}/account/quotes/${quote.id}`}
                className="flex flex-wrap items-center justify-between gap-2"
                data-testid={`account-quote-link-${quote.id}`}
              >
                <div>
                  <p className="font-medium">{quote.number}</p>
                  <p className="text-sm text-marketplace-muted-foreground">
                    {quote.status} · rev {quote.revision_number}
                  </p>
                </div>
                <span className="text-sm tabular-nums">
                  {quote.order_total != null ? quote.order_total : "—"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
