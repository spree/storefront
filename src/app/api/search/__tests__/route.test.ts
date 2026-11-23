import { beforeEach, describe, expect, it, vi } from "vitest";

const { quickSearch, getCatalogAccessToken } = vi.hoisted(() => ({
  quickSearch: vi.fn(),
  getCatalogAccessToken: vi.fn<() => Promise<string | undefined>>(),
}));

vi.mock("@/lib/data/search", () => ({ quickSearch }));
vi.mock("@/lib/spree", () => ({ getCatalogAccessToken }));

import { GET } from "@/app/api/search/route";
import {
  EMPTY_QUICK_SEARCH_RESULTS,
  QUICK_SEARCH_MAX_AGE,
} from "@/lib/utils/quick-search";

function search(): Promise<Response> {
  return GET(
    new Request("http://localhost/api/search?q=polo&country=us&locale=en"),
  );
}

describe("GET /api/search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    quickSearch.mockResolvedValue(EMPTY_QUICK_SEARCH_RESULTS);
  });

  it("never stores a signed-in customer's catalog-narrowed results", async () => {
    getCatalogAccessToken.mockResolvedValue("customer-jwt");

    const response = await search();

    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("Vary")).toBe("Cookie");
  });

  it("caches guest results privately, varying on the session cookie", async () => {
    getCatalogAccessToken.mockResolvedValue(undefined);

    const response = await search();

    expect(response.headers.get("Cache-Control")).toBe(
      `private, max-age=${QUICK_SEARCH_MAX_AGE}`,
    );
    expect(response.headers.get("Vary")).toBe("Cookie");
  });
});
