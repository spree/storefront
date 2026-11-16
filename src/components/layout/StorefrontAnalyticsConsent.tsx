import { headers } from "next/headers";
import { Suspense } from "react";
import { AnalyticsConsent } from "@/components/layout/AnalyticsConsent";
import { EngagementIntegrations } from "@/components/layout/EngagementIntegrations";
import { isLocalizedHomepage, REQUEST_PATHNAME_HEADER } from "@/i18n/routing";
import { getStorefrontIntegrations } from "@/lib/data/storefront-integrations";
import {
  editorialStorefrontEnabled,
  themeTemplateHomeEnabled,
} from "@/lib/theme/flags";
import { getActiveTheme } from "@/lib/theme/resolver";

async function StorefrontAnalyticsConsentInner() {
  if (
    editorialStorefrontEnabled() &&
    !themeTemplateHomeEnabled() &&
    isLocalizedHomepage((await headers()).get(REQUEST_PATHNAME_HEADER))
  ) {
    // Let the shared public theme request reach Rails before optional tags.
    await getActiveTheme().catch(() => null);
  }
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
