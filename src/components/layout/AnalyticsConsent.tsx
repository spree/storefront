"use client";

import { GoogleAnalytics, GoogleTagManager } from "@next/third-parties/google";
import { useEffect, useState } from "react";
import { resolveAnalyticsTags } from "@/lib/analytics/config";
import {
  type AnalyticsConsentChoice,
  analyticsConsentChoice,
  setAnalyticsConsent,
} from "@/lib/analytics/consent";
import type { StorefrontIntegrationsConfig } from "@/lib/data/storefront-integrations";

export function AnalyticsConsent({
  integrations,
  fallbackGtmId,
}: {
  integrations?: StorefrontIntegrationsConfig;
  fallbackGtmId?: string;
}) {
  const [choice, setChoice] = useState<AnalyticsConsentChoice | null>(null);
  const { gtmId, gaId } = resolveAnalyticsTags(integrations, fallbackGtmId);

  useEffect(() => {
    setChoice(analyticsConsentChoice());
  }, []);

  const choose = (value: AnalyticsConsentChoice) => {
    setAnalyticsConsent(value);
    setChoice(value);
  };

  return (
    <>
      {choice === "granted" ? (
        gtmId ? (
          <GoogleTagManager gtmId={gtmId} />
        ) : gaId ? (
          <GoogleAnalytics gaId={gaId} />
        ) : null
      ) : null}
      {choice === null && (gtmId || gaId) ? (
        <aside
          aria-label="Privacy choices"
          className="fixed inset-x-4 bottom-4 z-[100] mx-auto flex max-w-xl flex-col gap-3 rounded-md border border-border bg-background p-4 shadow-lg sm:flex-row sm:items-center sm:justify-between"
          data-testid="analytics-consent"
        >
          <p className="text-sm text-foreground">
            Allow optional analytics to help improve this shop.
          </p>
          <div className="flex shrink-0 gap-2">
            <button
              className="rounded-sm border border-border px-3 py-2 text-sm"
              onClick={() => choose("denied")}
              type="button"
            >
              Decline
            </button>
            <button
              className="rounded-sm bg-foreground px-3 py-2 text-sm text-background"
              onClick={() => choose("granted")}
              type="button"
            >
              Allow analytics
            </button>
          </div>
        </aside>
      ) : null}
    </>
  );
}
