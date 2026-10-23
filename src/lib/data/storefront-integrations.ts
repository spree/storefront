import { getClient } from "@/lib/spree";

export type StorefrontIntegrationsConfig = {
  google_analytics?: { measurement_id: string };
  google_tag_manager?: { container_id: string };
};

export async function getStorefrontIntegrations(): Promise<StorefrontIntegrationsConfig> {
  try {
    const client = getClient();
    const response = await client.storefrontIntegrations.show();
    return response.data ?? {};
  } catch {
    return {};
  }
}
