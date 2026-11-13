import { type Client, createClient } from "@spree/sdk";
import type { Surface } from "./surface";
import type { SpreeNextConfig } from "./types";

let _client: Client | null = null;
let _config: SpreeNextConfig | null = null;
let _wholesaleClient: Client | null = null;

const DEFAULT_FETCH_TIMEOUT_MS = 60_000;

function fetchWithTimeout(timeoutMs: number): typeof fetch {
  return async (input, init) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const cache =
        typeof window === "undefined"
          ? ("no-store" as RequestCache)
          : init?.cache;
      return await fetch(input, {
        ...init,
        cache,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  };
}

function buildClient(options: {
  baseUrl: string;
  publishableKey: string;
  channel?: string;
}): Client {
  const timeoutMs =
    Number(process.env.SPREE_FETCH_TIMEOUT_MS) || DEFAULT_FETCH_TIMEOUT_MS;
  return createClient({
    ...options,
    fetch: fetchWithTimeout(timeoutMs),
  });
}

/**
 * Initialize the Spree Next.js integration.
 * Call this once in your app (e.g., in `lib/storefront.ts`).
 * If not called, the client will auto-initialize from SPREE_API_URL and SPREE_PUBLISHABLE_KEY env vars.
 */
export function initSpreeNext(config: SpreeNextConfig): void {
  _config = config;
  _client = buildClient({
    baseUrl: config.baseUrl,
    publishableKey: config.publishableKey,
  });
}

let dotenvLocal: Record<string, string> | undefined;

/**
 * Cache and prefetch workers do not inherit `.env.local`. Read it from disk.
 * This module is also bundled for the browser, so Node built-ins are resolved
 * at runtime: a static `node:fs` import breaks the webpack client build.
 */
function nodeBuiltins(): {
  fs: typeof import("node:fs");
  path: typeof import("node:path");
} | null {
  const getBuiltinModule = (
    globalThis.process as
      | (NodeJS.Process & { getBuiltinModule?: (id: string) => unknown })
      | undefined
  )?.getBuiltinModule;
  if (typeof getBuiltinModule !== "function") return null;
  return {
    fs: getBuiltinModule("node:fs") as typeof import("node:fs"),
    path: getBuiltinModule("node:path") as typeof import("node:path"),
  };
}

function readEnvFile(
  readFileSync: typeof import("node:fs").readFileSync,
  path: string,
): string {
  const buffer = readFileSync(path);
  const utf16 =
    (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) ||
    (buffer.length >= 4 && buffer[1] === 0 && buffer[3] === 0);
  return buffer.toString(utf16 ? "utf16le" : "utf8").replace(/^\uFEFF/, "");
}

function readDotEnvLocal(): Record<string, string> {
  if (dotenvLocal) return dotenvLocal;
  const parsed: Record<string, string> = {};
  if (typeof window !== "undefined") {
    dotenvLocal = parsed;
    return parsed;
  }

  try {
    const builtins = nodeBuiltins();
    if (!builtins) {
      dotenvLocal = parsed;
      return parsed;
    }
    const { existsSync, readFileSync } = builtins.fs;
    const { dirname, join } = builtins.path;
    let directory = process.cwd();
    for (let depth = 0; depth < 6; depth += 1) {
      const candidate = join(directory, ".env.local");
      if (existsSync(candidate)) {
        for (const line of readEnvFile(readFileSync, candidate).split(
          /\r?\n/,
        )) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("#")) continue;
          const separator = trimmed.indexOf("=");
          if (separator === -1) continue;
          const key = trimmed.slice(0, separator).trim();
          let value = trimmed.slice(separator + 1).trim();
          if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
          ) {
            value = value.slice(1, -1);
          }
          parsed[key] = value;
        }
        if (parsed.SPREE_API_URL || parsed.SPREE_PUBLISHABLE_KEY) break;
      }
      const parent = dirname(directory);
      if (parent === directory) break;
      directory = parent;
    }
  } catch {
    // Keep the process.env values when the file cannot be read.
  }

  dotenvLocal = parsed;
  return parsed;
}

function envValue(
  fromProcess: string | undefined,
  fromFile: string | undefined,
): string {
  return fromProcess?.trim() || fromFile?.trim() || "";
}

function resolveSpreeCredentials(): {
  baseUrl: string;
  publishableKey: string;
} {
  const fileEnv = readDotEnvLocal();
  const publishableKey = envValue(
    process.env.NEXT_PUBLIC_SPREE_PUBLISHABLE_KEY ||
      process.env.SPREE_PUBLISHABLE_KEY,
    fileEnv.NEXT_PUBLIC_SPREE_PUBLISHABLE_KEY || fileEnv.SPREE_PUBLISHABLE_KEY,
  );
  const serverBaseUrl = envValue(
    process.env.NEXT_PUBLIC_SPREE_API_URL || process.env.SPREE_API_URL,
    fileEnv.NEXT_PUBLIC_SPREE_API_URL || fileEnv.SPREE_API_URL,
  );
  // Browser calls go through the Next.js `/api/v3` rewrite to the configured API.
  const baseUrl = typeof window !== "undefined" ? "" : serverBaseUrl;
  return { baseUrl, publishableKey };
}

/**
 * Get the Client instance. Auto-initializes from env vars if needed.
 */
export function getClient(): Client {
  if (!_client) {
    const { baseUrl, publishableKey } = resolveSpreeCredentials();
    if (publishableKey && (baseUrl || typeof window !== "undefined")) {
      initSpreeNext({ baseUrl, publishableKey });
    } else {
      throw new Error(
        "Spree client is not configured. Set SPREE_PUBLISHABLE_KEY / NEXT_PUBLIC_SPREE_PUBLISHABLE_KEY and SPREE_API_URL (server) or use the storefront API proxy (browser).",
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

  _wholesaleClient = buildClient({
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
