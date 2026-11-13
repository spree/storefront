import { describe, expect, it } from "vitest";
import {
  buildListingSearchParams,
  parseListingSearchParams,
} from "../listing-search-params";
import { buildProductQueryParams } from "../product-query";

describe("listing search params", () => {
  it("ignores legacy seller filters while preserving other listing filters", () => {
    const parsed = parseListingSearchParams({
      q: "mug",
      sort: "top_rated",
      rating_min: "4",
      seller: "sel_abc",
      personalizable: "1",
    });

    expect(parsed.query).toBe("mug");
    expect(parsed.filters.sortBy).toBe("top_rated");
    expect(parsed.filters.ratingMin).toBe(4);
    expect(parsed.filters).not.toHaveProperty("sellerId");
    expect(parsed.filters.personalizable).toBe(true);

    const built = buildListingSearchParams(new URLSearchParams(), {
      query: parsed.query,
      filters: parsed.filters,
    });
    expect(built.get("rating_min")).toBe("4");
    expect(built.has("seller")).toBe(false);
    expect(built.get("personalizable")).toBe("1");
  });

  it("removes a stale seller query when rewriting a listing URL", () => {
    const rewritten = buildListingSearchParams(
      new URLSearchParams("seller=sel_abc&color=blue"),
      { filters: { optionValues: [] } },
    );
    expect(rewritten.has("seller")).toBe(false);
    expect(rewritten.get("color")).toBe("blue");
  });

  it("defaults search sort to relevance in API params", () => {
    const params = buildProductQueryParams(
      { optionValues: [] },
      "personalized mug",
    );
    expect(params.sort).toBe("relevance");
    expect(params.search).toBe("personalized mug");
  });

  it("does not force relevance without a text query", () => {
    const params = buildProductQueryParams({ optionValues: [] });
    expect(params.sort).toBeUndefined();
  });
});
