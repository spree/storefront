import type { StorefrontIntegrationsConfig } from "@/lib/data/storefront-integrations";

export function resolveAnalyticsTags(
  integrations?: StorefrontIntegrationsConfig,
  fallbackGtmId?: string,
) {
  const gtmId =
    integrations?.google_tag_manager?.container_id?.trim() ||
    fallbackGtmId?.trim() ||
    "";
  const gaId = integrations?.google_analytics?.measurement_id?.trim() || "";
  // Prefer GTM when configured — GA4 tags inside GTM own page_view.
  return {
    gtmId: gtmId || null,
    gaId: gtmId ? null : gaId || null,
  };
}
