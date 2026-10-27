import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { isMissingStorefrontResource } = vi.hoisted(() => ({
  isMissingStorefrontResource: vi.fn(),
}));

vi.mock("@/lib/spree/missing-resource", () => ({
  isMissingStorefrontResource,
}));

vi.mock("@/lib/store", () => ({
  getDefaultCountry: () => "us",
  getDefaultLocale: () => "en",
}));

import { proxy } from "@/proxy";

const REWRITE_HEADER = "x-middleware-rewrite";

describe("proxy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isMissingStorefrontResource.mockResolvedValue(false);
  });

  it("answers a missing product with the 404 page", async () => {
    isMissingStorefrontResource.mockResolvedValue(true);

    const response = await proxy(
      new NextRequest("https://store.example/de/de/products/gone"),
    );

    expect(isMissingStorefrontResource).toHaveBeenCalledWith("/products/gone", {
      country: "de",
      locale: "de",
    });
    expect(response.headers.get(REWRITE_HEADER)).toBe(
      "https://store.example/_storefront-not-found",
    );
  });

  it("lets an existing product render", async () => {
    const response = await proxy(
      new NextRequest("https://store.example/us/en/products/t-shirt"),
    );

    expect(response.headers.get(REWRITE_HEADER)).toBeNull();
    expect(response.status).toBe(200);
  });

  it("skips the check for in-app navigations and prefetches", async () => {
    await proxy(
      new NextRequest("https://store.example/us/en/products/gone", {
        headers: { rsc: "1" },
      }),
    );
    await proxy(
      new NextRequest("https://store.example/us/en/products/gone", {
        headers: { "next-router-prefetch": "1" },
      }),
    );

    expect(isMissingStorefrontResource).not.toHaveBeenCalled();
  });

  it("keeps locale redirects ahead of the check", async () => {
    const response = await proxy(
      new NextRequest("https://store.example/US/EN/products/gone"),
    );

    expect(response.headers.get("location")).toBe(
      "https://store.example/us/en/products/gone",
    );
    expect(isMissingStorefrontResource).not.toHaveBeenCalled();
  });
});
