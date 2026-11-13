"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

export function QuoteActions({
  quoteId,
  status,
  orderId,
  basePath,
  acceptQuote,
  rejectQuote,
}: {
  quoteId: string;
  status: string;
  orderId: string;
  basePath: string;
  acceptQuote: (id: string, idempotencyKey?: string) => Promise<unknown>;
  rejectQuote: (id: string) => Promise<unknown>;
}) {
  const t = useTranslations("quotes");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const canRespond =
    status === "sent" || status === "approved" || status === "revised";

  if (!canRespond) {
    return null;
  }

  return (
    <div className="mt-6 flex flex-wrap gap-2">
      {error ? (
        <p className="w-full text-sm text-destructive">{error}</p>
      ) : null}
      <Button
        type="button"
        disabled={pending}
        data-testid="account-quote-accept"
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              await acceptQuote(quoteId, `accept-${quoteId}`);
              router.refresh();
            } catch (err) {
              setError(err instanceof Error ? err.message : t("actionFailed"));
            }
          });
        }}
      >
        {t("accept")}
      </Button>
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        data-testid="account-quote-reject"
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              await rejectQuote(quoteId);
              router.refresh();
            } catch (err) {
              setError(err instanceof Error ? err.message : t("actionFailed"));
            }
          });
        }}
      >
        {t("reject")}
      </Button>
    </div>
  );
}
