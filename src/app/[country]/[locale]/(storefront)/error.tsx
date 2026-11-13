"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { EmptyStateIllustration } from "@/components/empty-states/EmptyStateIllustration";
import { MarketplacePage } from "@/components/marketplace";

export default function StorefrontError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <MarketplacePage className="flex min-h-[50vh] flex-col items-center justify-center py-20 text-center">
      <EmptyStateIllustration
        name="could-not-connect"
        className="text-marketplace-brand"
      />
      <h1 className="mt-6 font-display text-3xl font-semibold text-marketplace-foreground">
        Could not load this page
      </h1>
      <p className="mt-2 max-w-md text-marketplace-muted-foreground">
        Please try again. If the problem continues, come back in a few minutes.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 inline-flex min-h-11 items-center rounded-md bg-marketplace-brand px-5 text-sm font-semibold text-marketplace-brand-foreground hover:opacity-90"
      >
        Try again
      </button>
    </MarketplacePage>
  );
}
