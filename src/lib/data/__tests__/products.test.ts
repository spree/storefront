import { beforeEach, describe, expect, it, vi } from "vitest";

const { list, get, filters, getCatalogAccessToken } = vi.hoisted(() => ({
  list: vi.fn(),
  get: vi.fn(),
  filters: vi.fn(),
  getCatalogAccessToken: vi.fn<() => Promise<string | undefined>>(),
}));

vi.mock("@/lib/spree", () => ({
  DEFAULT_SURFACE: "dtc",
  cacheTagSuffix: (surface: string) =>
    surface === "wholesale" ? "-wholesale" : "",
  getClientForSurface: () => ({ products: { list, get, filters } }),
  getLocaleOptions: vi.fn().mockResolvedValue({ country: "us", locale: "en" }),
  getCatalogAccessToken,
}));

vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}));

import {
  getProduct,
  getProductFilters,
  getProducts,
} from "@/lib/data/products";

const options = { country: "us", locale: "en" };

describe("products data", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    list.mockResolvedValue({ data: [], meta: { count: 0 } });
    get.mockResolvedValue({ id: "prod_1" });
    filters.mockResolvedValue({ filters: [] });
  });

  describe.each(["dtc", "wholesale"] as const)(
    "on the %s surface",
    (surface) => {
      it("sends a signed-in customer's token so their catalog applies", async () => {
        getCatalogAccessToken.mockResolvedValue("customer-jwt");

        await getProducts({ page: 1 }, surface);
        await getProduct("polo", { expand: ["variants"] }, surface);
        await getProductFilters({ q: "polo" }, surface);

        const withToken = { ...options, token: "customer-jwt" };
        expect(list).toHaveBeenCalledWith({ page: 1 }, withToken);
        expect(get).toHaveBeenCalledWith(
          "polo",
          { expand: ["variants"] },
          withToken,
        );
        expect(filters).toHaveBeenCalledWith({ q: "polo" }, withToken);
      });

      it("sends no token for a guest", async () => {
        getCatalogAccessToken.mockResolvedValue(undefined);

        await getProducts(undefined, surface);
        await getProduct("polo", undefined, surface);
        await getProductFilters(undefined, surface);

        expect(list).toHaveBeenCalledWith(undefined, options);
        expect(get).toHaveBeenCalledWith("polo", { expand: [] }, options);
        expect(filters).toHaveBeenCalledWith(undefined, options);
      });
    },
  );
});
