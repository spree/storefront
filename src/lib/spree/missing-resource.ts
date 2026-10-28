import { type Client, createClient, SpreeError } from "@spree/sdk";
import { getConfig } from "./config";

/**
 * Upper bound on the existence check. A slow Store API must not hold up the
 * page, so past this point the request is cancelled and the page renders as
 * usual.
 */
const LOOKUP_TIMEOUT_MS = 1500;

let lookupClient: Client | null = null;

/**
 * A client of its own so every lookup is a single request that is cancelled
 * at the timeout, rather than one left running (and retried) against a Store
 * API that is already slow.
 */
function getLookupClient(): Client {
  if (!lookupClient) {
    const { baseUrl, publishableKey } = getConfig();
    lookupClient = createClient({
      baseUrl,
      publishableKey,
      retry: false,
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
        }),
    });
  }
  return lookupClient;
}

interface LookupOptions {
  country: string;
  locale: string;
}

type ResourceLookup = (options: LookupOptions) => Promise<unknown>;

/**
 * The SDK interpolates slugs into the Store API path unencoded, so a decoded
 * segment that could change that path (an encoded slash, a dot segment, a
 * query or fragment) skips the check rather than reach another endpoint.
 */
function decodeSegment(segment: string): string | null {
  try {
    const decoded = decodeURIComponent(segment);
    if (decoded === "." || decoded === ".." || /[/\\?#]/.test(decoded)) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Mirrors the Store API request each resource page makes for its record, so
 * the proxy and the page always agree on whether it exists. Only the id is
 * requested to keep the response small.
 */
function resourceLookup(path: string): ResourceLookup | null {
  const segments = path.split("/").filter(Boolean).map(decodeSegment);
  if (segments.some((segment) => !segment)) return null;

  const [section, ...rest] = segments as string[];

  if (section === "products" && rest.length === 1) {
    return (options) =>
      getLookupClient().products.get(rest[0], { fields: ["id"] }, options);
  }
  if (section === "c" && rest.length > 0) {
    return (options) =>
      getLookupClient().categories.get(
        rest.join("/"),
        { fields: ["id"] },
        options,
      );
  }
  if (section === "policies" && rest.length === 1) {
    return (options) => getLookupClient().policies.get(rest[0], options);
  }
  return null;
}

/**
 * Whether the product, category or policy addressed by a storefront path
 * (the part after `/{country}/{locale}`) is definitely missing.
 *
 * Pages render inside a streaming layout, so by the time they call
 * `notFound()` the response has already been sent with a 200 status. Checking
 * in the proxy, before rendering starts, lets a missing record answer with a
 * real 404. Only a Store API 404 counts as missing: timeouts, outages and any
 * other error leave the decision to the page.
 */
export async function isMissingStorefrontResource(
  path: string,
  options: LookupOptions,
): Promise<boolean> {
  const lookup = resourceLookup(path);
  if (!lookup) return false;

  try {
    await lookup(options);
    return false;
  } catch (error) {
    return error instanceof SpreeError && error.status === 404;
  }
}
