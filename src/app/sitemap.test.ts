import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({
  connection: vi.fn(),
}));

const api = vi.hoisted(() => ({
  marketsList: vi.fn(),
  productsList: vi.fn(),
  categoriesList: vi.fn(),
  collectionsList: vi.fn(),
  sellersList: vi.fn(),
}));

const marketplace = vi.hoisted(() => ({ enabled: false }));

vi.mock("@/lib/spree", () => ({
  isMarketplaceEnabled: () => marketplace.enabled,
}));

vi.mock("@/lib/data/sitemap", () => ({
  getSitemapMarkets: async (options: { country: string; locale: string }) =>
    (await api.marketsList(options)).data,
  getSitemapResourceCount: async (
    resource: "products" | "categories" | "collections" | "sellers",
    _marketId: string,
    options: { country: string; locale: string },
  ) => {
    const query = { page: 1, limit: 1 };
    const response = await {
      products: () => api.productsList(query, options),
      categories: () =>
        api.categoriesList({ ...query, parent_id_not_null: true }, options),
      collections: () => api.collectionsList(query, options),
      sellers: () => api.sellersList(query, options),
    }[resource]();
    return response.meta.count;
  },
  getSitemapCollectionPage: async (
    _marketId: string,
    page: number,
    limit: number,
    options: { country: string; locale: string },
  ) => (await api.collectionsList({ page, limit }, options)).data,
  getSitemapSellerPage: async (
    _marketId: string,
    page: number,
    limit: number,
    options: { country: string; locale: string },
  ) => (await api.sellersList({ page, limit }, options)).data,
  getSitemapProductPage: async (
    _marketId: string,
    page: number,
    limit: number,
    options: { country: string; locale: string },
  ) =>
    (await api.productsList({ page, limit, expand: ["media"] }, options)).data,
  getSitemapCategoryPage: async (
    _marketId: string,
    page: number,
    limit: number,
    options: { country: string; locale: string },
  ) =>
    (
      await api.categoriesList(
        { page, limit, parent_id_not_null: true },
        options,
      )
    ).data,
}));

vi.mock("@/lib/store", () => ({
  getDefaultCountry: () => "us",
  getDefaultLocale: () => "en",
  getStoreUrl: () => "https://store.example",
}));

function marketCountries(...isos: string[]) {
  return [
    {
      id: "market-1",
      default: true,
      default_locale: "en",
      supported_locales: ["en"],
      countries: isos.map((iso) => ({ iso })),
    },
  ];
}

function mockCatalog(
  productCount: number,
  categoryCount: number,
  collectionCount = 0,
): void {
  api.productsList.mockImplementation(
    async ({ page, limit }: { page: number; limit: number }) => {
      if (limit === 1) {
        return { data: [], meta: { count: productCount } };
      }

      return {
        data: Array.from({ length: limit }, (_, index) => ({
          id: `product-${(page - 1) * limit + index}`,
          slug: `p-${(page - 1) * limit + index}`,
        })),
        meta: { count: productCount },
      };
    },
  );
  api.categoriesList.mockImplementation(
    async ({ page, limit }: { page: number; limit: number }) => {
      if (limit === 1) {
        return { data: [], meta: { count: categoryCount } };
      }

      return {
        data: Array.from({ length: limit }, (_, index) => ({
          id: `category-${(page - 1) * limit + index}`,
          permalink: `c-${(page - 1) * limit + index}`,
          is_root: false,
        })),
        meta: { count: categoryCount },
      };
    },
  );
  api.collectionsList.mockImplementation(
    async ({ page, limit }: { page: number; limit: number }) => ({
      data:
        limit === 1
          ? []
          : Array.from({ length: collectionCount }, (_, index) => ({
              id: `collection-${(page - 1) * limit + index}`,
              permalink: `col-${(page - 1) * limit + index}`,
            })),
      meta: { count: collectionCount },
    }),
  );
}

describe("localized sitemap generation", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    marketplace.enabled = false;
  });

  it("lists collections after categories, then sellers when the marketplace is enabled", async () => {
    marketplace.enabled = true;
    api.marketsList.mockResolvedValue({ data: marketCountries("US") });
    mockCatalog(1, 1, 1);
    api.sellersList.mockImplementation(
      async ({ page, limit }: { page: number; limit: number }) => ({
        data:
          limit === 1
            ? []
            : Array.from({ length: 2 }, (_, index) => ({
                id: `seller-${(page - 1) * limit + index}`,
                slug: `s-${(page - 1) * limit + index}`,
              })),
        meta: { count: 2 },
      }),
    );
    const { default: sitemap } = await import("@/app/sitemap");

    const entries = await sitemap({ id: Promise.resolve("0") });

    expect(entries.map((entry) => entry.url)).toEqual([
      "https://store.example/us/en",
      "https://store.example/us/en/products",
      "https://store.example/us/en/collections",
      "https://store.example/us/en/sellers",
      "https://store.example/us/en/products/p-0",
      "https://store.example/us/en/c/c-0",
      "https://store.example/us/en/collections/col-0",
      "https://store.example/us/en/sellers/s-0",
      "https://store.example/us/en/sellers/s-1",
    ]);
  });

  it("keeps products and categories when the seller count fails", async () => {
    marketplace.enabled = true;
    api.marketsList.mockResolvedValue({ data: marketCountries("US") });
    mockCatalog(1, 1);
    api.sellersList.mockRejectedValue(new Error("sellers endpoint down"));
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const { default: sitemap } = await import("@/app/sitemap");

    const entries = await sitemap({ id: Promise.resolve("0") });

    expect(entries.map((entry) => entry.url)).toEqual(
      expect.arrayContaining([
        "https://store.example/us/en/products/p-0",
        "https://store.example/us/en/c/c-0",
      ]),
    );
    expect(entries.some((entry) => entry.url.includes("/sellers/"))).toBe(
      false,
    );
    consoleError.mockRestore();
  });

  it("keeps products and categories when the collection count fails", async () => {
    api.marketsList.mockResolvedValue({ data: marketCountries("US") });
    mockCatalog(1, 1);
    api.collectionsList.mockRejectedValue(new Error("collections down"));
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const { default: sitemap } = await import("@/app/sitemap");

    const entries = await sitemap({ id: Promise.resolve("0") });

    expect(entries.map((entry) => entry.url)).toEqual(
      expect.arrayContaining([
        "https://store.example/us/en/products/p-0",
        "https://store.example/us/en/c/c-0",
      ]),
    );
    expect(entries.some((entry) => entry.url.includes("/collections/"))).toBe(
      false,
    );
    consoleError.mockRestore();
  });

  it("never queries sellers when the marketplace is disabled", async () => {
    api.marketsList.mockResolvedValue({ data: marketCountries("US") });
    mockCatalog(1, 1);
    const { default: sitemap } = await import("@/app/sitemap");

    const entries = await sitemap({ id: Promise.resolve("0") });

    expect(api.sellersList).not.toHaveBeenCalled();
    expect(entries.some((entry) => entry.url.includes("/sellers"))).toBe(false);
  });

  it("reuses translated catalog pages across countries with the same locale", async () => {
    api.marketsList.mockResolvedValue({ data: marketCountries("US", "CA") });
    mockCatalog(2, 1);
    const { default: sitemap } = await import("@/app/sitemap");

    const entries = await sitemap({ id: Promise.resolve("0") });

    expect(entries).toHaveLength(12);
    expect(entries.map((entry) => entry.url)).toEqual(
      expect.arrayContaining([
        "https://store.example/us/en/products/p-0",
        "https://store.example/ca/en/products/p-0",
        "https://store.example/us/en/c/c-0",
        "https://store.example/ca/en/c/c-0",
      ]),
    );
    expect(
      api.productsList.mock.calls.filter(([params]) => params.limit === 100),
    ).toHaveLength(1);
    expect(
      api.categoriesList.mock.calls.filter(([params]) => params.limit === 100),
    ).toHaveLength(1);
  });

  it("calculates sitemap files from locale counts without loading catalog pages", async () => {
    api.marketsList.mockResolvedValue({ data: marketCountries("US", "CA") });
    mockCatalog(30_000, 0);
    const { generateSitemaps } = await import("@/app/sitemap");

    await expect(generateSitemaps()).resolves.toEqual(
      Array.from({ length: 7 }, (_, id) => ({ id })),
    );
    expect(
      api.productsList.mock.calls.filter(([params]) => params.limit === 100),
    ).toHaveLength(0);
    expect(
      api.categoriesList.mock.calls.filter(([params]) => params.limit === 100),
    ).toHaveLength(0);
  });

  it("loads only API pages intersecting the requested sitemap chunk", async () => {
    api.marketsList.mockResolvedValue({ data: marketCountries("US", "CA") });
    mockCatalog(30_000, 0);
    const { default: sitemap } = await import("@/app/sitemap");

    const entries = await sitemap({ id: Promise.resolve("1") });
    const loadedPages = api.productsList.mock.calls
      .filter(([params]) => params.limit === 100)
      .map(([params]) => params.page);

    expect(entries).toHaveLength(10_000);
    expect(entries[0]?.url).toBe("https://store.example/us/en/products/p-9997");
    expect(entries.at(-1)?.url).toBe(
      "https://store.example/us/en/products/p-19996",
    );
    expect(Math.min(...loadedPages)).toBe(100);
    expect(Math.max(...loadedPages)).toBe(200);
    expect(loadedPages).toHaveLength(101);
  });

  it("keeps inventories isolated when Markets share the same locale", async () => {
    api.marketsList.mockResolvedValue({
      data: [
        ...marketCountries("US"),
        {
          ...marketCountries("AS")[0],
          id: "market-2",
          default: false,
        },
      ],
    });
    api.productsList.mockImplementation(
      async (
        { page, limit }: { page: number; limit: number },
        { country }: { country: string },
      ) => {
        const count = country === "us" ? 2 : 0;
        return {
          data:
            limit === 1
              ? []
              : Array.from({ length: count }, (_, index) => ({
                  id: `product-${page}-${index}`,
                  slug: `us-product-${index}`,
                })),
          meta: { count },
        };
      },
    );
    api.categoriesList.mockImplementation(async () => ({
      data: [],
      meta: { count: 0 },
    }));
    api.collectionsList.mockResolvedValue({ data: [], meta: { count: 0 } });
    const { default: sitemap } = await import("@/app/sitemap");

    const entries = await sitemap({ id: Promise.resolve("0") });
    const urls = entries.map((entry) => entry.url);

    expect(urls).toContain("https://store.example/us/en/products/us-product-0");
    expect(urls).not.toContain(
      "https://store.example/as/en/products/us-product-0",
    );
    expect(entries).toHaveLength(8);
    expect(
      api.productsList.mock.calls.filter(([params]) => params.limit === 1),
    ).toHaveLength(2);
  });

  it("does not retain process-level catalog pages across sitemap requests", async () => {
    api.marketsList.mockResolvedValue({ data: marketCountries("US") });
    mockCatalog(1, 0);
    const { default: sitemap } = await import("@/app/sitemap");

    await sitemap({ id: Promise.resolve("0") });
    await sitemap({ id: Promise.resolve("0") });

    expect(
      api.productsList.mock.calls.filter(([params]) => params.limit === 100),
    ).toHaveLength(2);
  });

  it("keeps categories when a product page request fails", async () => {
    api.marketsList.mockResolvedValue({ data: marketCountries("US") });
    api.productsList.mockImplementation(
      async ({ limit }: { limit: number }) => {
        if (limit === 1) return { data: [], meta: { count: 1 } };
        throw new Error("products unavailable");
      },
    );
    api.categoriesList.mockImplementation(
      async ({ limit }: { limit: number }) => ({
        data:
          limit === 1
            ? []
            : [{ id: "category-1", permalink: "coffee", is_root: false }],
        meta: { count: 1 },
      }),
    );
    api.collectionsList.mockResolvedValue({ data: [], meta: { count: 0 } });
    const { default: sitemap } = await import("@/app/sitemap");

    const entries = await sitemap({ id: Promise.resolve("0") });

    expect(entries.map((entry) => entry.url)).toContain(
      "https://store.example/us/en/c/coffee",
    );
    expect(entries.some((entry) => entry.url.includes("/products/p-"))).toBe(
      false,
    );
  });

  it("rejects invalid sitemap chunk identifiers before loading data", async () => {
    const { default: sitemap } = await import("@/app/sitemap");

    await expect(sitemap({ id: Promise.resolve("-1") })).resolves.toEqual([]);
    await expect(sitemap({ id: Promise.resolve("invalid") })).resolves.toEqual(
      [],
    );
    expect(api.marketsList).not.toHaveBeenCalled();
  });
});
