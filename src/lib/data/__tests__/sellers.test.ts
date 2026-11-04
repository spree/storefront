import { SpreeError } from "@spree/sdk";
import { beforeEach, describe, expect, it, vi } from "vitest";

const listSellers = vi.fn();
const getSellerFromApi = vi.fn();
const listProducts = vi.fn();

vi.mock("@/lib/spree", () => ({
  getClient: () => ({
    sellers: { list: listSellers, get: getSellerFromApi },
    products: { list: listProducts },
  }),
  getLocaleOptions: vi.fn().mockResolvedValue({ country: "us", locale: "en" }),
  getAccessToken: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}));

import {
  cachedGetSeller,
  cachedListSellers,
  getSellerProducts,
} from "@/lib/data/sellers";

const options = { country: "us", locale: "en" };

describe("cachedListSellers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends the search term as a filter with narrowed card fields", async () => {
    listSellers.mockResolvedValue({ data: [], meta: { count: 0, pages: 0 } });

    await cachedListSellers(
      { page: 2, limit: 24, search: "audio", sort: "name" },
      options,
    );

    expect(listSellers).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 2,
        limit: 24,
        search: "audio",
        sort: "name",
        fields: expect.arrayContaining(["name", "slug", "logo_url"]),
      }),
      options,
    );
  });

  it("omits the search filter when there is no term", async () => {
    listSellers.mockResolvedValue({ data: [], meta: { count: 0, pages: 0 } });

    await cachedListSellers({ page: 1 }, options);

    expect(listSellers.mock.calls[0][0]).not.toHaveProperty("search");
  });
});

describe("cachedGetSeller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes the expand list through", async () => {
    getSellerFromApi.mockResolvedValue({ id: "sel_1", slug: "sparks-audio" });

    await cachedGetSeller("sparks-audio", ["policies"], options);

    expect(getSellerFromApi).toHaveBeenCalledWith(
      "sparks-audio",
      { expand: ["policies"] },
      options,
    );
  });

  it("returns null only for a real Store API 404", async () => {
    getSellerFromApi.mockRejectedValue(
      new SpreeError(
        { error: { code: "not_found", message: "Seller not found" } },
        404,
      ),
    );

    await expect(cachedGetSeller("missing", [], options)).resolves.toBeNull();
  });

  it("does not turn a Store API 500 into a cacheable not-found result", async () => {
    const error = new SpreeError(
      { error: { code: "internal_error", message: "Store API unavailable" } },
      500,
    );
    getSellerFromApi.mockRejectedValue(error);

    await expect(cachedGetSeller("sparks-audio", [], options)).rejects.toBe(
      error,
    );
  });
});

describe("getSellerProducts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("scopes the product list to the seller, overriding caller params", async () => {
    listProducts.mockResolvedValue({ data: [], meta: { count: 0, pages: 0 } });

    await getSellerProducts("sel_1", {
      limit: 12,
      seller_id_eq: "sel_other",
    });

    expect(listProducts).toHaveBeenCalledWith(
      { limit: 12, seller_id_eq: "sel_1" },
      options,
    );
  });
});
