import { Suspense } from "react";
import { AnalyticsConsent } from "@/components/layout/AnalyticsConsent";
import { EngagementIntegrations } from "@/components/layout/EngagementIntegrations";
import { getStorefrontIntegrations } from "@/lib/data/storefront-integrations";

async function StorefrontAnalyticsConsentInner() {
  const integrations = await getStorefrontIntegrations();
  return (
    <>
      <AnalyticsConsent
        fallbackGtmId={process.env.GTM_ID}
        integrations={integrations}
      />
      <EngagementIntegrations integrations={integrations} />
    </>
  );
}

/** Loads per-store analytics IDs from the Store API inside Suspense. */
export function StorefrontAnalyticsConsent() {
  return (
    <Suspense fallback={null}>
      <StorefrontAnalyticsConsentInner />
    </Suspense>
  );
}
