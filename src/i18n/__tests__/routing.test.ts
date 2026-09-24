import { describe, expect, it } from "vitest";
import { buildLocalizedRedirectPath } from "@/i18n/routing";

describe("localized route fallback", () => {
  it("replaces the locale while preserving the page and query", () => {
    expect(
      buildLocalizedRedirectPath({
        country: "AR",
        locale: "es",
        pathname: "/ar/en/products/coffee",
        search: "?sort=price",
      }),
    ).toBe("/ar/es/products/coffee?sort=price");
  });

  it("falls back to the target root when request context is unavailable", () => {
    expect(buildLocalizedRedirectPath({ country: "us", locale: "en" })).toBe(
      "/us/en",
    );
  });

  it("normalizes regional locale redirects to lowercase", () => {
    expect(
      buildLocalizedRedirectPath({
        country: "GB",
        locale: "en-GB",
        pathname: "/gb/en/products",
      }),
    ).toBe("/gb/en-gb/products");
  });
});
