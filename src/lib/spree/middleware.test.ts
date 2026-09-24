import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { createSpreeMiddleware } from "@/lib/spree/middleware";

const middleware = createSpreeMiddleware({
  defaultCountry: "us",
  defaultLocale: "en",
  supportedLocales: ["en", "de", "zh-CN"],
});

describe("Spree locale middleware", () => {
  it("canonicalizes an existing country and locale prefix", () => {
    const response = middleware(
      new NextRequest("https://store.example/US/ZH-cn/products?sort=name"),
    );

    expect(response.headers.get("location")).toBe(
      "https://store.example/us/zh-CN/products?sort=name",
    );
  });

  it("keeps regional default locales in lowercase route segments", () => {
    const regionalMiddleware = createSpreeMiddleware({
      defaultCountry: "gb",
      defaultLocale: "en-GB",
      supportedLocales: ["en", "en-gb"],
    });

    const response = regionalMiddleware(
      new NextRequest("https://store.example/"),
    );

    expect(response.headers.get("location")).toBe(
      "https://store.example/gb/en-gb",
    );
  });

  it("redirects an unsupported storefront locale without dropping the path", () => {
    const response = middleware(
      new NextRequest("https://store.example/ar/it/products/coffee"),
    );

    expect(response.headers.get("location")).toBe(
      "https://store.example/us/en/products/coffee",
    );
    expect(response.cookies.get("spree_country")?.value).toBe("us");
    expect(response.cookies.get("spree_locale")?.value).toBe("en");
  });

  it("falls back to a supported locale when the configured default is unavailable", () => {
    const invalidDefaultMiddleware = createSpreeMiddleware({
      defaultCountry: "us",
      defaultLocale: "it",
      supportedLocales: ["en", "de"],
    });

    const response = invalidDefaultMiddleware(
      new NextRequest("https://store.example/us/it/products"),
    );

    expect(response.headers.get("location")).toBe(
      "https://store.example/us/en/products",
    );
  });

  it("negotiates the first supported browser language", () => {
    const response = middleware(
      new NextRequest("https://store.example/products", {
        headers: { "accept-language": "it-IT, de-DE;q=0.9, en;q=0.8" },
      }),
    );

    expect(response.headers.get("location")).toBe(
      "https://store.example/us/de/products",
    );
  });

  it("uses Accept-Language quality weights instead of header order", () => {
    const response = middleware(
      new NextRequest("https://store.example/products", {
        headers: { "accept-language": "de;q=0, en-US;q=0.9" },
      }),
    );

    expect(response.headers.get("location")).toBe(
      "https://store.example/us/en/products",
    );
  });

  it("forwards the localized request path for Market-aware fallbacks", () => {
    const response = middleware(
      new NextRequest("https://store.example/ar/en/products/coffee?sort=price"),
    );

    expect(
      response.headers.get("x-middleware-request-x-spree-request-pathname"),
    ).toBe("/ar/en/products/coffee");
    expect(
      response.headers.get("x-middleware-request-x-spree-request-search"),
    ).toBe("?sort=price");
  });

  it("redirects an anonymous protected account request to sign in", () => {
    const response = middleware(
      new NextRequest(
        "https://store.example/us/en/account/orders?state=complete",
      ),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://store.example/us/en/account?redirect=%2Fus%2Fen%2Faccount%2Forders%3Fstate%3Dcomplete",
    );
  });

  it.each([
    "/us/en/account",
    "/us/en/account/register",
    "/us/en/account/forgot-password",
    "/us/en/account/reset-password?token=reset-token",
  ])("keeps the public account route accessible: %s", (pathname) => {
    const response = middleware(
      new NextRequest(`https://store.example${pathname}`),
    );

    expect(response.headers.get("location")).toBeNull();
  });

  it.each([
    "_spree_jwt",
    "_spree_refresh_token",
  ])("allows a protected account request with a %s session cookie", (cookieName) => {
    const request = new NextRequest(
      "https://store.example/us/en/account/orders",
    );
    request.cookies.set(cookieName, "session-token");

    const response = middleware(request);

    expect(response.headers.get("location")).toBeNull();
  });

  it("does not treat an empty auth cookie as a session credential", () => {
    const request = new NextRequest(
      "https://store.example/us/en/account/orders",
    );
    request.cookies.set("_spree_jwt", "");

    const response = middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/us/en/account?");
  });
});
