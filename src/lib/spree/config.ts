import { type Client, createClient } from "@spree/sdk";
import type { Surface } from "./surface";
import type { SpreeNextConfig } from "./types";

let _client: Client | null = null;
let _config: SpreeNextConfig | null = null;
let _wholesaleClient: Client | null = null;

/**
 * Initialize the Spree Next.js integration.
 * Call this once in your app (e.g., in `lib/storefront.ts`).
 * If not called, the client will auto-initialize from SPREE_API_URL and SPREE_PUBLISHABLE_KEY env vars.
 */
export function initSpreeNext(config: SpreeNextConfig): void {
  _config = config;
  _client = createClient({
    baseUrl: config.baseUrl,
    publishableKey: config.publishableKey,
  });
}

/**
 * Get the Client instance. Auto-initializes from env vars if needed.
 */
export function getClient(): Client {
  if (!_client) {
    const baseUrl = process.env.SPREE_API_URL;
    const publishableKey = process.env.SPREE_PUBLISHABLE_KEY;
    if (baseUrl && publishableKey) {
      initSpreeNext({ baseUrl, publishableKey });
    } else {
      throw new Error(
        "Spree client is not configured. Either call initSpreeNext() or set SPREE_API_URL and SPREE_PUBLISHABLE_KEY environment variables.",
      );
    }
  }
  return _client!;
}

/**
 * Get the current config. Auto-initializes from env vars if needed.
 */
export function getConfig(): SpreeNextConfig {
  if (!_config) {
    getClient(); // triggers auto-init
  }
  return _config!;
}

/**
 * The wholesale channel code the B2B portal binds to, or `null` when the
 * wholesale portal is not enabled.
 *
 * Wholesale is an **opt-in addon**: it turns on only when
 * `SPREE_WHOLESALE_CHANNEL` names the gated channel to use (e.g. `wholesale`).
 * There is deliberately no default — an unset value means the storefront runs
 * DTC-only, and every wholesale entry point (nav, footer, homepage section,
 * the `/wholesale` routes) stays hidden.
 *
 * @returns the wholesale channel code, or null if wholesale is disabled
 */
export function getWholesaleChannelCode(): string | null {
  return process.env.SPREE_WHOLESALE_CHANNEL?.trim() || null;
}

/**
 * Whether the storefront exposes marketplace seller pages (`/sellers` and
 * `/sellers/[slug]`), the "Sold by" link on product pages, and the footer
 * entry point. Opt-in via `SPREE_MARKETPLACE_ENABLED=true` — single-vendor
 * stores keep it unset and those routes 404.
 */
export function isMarketplaceEnabled(): boolean {
  return process.env.SPREE_MARKETPLACE_ENABLED?.trim().toLowerCase() === "true";
}

/** Whether the wholesale portal addon is enabled for this storefront. */
export function isWholesaleEnabled(): boolean {
  return getWholesaleChannelCode() !== null;
}

/**
 * Get the wholesale Client instance — a channel-bound client for the gated B2B
 * portal. Requests carry the wholesale channel code (so orders attribute to it
 * and inherit its no-guest-checkout rule) and, if provided, a wholesale-scoped
 * publishable key.
 *
 * Only call this when {@link isWholesaleEnabled} is true — it throws when the
 * addon is off so a misconfiguration surfaces loudly instead of silently
 * falling back to the DTC channel and serving the public catalog as "wholesale".
 * A wholesale-scoped publishable key is optional (the `X-Spree-Channel` header
 * selects the channel); when unset it falls back to the DTC publishable key.
 */
export function getWholesaleClient(): Client {
  if (_wholesaleClient) return _wholesaleClient;

  const channel = getWholesaleChannelCode();
  if (!channel) {
    throw new Error(
      "getWholesaleClient() called but SPREE_WHOLESALE_CHANNEL is not set — the wholesale portal is disabled. Guard callers with isWholesaleEnabled().",
    );
  }

  const config = getConfig();
  // Treat a blank env value as unset so it falls back to the DTC key rather
  // than building a client with an empty publishable key.
  const publishableKey =
    process.env.SPREE_WHOLESALE_PUBLISHABLE_KEY?.trim() ||
    config.publishableKey;

  _wholesaleClient = createClient({
    baseUrl: config.baseUrl,
    publishableKey,
    channel,
  });
  return _wholesaleClient;
}

/**
 * Resolve the SDK client for a storefront surface: the DTC client for the
 * public storefront, the channel-bound wholesale client for the B2B portal.
 */
export function getClientForSurface(surface: Surface): Client {
  return surface === "wholesale" ? getWholesaleClient() : getClient();
}

/**
 * Reset the client (useful for testing).
 */
export function resetClient(): void {
  _client = null;
  _config = null;
  _wholesaleClient = null;
}
