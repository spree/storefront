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

  it("marks the missing URL so the 404 page's own requests reach it", async () => {
    isMissingStorefrontResource.mockResolvedValue(true);

    const response = await proxy(
      new NextRequest("https://store.example/us/en/products/gone"),
    );

    const cookie = response.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("spree_missing_page=1");
    expect(cookie).toContain("Path=/us/en/products/gone");
    // The middleware's country and language cookies survive the rewrite.
    expect(response.cookies.get("spree_country")?.value).toBe("us");
    expect(response.cookies.get("spree_locale")?.value).toBe("en");
  });

  it("skips the check for in-app navigations, prefetches and actions", async () => {
    await proxy(
      new NextRequest("https://store.example/us/en/products/gone", {
        headers: { "sec-fetch-dest": "empty" },
      }),
    );
    await proxy(
      new NextRequest("https://store.example/us/en/products/gone", {
        method: "POST",
      }),
    );

    expect(isMissingStorefrontResource).not.toHaveBeenCalled();
  });

  it("answers the 404 page's actions and refreshes with the 404 page", async () => {
    const response = await proxy(
      new NextRequest("https://store.example/us/en/products/gone", {
        method: "POST",
        headers: { cookie: "spree_missing_page=1", "next-action": "abc" },
      }),
    );

    expect(isMissingStorefrontResource).not.toHaveBeenCalled();
    expect(response.headers.get(REWRITE_HEADER)).toBe(
      "https://store.example/_storefront-not-found",
    );
  });

  it("clears the marker once the record exists again", async () => {
    const response = await proxy(
      new NextRequest("https://store.example/us/en/products/t-shirt", {
        headers: { cookie: "spree_missing_page=1" },
      }),
    );

    expect(response.headers.get(REWRITE_HEADER)).toBeNull();
    expect(response.headers.get("set-cookie")).toContain(
      "spree_missing_page=;",
    );
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
