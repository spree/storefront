import { afterEach, describe, expect, it } from "vitest";
import {
  type LocaleAlternate,
  readLocaleAlternates,
  resolveLocaleSwitchPath,
} from "../locale-switch";

const productAlternates: LocaleAlternate[] = [
  {
    hrefLang: "fr-FR",
    href: "https://shop.example/fr/fr/products/friteuse-a-air-double-panier-8l",
  },
  {
    hrefLang: "de-DE",
    href: "https://shop.example/de/de/products/doppelkorb-heissluftfritteuse-8l",
  },
  {
    hrefLang: "en-US",
    href: "https://shop.example/us/en/products/dual-basket-air-fryer-8l",
  },
  {
    hrefLang: "x-default",
    href: "https://shop.example/us/en/products/dual-basket-air-fryer-8l",
  },
];

describe("resolveLocaleSwitchPath", () => {
  it("uses the target locale's alternate slug", () => {
    expect(
      resolveLocaleSwitchPath(
        "/fr/fr/products/friteuse-a-air-double-panier-8l",
        "/de/de",
        productAlternates,
      ),
    ).toBe("/de/de/products/doppelkorb-heissluftfritteuse-8l");
  });

  it("matches the target prefix regardless of case", () => {
    expect(
      resolveLocaleSwitchPath("/us/en/c/kitchen", "/ca/fr-CA", [
        { hrefLang: "fr-CA", href: "https://shop.example/ca/fr-ca/c/cuisine" },
      ]),
    ).toBe("/ca/fr-CA/c/cuisine");
  });

  it("does not mistake a longer locale for the target prefix", () => {
    expect(
      resolveLocaleSwitchPath("/us/en/c/kitchen", "/us/en", [
        { hrefLang: "en-GB", href: "https://shop.example/us/en-gb/c/kitchen" },
        { hrefLang: "x-default", href: "https://shop.example/us/en/c/home" },
      ]),
    ).toBe("/us/en/c/home");
  });

  it("falls back to the x-default slug when the target has no translation", () => {
    expect(
      resolveLocaleSwitchPath(
        "/fr/fr/products/friteuse-a-air-double-panier-8l",
        "/pl/pl",
        productAlternates,
      ),
    ).toBe("/pl/pl/products/dual-basket-air-fryer-8l");
  });

  it("ignores an x-default that is the current detail page itself", () => {
    // buildLocalizedAlternates output when Market data is unavailable.
    const selfOnly = [
      {
        hrefLang: "fr",
        href: "https://shop.example/fr/fr/products/friteuse-a-air-double-panier-8l",
      },
      {
        hrefLang: "x-default",
        href: "https://shop.example/fr/fr/products/friteuse-a-air-double-panier-8l",
      },
    ];

    expect(
      resolveLocaleSwitchPath(
        "/fr/fr/products/friteuse-a-air-double-panier-8l",
        "/de/de",
        selfOnly,
      ),
    ).toBe("/de/de/products");
  });

  it("keeps a self-referencing x-default on pages without translated slugs", () => {
    expect(
      resolveLocaleSwitchPath("/fr/fr/products", "/de/de", [
        { hrefLang: "fr", href: "https://shop.example/fr/fr/products" },
        { hrefLang: "x-default", href: "https://shop.example/fr/fr/products" },
      ]),
    ).toBe("/de/de/products");
  });

  it.each([
    ["/fr/fr/products/friteuse", "/de/de/products"],
    ["/fr/fr/c/cuisine/friteuses", "/de/de/products"],
    ["/fr/fr/collections/soldes", "/de/de/collections"],
    ["/fr/fr/policies/confidentialite", "/de/de"],
    ["/fr/fr/wholesale/products/friteuse", "/de/de/wholesale"],
  ])(
    "never reuses a translated slug without alternates: %s",
    (pathname, expected) => {
      expect(resolveLocaleSwitchPath(pathname, "/de/de", [])).toBe(expected);
    },
  );

  it.each([
    ["/fr/fr/cart", "/de/de/cart"],
    ["/fr/fr/account/orders", "/de/de/account/orders"],
    ["/fr/fr/products", "/de/de/products"],
    ["/fr/fr", "/de/de"],
  ])("keeps paths without translated segments: %s", (pathname, expected) => {
    expect(resolveLocaleSwitchPath(pathname, "/de/de", [])).toBe(expected);
  });
});

describe("readLocaleAlternates", () => {
  afterEach(() => {
    document.head.innerHTML = "";
    document.body.innerHTML = "";
  });

  it("reads hreflang links from head and streamed body metadata", () => {
    document.head.innerHTML = `
      <link rel="canonical" href="https://shop.example/fr/fr/products/a" />
      <link rel="alternate" hreflang="fr-FR" href="https://shop.example/fr/fr/products/a" />
    `;
    document.body.innerHTML = `
      <link rel="alternate" hreflang="de-DE" href="https://shop.example/de/de/products/b" />
      <link rel="alternate" type="application/rss+xml" href="/feed" />
    `;

    expect(readLocaleAlternates(document)).toEqual([
      { hrefLang: "fr-FR", href: "https://shop.example/fr/fr/products/a" },
      { hrefLang: "de-DE", href: "https://shop.example/de/de/products/b" },
    ]);
  });
});
