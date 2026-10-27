import { SpreeError } from "@spree/sdk";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getProduct, getCategory, getPolicy, createClient } = vi.hoisted(() => ({
  getProduct: vi.fn(),
  getCategory: vi.fn(),
  getPolicy: vi.fn(),
  createClient: vi.fn(),
}));

vi.mock("@spree/sdk", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@spree/sdk")>()),
  createClient,
}));

vi.mock("@/lib/spree/config", () => ({
  getConfig: () => ({
    baseUrl: "https://api.example",
    publishableKey: "pk_test",
  }),
}));

createClient.mockReturnValue({
  products: { get: getProduct },
  categories: { get: getCategory },
  policies: { get: getPolicy },
});

import { isMissingStorefrontResource } from "@/lib/spree/missing-resource";

const options = { country: "de", locale: "de" };

function apiError(status: number): SpreeError {
  return new SpreeError(
    { error: { code: "error", message: "Store API error" } },
    status,
  );
}

describe("isMissingStorefrontResource", () => {
  beforeEach(() => {
    getProduct.mockReset();
    getCategory.mockReset();
    getPolicy.mockReset();
    getProduct.mockResolvedValue({ id: "prod_1" });
    getCategory.mockResolvedValue({ id: "ctg_1" });
    getPolicy.mockResolvedValue({ id: "pol_1" });
  });

  it("asks for the record in the URL's country and language", async () => {
    await expect(
      isMissingStorefrontResource("/products/t-shirt", options),
    ).resolves.toBe(false);
    expect(getProduct).toHaveBeenCalledWith(
      "t-shirt",
      { fields: ["id"] },
      options,
    );
  });

  it("reports a product, category or policy the Store API answers 404 for", async () => {
    getProduct.mockRejectedValue(apiError(404));
    getCategory.mockRejectedValue(apiError(404));
    getPolicy.mockRejectedValue(apiError(404));

    await expect(
      isMissingStorefrontResource("/products/gone", options),
    ).resolves.toBe(true);
    await expect(
      isMissingStorefrontResource("/c/men/shirts", options),
    ).resolves.toBe(true);
    await expect(
      isMissingStorefrontResource("/policies/gone", options),
    ).resolves.toBe(true);
    expect(getCategory).toHaveBeenCalledWith(
      "men/shirts",
      { fields: ["id"] },
      options,
    );
  });

  it("decodes path segments the way the page receives them", async () => {
    await isMissingStorefrontResource("/products/caf%C3%A9", options);

    expect(getProduct).toHaveBeenCalledWith(
      "café",
      { fields: ["id"] },
      options,
    );
  });

  it("leaves the decision to the page when the Store API fails", async () => {
    getProduct.mockRejectedValue(apiError(500));
    await expect(
      isMissingStorefrontResource("/products/t-shirt", options),
    ).resolves.toBe(false);

    getProduct.mockRejectedValue(new TypeError("fetch failed"));
    await expect(
      isMissingStorefrontResource("/products/t-shirt", options),
    ).resolves.toBe(false);
  });

  it("cancels a slow lookup with a single, unretried request", async () => {
    await isMissingStorefrontResource("/products/t-shirt", options);

    const config = createClient.mock.calls[0]?.[0];
    expect(config).toMatchObject({
      baseUrl: "https://api.example",
      publishableKey: "pk_test",
      retry: false,
    });

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}"));
    await config.fetch("https://api.example/products/t-shirt", {});
    expect(fetchSpy.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
    fetchSpy.mockRestore();
  });

  it("skips paths that are not product, category or policy pages", async () => {
    for (const path of [
      "/products",
      "/products/t-shirt/extra",
      "/c",
      "/cart",
      "/wholesale/products/t-shirt",
      "/products/%E0%A4%A",
      "/products/..%2F..%2Fcustomers%2Fme",
      "/products/..",
      "/c/men/%2E%2E",
      "/policies/terms%3Fexpand%3Dall",
      "/policies/terms%23x",
      "/products/a%5C..%5Cb",
    ]) {
      await expect(isMissingStorefrontResource(path, options)).resolves.toBe(
        false,
      );
    }
    expect(getProduct).not.toHaveBeenCalled();
    expect(getCategory).not.toHaveBeenCalled();
    expect(getPolicy).not.toHaveBeenCalled();
  });
});
