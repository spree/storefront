import { SpreeError } from "@spree/sdk";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getProduct, getCategory, getPolicy } = vi.hoisted(() => ({
  getProduct: vi.fn(),
  getCategory: vi.fn(),
  getPolicy: vi.fn(),
}));

vi.mock("@/lib/spree/config", () => ({
  getClient: () => ({
    products: { get: getProduct },
    categories: { get: getCategory },
    policies: { get: getPolicy },
  }),
}));

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
    vi.clearAllMocks();
    getProduct.mockResolvedValue({ id: "prod_1" });
    getCategory.mockResolvedValue({ id: "ctg_1" });
    getPolicy.mockResolvedValue({ id: "pol_1" });
  });

  afterEach(() => {
    vi.useRealTimers();
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

  it("gives up on a slow Store API instead of holding the page", async () => {
    vi.useFakeTimers();
    getProduct.mockReturnValue(new Promise(() => {}));

    const result = isMissingStorefrontResource("/products/t-shirt", options);
    await vi.advanceTimersByTimeAsync(1500);

    await expect(result).resolves.toBe(false);
  });

  it("skips paths that are not product, category or policy pages", async () => {
    for (const path of [
      "/products",
      "/products/t-shirt/extra",
      "/c",
      "/cart",
      "/wholesale/products/t-shirt",
      "/products/%E0%A4%A",
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
