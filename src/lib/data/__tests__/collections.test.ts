import { SpreeError } from "@spree/sdk";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  listCollections,
  getCollectionFromApi,
  listCollectionProducts,
  getProductFilters,
} = vi.hoisted(() => ({
  listCollections: vi.fn(),
  getCollectionFromApi: vi.fn(),
  listCollectionProducts: vi.fn(),
  getProductFilters: vi.fn(),
}));

vi.mock("@/lib/spree", () => ({
  getClient: () => ({
    collections: {
      list: listCollections,
      get: getCollectionFromApi,
      products: { list: listCollectionProducts },
    },
  }),
  getLocaleOptions: vi.fn().mockResolvedValue({ country: "us", locale: "en" }),
  getAccessToken: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/data/products", () => ({ getProductFilters }));

vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}));

import {
  cachedGetCollection,
  cachedListCollections,
  getCollectionFilters,
  getCollectionProducts,
} from "@/lib/data/collections";

const options = { country: "us", locale: "en" };

function apiError(status: number): SpreeError {
  return new SpreeError(
    { error: { code: "error", message: "Store API error" } },
    status,
  );
}

describe("collections data", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists collections with card fields unless the caller narrows them", async () => {
    listCollections.mockResolvedValue({ data: [], meta: { count: 0 } });

    await cachedListCollections({ page: 2, sort: "position" }, options);
    expect(listCollections).toHaveBeenLastCalledWith(
      expect.objectContaining({
        page: 2,
        sort: "position",
        fields: expect.arrayContaining(["name", "permalink", "image_url"]),
      }),
      options,
    );

    await cachedListCollections({ search: "sale", fields: ["id"] }, options);
    expect(listCollections).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: "sale", fields: ["id"] }),
      options,
    );
  });

  it("returns null only for a real Store API 404", async () => {
    getCollectionFromApi.mockRejectedValueOnce(apiError(404));
    await expect(cachedGetCollection("gone", options)).resolves.toBeNull();

    getCollectionFromApi.mockRejectedValueOnce(apiError(500));
    await expect(cachedGetCollection("broken", options)).rejects.toThrow();
  });

  it("lists products through the collection so its sort order applies", async () => {
    listCollectionProducts.mockResolvedValue({ data: [], meta: { count: 0 } });

    await getCollectionProducts("coll_1", { page: 2, limit: 12 });

    expect(listCollectionProducts).toHaveBeenCalledWith(
      "coll_1",
      { page: 2, limit: 12 },
      options,
    );
  });

  it("scopes facets to the collection", async () => {
    getProductFilters.mockResolvedValue({});

    await getCollectionFilters("coll_1", { "q[in_stock]": true });

    expect(getProductFilters).toHaveBeenCalledWith({
      "q[in_stock]": true,
      collection_id: "coll_1",
    });
  });
});
