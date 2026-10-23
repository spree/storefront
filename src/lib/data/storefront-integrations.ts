import { getClient } from "@/lib/spree";

export type StorefrontIntegrationsConfig = {
  google_analytics?: { measurement_id: string };
  google_tag_manager?: { container_id: string };
  turnstile?: {
    site_key: string;
    protect_registration?: boolean;
    protect_login?: boolean;
    protect_password_reset?: boolean;
  };
  social_auth?: Record<
    string,
    { buyer_login_enabled?: boolean; seller_login_enabled?: boolean }
  >;
  crisp?: { website_id: string };
  microsoft_clarity?: { project_id: string };
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
