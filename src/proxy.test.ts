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
  it("checks a product as the signed-in customer so their catalog products open", async () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = `h.${btoa(JSON.stringify({ exp }))}.s`;

    await proxy(
      new NextRequest("https://store.example/us/en/products/catalog-only", {
        headers: { cookie: `_spree_jwt=${token}` },
      }),
    );

    expect(isMissingStorefrontResource).toHaveBeenCalledWith(
      "/products/catalog-only",
      { country: "us", locale: "en", token },
    );
  });

  it("checks as a guest when the customer's token has expired", async () => {
    const exp = Math.floor(Date.now() / 1000) - 60;
    const token = `h.${btoa(JSON.stringify({ exp }))}.s`;

    await proxy(
      new NextRequest("https://store.example/us/en/products/t-shirt", {
        headers: { cookie: `_spree_jwt=${token}` },
      }),
    );

    expect(isMissingStorefrontResource).toHaveBeenCalledWith(
      "/products/t-shirt",
      { country: "us", locale: "en" },
    );
  });
  it("keeps a guest's 404 marker from hiding a product from a signed-in customer", async () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = `h.${btoa(JSON.stringify({ exp, sub: "42" }))}.s`;

    const response = await proxy(
      new NextRequest("https://store.example/us/en/products/catalog-only", {
        headers: {
          cookie: `spree_missing_page=1; _spree_jwt=${token}`,
          "sec-fetch-dest": "empty",
        },
      }),
    );

    // Checked again as the customer, and the stale marker is cleared.
    expect(isMissingStorefrontResource).toHaveBeenCalledWith(
      "/products/catalog-only",
      { country: "us", locale: "en", token },
    );
    expect(response.headers.get(REWRITE_HEADER)).toBeNull();
    expect(response.headers.get("set-cookie")).toContain(
      "spree_missing_page=;",
    );
  });

  it("keeps the 404 page when a refreshed session finds the record still missing", async () => {
    isMissingStorefrontResource.mockResolvedValue(true);
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = `h.${btoa(JSON.stringify({ exp }))}.s`;

    // An expired token refreshed on the 404 page: the marker was set as a
    // guest, and this token has no sub, so it is checked again either way.
    const response = await proxy(
      new NextRequest("https://store.example/us/en/products/gone", {
        headers: {
          cookie: `spree_missing_page=1; _spree_jwt=${token}`,
          "sec-fetch-dest": "empty",
        },
      }),
    );

    expect(isMissingStorefrontResource).toHaveBeenCalledTimes(1);
    expect(response.headers.get(REWRITE_HEADER)).toBe(
      "https://store.example/_storefront-not-found",
    );
  });

  it("marks a customer's 404 for that customer only", async () => {
    isMissingStorefrontResource.mockResolvedValue(true);
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = `h.${btoa(JSON.stringify({ exp, sub: "42" }))}.s`;

    const response = await proxy(
      new NextRequest("https://store.example/us/en/products/elsewhere", {
        headers: { cookie: `_spree_jwt=${token}` },
      }),
    );
    expect(response.cookies.get("spree_missing_page")?.value).toBe(
      "customer:42",
    );

    // That customer's own follow-up requests reach the 404 page.
    const followUp = await proxy(
      new NextRequest("https://store.example/us/en/products/elsewhere", {
        headers: {
          cookie: `spree_missing_page=customer:42; _spree_jwt=${token}`,
          "sec-fetch-dest": "empty",
        },
      }),
    );
    expect(followUp.headers.get(REWRITE_HEADER)).toBe(
      "https://store.example/_storefront-not-found",
    );
    // Trusted without a second lookup.
    expect(isMissingStorefrontResource).toHaveBeenCalledTimes(1);
  });
});
