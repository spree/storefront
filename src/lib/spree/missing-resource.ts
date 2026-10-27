import { SpreeError } from "@spree/sdk";
import { getClient } from "./config";

/**
 * Upper bound on the existence check. A slow Store API must not hold up the
 * page, so past this point the page renders as usual.
 */
const LOOKUP_TIMEOUT_MS = 1500;

interface LookupOptions {
  country: string;
  locale: string;
}

type ResourceLookup = (options: LookupOptions) => Promise<unknown>;

function decodeSegment(segment: string): string | null {
  try {
    return decodeURIComponent(segment);
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
      getClient().products.get(rest[0], { fields: ["id"] }, options);
  }
  if (section === "c" && rest.length > 0) {
    return (options) =>
      getClient().categories.get(rest.join("/"), { fields: ["id"] }, options);
  }
  if (section === "policies" && rest.length === 1) {
    return (options) => getClient().policies.get(rest[0], options);
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

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, LOOKUP_TIMEOUT_MS);
  });

  try {
    await Promise.race([lookup(options), timeout]);
    return false;
  } catch (error) {
    return error instanceof SpreeError && error.status === 404;
  } finally {
    clearTimeout(timer);
  }
}
