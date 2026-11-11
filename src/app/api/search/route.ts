import { NextResponse } from "next/server";
import { resolveSupportedLocale } from "@/i18n/locales";
import { quickSearch } from "@/lib/data/search";
import {
  EMPTY_QUICK_SEARCH_RESULTS,
  QUICK_SEARCH_MAX_AGE,
  type QuickSearchResults,
} from "@/lib/utils/quick-search";

const COUNTRY_PATTERN = /^[a-z]{2}$/;
/** Longer input is not a search term; refuse it before it reaches the API. */
const MAX_QUERY_LENGTH = 100;

/**
 * Header search-as-you-type. A GET Route Handler rather than a Server Action,
 * so keystrokes run in parallel instead of queueing and repeated queries are
 * cached by the browser.
 * Country and locale come from the query string (the proxy does not run on
 * `/api`), so each market's results get their own cache entries.
 *
 * Cached privately: signed-in customers may be priced differently.
 */
export async function GET(
  request: Request,
): Promise<NextResponse<QuickSearchResults | { error: string }>> {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";
  const country = searchParams.get("country")?.toLowerCase() ?? "";
  const locale = resolveSupportedLocale(searchParams.get("locale") ?? "");

  if (!COUNTRY_PATTERN.test(country) || !locale) {
    return NextResponse.json(
      { error: "country and locale are required" },
      { status: 400 },
    );
  }

  if (query.length > MAX_QUERY_LENGTH) {
    return NextResponse.json(EMPTY_QUICK_SEARCH_RESULTS);
  }

  const results = await quickSearch(query, { country, locale });

  return NextResponse.json(results, {
    headers: {
      "Cache-Control": `private, max-age=${QUICK_SEARCH_MAX_AGE}`,
    },
  });
}
