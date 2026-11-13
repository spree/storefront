/**
 * URL search params contract for product listing pages.
 *
 * All filter/sort/query state lives in the URL so that server components
 * can fetch deterministically and the back button works for free. This
 * module centralizes the parse/serialize logic so the server pages and
 * the client filter shim stay in sync.
 *
 * Pagination is intentionally NOT in the URL: listings use infinite
 * scroll, and the accumulating "how many pages have I scrolled through"
 * state is ephemeral — it lives in the client island and resets whenever
 * filters/sort/query change.
 */

import type { ActiveFilters, AvailabilityStatus } from "@/types/filters";
import { isAvailabilityStatus } from "@/types/filters";

export const LISTING_PARAM_KEYS = {
  query: "q",
  sort: "sort",
  priceMin: "price_min",
  priceMax: "price_max",
  availability: "availability",
  /** Repeated param: `?option=1&option=2`. */
  option: "option",
  /** Marketplace personalization filter. */
  personalizable: "personalizable",
  ratingMin: "rating_min",
  // Retained as an owned legacy key so rewrites discard stale seller filters.
  seller: "seller",
} as const;

/** Keys the listing owns — used when rewriting a URL to drop stale params. */
const LISTING_OWNED_KEYS = new Set<string>(Object.values(LISTING_PARAM_KEYS));

export interface ListingSearchParams {
  query?: string;
  filters: ActiveFilters;
}

type RawSearchParams =
  | URLSearchParams
  | Record<string, string | string[] | undefined>;

function readFirst(params: RawSearchParams, key: string): string | undefined {
  if (params instanceof URLSearchParams) {
    return params.get(key) ?? undefined;
  }
  const raw = params[key];
  if (Array.isArray(raw)) return raw[0];
  return raw;
}

function readAll(params: RawSearchParams, key: string): string[] {
  if (params instanceof URLSearchParams) {
    return params.getAll(key);
  }
  const raw = params[key];
  if (raw == null) return [];
  return Array.isArray(raw) ? raw : [raw];
}

function parsePositiveInt(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return parsed;
}

/** Parse a listing state from URL search params (server or client side). */
export function parseListingSearchParams(
  params: RawSearchParams,
): ListingSearchParams {
  const query =
    readFirst(params, LISTING_PARAM_KEYS.query)?.trim() || undefined;

  const availabilityRaw = readFirst(params, LISTING_PARAM_KEYS.availability);
  const availability: AvailabilityStatus | undefined =
    availabilityRaw && isAvailabilityStatus(availabilityRaw)
      ? availabilityRaw
      : undefined;

  const priceMin = parsePositiveInt(
    readFirst(params, LISTING_PARAM_KEYS.priceMin),
  );
  const priceMax = parsePositiveInt(
    readFirst(params, LISTING_PARAM_KEYS.priceMax),
  );

  const optionValues = readAll(params, LISTING_PARAM_KEYS.option).filter(
    Boolean,
  );

  const personalizableRaw = readFirst(
    params,
    LISTING_PARAM_KEYS.personalizable,
  );
  const personalizable =
    personalizableRaw === "1" || personalizableRaw === "true"
      ? true
      : undefined;

  const sortBy =
    readFirst(params, LISTING_PARAM_KEYS.sort)?.trim() || undefined;

  const ratingMin = parsePositiveInt(
    readFirst(params, LISTING_PARAM_KEYS.ratingMin),
  );

  const filters: ActiveFilters = {
    optionValues,
    ...(priceMin !== undefined ? { priceMin } : {}),
    ...(priceMax !== undefined ? { priceMax } : {}),
    ...(availability ? { availability } : {}),
    ...(personalizable ? { personalizable } : {}),
    ...(ratingMin !== undefined ? { ratingMin } : {}),
    ...(sortBy ? { sortBy } : {}),
  };

  return { query, filters };
}

/**
 * Build a new URLSearchParams representing the given listing state,
 * preserving any non-listing params already present in `base`.
 */
export function buildListingSearchParams(
  base: URLSearchParams,
  next: Partial<ListingSearchParams> & { query?: string },
): URLSearchParams {
  const out = new URLSearchParams();

  // Preserve any params that don't belong to the listing contract.
  for (const [key, value] of base.entries()) {
    if (!LISTING_OWNED_KEYS.has(key)) out.append(key, value);
  }

  if (next.query) {
    out.set(LISTING_PARAM_KEYS.query, next.query);
  }

  const filters = next.filters;
  if (filters) {
    if (filters.priceMin !== undefined) {
      out.set(LISTING_PARAM_KEYS.priceMin, String(filters.priceMin));
    }
    if (filters.priceMax !== undefined) {
      out.set(LISTING_PARAM_KEYS.priceMax, String(filters.priceMax));
    }
    if (filters.availability) {
      out.set(LISTING_PARAM_KEYS.availability, filters.availability);
    }
    if (filters.sortBy) {
      out.set(LISTING_PARAM_KEYS.sort, filters.sortBy);
    }
    for (const optionValue of filters.optionValues) {
      out.append(LISTING_PARAM_KEYS.option, optionValue);
    }
    if (filters.personalizable) {
      out.set(LISTING_PARAM_KEYS.personalizable, "1");
    }
    if (filters.ratingMin !== undefined) {
      out.set(LISTING_PARAM_KEYS.ratingMin, String(filters.ratingMin));
    }
  }

  return out;
}

/**
 * Serialize the full listing state into a stable key string. Used as
 * the React key on InfiniteProductList (so every filter / sort / query
 * change remounts the island with fresh server-provided page 1 data)
 * and as the stateKey on ListingAnalytics (so each distinct listing
 * state fires a view_item_list event exactly once).
 *
 * Uses JSON.stringify rather than a delimiter-joined string so values
 * containing special characters (e.g. a search query with a pipe)
 * can't produce colliding keys for different states.
 */
export function listingKey(state: ListingSearchParams): string {
  return JSON.stringify({
    q: state.query ?? "",
    s: state.filters.sortBy ?? "",
    pMin: state.filters.priceMin ?? "",
    pMax: state.filters.priceMax ?? "",
    a: state.filters.availability ?? "",
    pers: state.filters.personalizable ? 1 : 0,
    rating: state.filters.ratingMin ?? "",
    o: [...state.filters.optionValues].sort(),
  });
}
