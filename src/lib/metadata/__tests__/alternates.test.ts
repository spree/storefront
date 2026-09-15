import type { Country, Market } from "@spree/sdk";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MarketLocaleTarget } from "@/i18n/markets";
import { getMarkets } from "@/lib/data/markets";
import {
  buildHreflangLanguages,
  buildLocalizedAlternates,
  translationFingerprint,
} from "@/lib/metadata/alternates";

vi.mock("@/lib/data/markets", () => ({
  getMarkets: vi.fn(),
}));

vi.mock("@/lib/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/store")>();
  return {
    ...actual,
    getDefaultCountry: () => "us",
    getDefaultLocale: () => "en",
  };
});

function market(overrides: Partial<Market> = {}): Market {
  return {
    id: "market-1",
    name: "North America",
    currency: "USD",
    default_locale: "en",
    tax_inclusive: false,
    default: true,
    country_isos: ["US"],
    supported_locales: ["de", "en", "ja"],
    countries: [country("US")],
    ...overrides,
  } as Market;
}

function country(iso: string): Country {
  return {
    iso,
    iso3: iso,
    name: iso,
    states_required: false,
    zipcode_required: false,
  } as Country;
}

describe("buildHreflangLanguages", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("builds a self-referencing language cluster for a single-country Market", async () => {
    vi.mocked(getMarkets).mockResolvedValue({ data: [market()] });

    const languages = await buildHreflangLanguages({
      storeUrl: "https://store.example/",
      country: "US",
      locale: "en",
      path: "",
    });

    expect(languages).toEqual({
      en: "https://store.example/us/en",
      de: "https://store.example/us/de",
      "x-default": "https://store.example/us/en",
    });
  });

  it("links every country in the current Market with regional codes", async () => {
    vi.mocked(getMarkets).mockResolvedValue({
      data: [market({ countries: [country("US"), country("CA")] })],
    });

    const languages = await buildHreflangLanguages({
      storeUrl: "https://store.example",
      country: "ca",
      locale: "de",
      path: "/products",
    });

    expect(languages).toEqual({
      "en-US": "https://store.example/us/en/products",
      "de-US": "https://store.example/us/de/products",
      "en-CA": "https://store.example/ca/en/products",
      "de-CA": "https://store.example/ca/de/products",
      "x-default": "https://store.example/us/en/products",
    });
  });

  it("links localized routes across every Market in the storefront", async () => {
    vi.mocked(getMarkets).mockResolvedValue({
      data: [
        market(),
        market({
          id: "market-2",
          default: false,
          default_locale: "de",
          supported_locales: ["de"],
          countries: [country("DE")],
        }),
      ],
    });

    const languages = await buildHreflangLanguages({
      storeUrl: "https://store.example",
      country: "de",
      locale: "de",
      path: "/products",
    });

    expect(languages).toEqual({
      "en-US": "https://store.example/us/en/products",
      "de-US": "https://store.example/us/de/products",
      "de-DE": "https://store.example/de/de/products",
      "x-default": "https://store.example/us/en/products",
    });
  });

  it("omits resource locales that are only default-locale fallback content", async () => {
    vi.mocked(getMarkets).mockResolvedValue({
      data: [market({ supported_locales: ["en", "de", "fr"] })],
    });
    const english = translationFingerprint("Coffee mug", "coffee-mug");
    const resolvePath = vi.fn(async (target: MarketLocaleTarget) => {
      if (target.locale === "de") {
        return {
          path: "/products/deutsche-tasse",
          fingerprint: translationFingerprint(
            "Deutsche Tasse",
            "deutsche-tasse",
          ),
        };
      }
      return {
        path: "/products/coffee-mug",
        fingerprint: english,
      };
    });

    const languages = await buildHreflangLanguages({
      storeUrl: "https://store.example",
      country: "us",
      locale: "en",
      path: "/products/coffee-mug",
      currentResourceFingerprint: english,
      resolvePath,
    });

    expect(resolvePath).toHaveBeenCalledTimes(2);
    expect(languages).toEqual({
      en: "https://store.example/us/en/products/coffee-mug",
      de: "https://store.example/us/de/products/deutsche-tasse",
      "x-default": "https://store.example/us/en/products/coffee-mug",
    });
  });

  it("does not advertise a current resource page when it is fallback content", async () => {
    vi.mocked(getMarkets).mockResolvedValue({ data: [market()] });
    const fallback = translationFingerprint("Coffee mug", "coffee-mug");
    const resolvePath = vi.fn(async () => ({
      path: "/products/coffee-mug",
      fingerprint: fallback,
    }));

    const alternates = await buildLocalizedAlternates({
      storeUrl: "https://store.example",
      country: "us",
      locale: "de",
      path: "/products/coffee-mug",
      currentResourceFingerprint: fallback,
      resolvePath,
    });

    expect(alternates).toEqual({
      canonical: "https://store.example/us/en/products/coffee-mug",
      languages: {
        en: "https://store.example/us/en/products/coffee-mug",
        "x-default": "https://store.example/us/en/products/coffee-mug",
      },
    });
  });

  it("detects Store-default fallback content in a non-default Market", async () => {
    vi.mocked(getMarkets).mockResolvedValue({
      data: [
        market({
          supported_locales: ["en"],
          countries: [country("US")],
        }),
        market({
          id: "market-eu",
          default: false,
          default_locale: "de",
          supported_locales: ["de", "es", "fr"],
          countries: [country("DE")],
        }),
      ],
    });
    const english = translationFingerprint("Coffee mug", "coffee-mug");
    const german = translationFingerprint("Kaffeetasse", "kaffeetasse");
    const french = translationFingerprint("Tasse à café", "tasse-a-cafe");
    const resolvePath = vi.fn(async (target: MarketLocaleTarget) => {
      if (target.locale === "de") {
        return {
          path: "/products/kaffeetasse",
          fingerprint: german,
        };
      }
      if (target.locale === "fr") {
        return {
          path: "/products/tasse-a-cafe",
          fingerprint: french,
        };
      }
      return {
        path: "/products/coffee-mug",
        fingerprint: english,
      };
    });

    const alternates = await buildLocalizedAlternates({
      storeUrl: "https://store.example",
      country: "de",
      locale: "es",
      path: "/products/coffee-mug",
      currentResourceFingerprint: english,
      resolvePath,
    });

    expect(alternates).toEqual({
      canonical: "https://store.example/de/de/products/kaffeetasse",
      languages: {
        "en-US": "https://store.example/us/en/products/coffee-mug",
        "de-DE": "https://store.example/de/de/products/kaffeetasse",
        "fr-DE": "https://store.example/de/fr/products/tasse-a-cafe",
        "x-default": "https://store.example/us/en/products/coffee-mug",
      },
    });
  });

  it("keeps x-default stable when the default Market lacks the resource", async () => {
    vi.mocked(getMarkets).mockResolvedValue({
      data: [
        market({
          supported_locales: ["en"],
          countries: [country("US")],
        }),
        market({
          id: "market-eu",
          default: false,
          default_locale: "de",
          supported_locales: ["de", "fr"],
          countries: [country("DE")],
        }),
      ],
    });
    const english = translationFingerprint("Coffee mug");
    const german = translationFingerprint("Kaffeetasse");
    const french = translationFingerprint("Tasse à café");
    const resolvePath = vi.fn(async (target: MarketLocaleTarget) => {
      if (target.marketId === "market-1") return null;
      if (target.locale === "de") {
        return { path: "/products/kaffeetasse", fingerprint: german };
      }
      if (target.locale === "fr") {
        return { path: "/products/tasse-a-cafe", fingerprint: french };
      }
      return { path: "/products/coffee-mug", fingerprint: english };
    });

    const [germanAlternates, frenchAlternates] = await Promise.all([
      buildLocalizedAlternates({
        storeUrl: "https://store.example",
        country: "de",
        locale: "de",
        path: "/products/kaffeetasse",
        currentResourceFingerprint: german,
        resolvePath,
      }),
      buildLocalizedAlternates({
        storeUrl: "https://store.example",
        country: "de",
        locale: "fr",
        path: "/products/tasse-a-cafe",
        currentResourceFingerprint: french,
        resolvePath,
      }),
    ]);

    expect(germanAlternates.languages["x-default"]).toBe(
      "https://store.example/de/de/products/kaffeetasse",
    );
    expect(frenchAlternates.languages["x-default"]).toBe(
      germanAlternates.languages["x-default"],
    );
  });

  it("starts default and alternate resource requests in parallel", async () => {
    vi.mocked(getMarkets).mockResolvedValue({
      data: [market({ supported_locales: ["en", "de", "fr"] })],
    });
    let resolveDefault:
      | ((value: { path: string; fingerprint: string }) => void)
      | undefined;
    const resolvePath = vi.fn((target: MarketLocaleTarget) => {
      if (target.locale === "en") {
        return new Promise<{ path: string; fingerprint: string }>((resolve) => {
          resolveDefault = resolve;
        });
      }
      return Promise.resolve({
        path: "/products/tasse",
        fingerprint: translationFingerprint("Tasse"),
      });
    });

    const pending = buildLocalizedAlternates({
      storeUrl: "https://store.example",
      country: "us",
      locale: "de",
      path: "/products/tasse",
      currentResourceFingerprint: translationFingerprint("Tasse"),
      resolvePath,
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(resolvePath).toHaveBeenCalledWith(
      expect.objectContaining({ locale: "fr" }),
    );
    resolveDefault?.({
      path: "/products/coffee-mug",
      fingerprint: translationFingerprint("Coffee mug"),
    });

    await expect(pending).resolves.toEqual(
      expect.objectContaining({
        canonical: "https://store.example/us/de/products/tasse",
      }),
    );
  });

  it("uses the default Market country when the configured country is unavailable", async () => {
    vi.mocked(getMarkets).mockResolvedValue({
      data: [
        market({
          id: "market-eu",
          default_locale: "de",
          supported_locales: ["de"],
          countries: [country("DE"), country("AT")],
        }),
      ],
    });

    const languages = await buildHreflangLanguages({
      storeUrl: "https://store.example",
      country: "de",
      locale: "de",
      path: "/products",
    });

    expect(languages).toEqual({
      "de-DE": "https://store.example/de/de/products",
      "de-AT": "https://store.example/at/de/products",
      "x-default": "https://store.example/de/de/products",
    });
  });

  it("keeps the current canonical when the resource has a real translation", async () => {
    vi.mocked(getMarkets).mockResolvedValue({ data: [market()] });
    const resolvePath = vi.fn(async (target: MarketLocaleTarget) => ({
      path:
        target.locale === "en"
          ? "/products/coffee-mug"
          : "/products/deutsche-tasse",
      fingerprint: translationFingerprint(
        target.locale === "en" ? "Coffee mug" : "Deutsche Tasse",
      ),
    }));

    const alternates = await buildLocalizedAlternates({
      storeUrl: "https://store.example",
      country: "us",
      locale: "de",
      path: "/products/deutsche-tasse",
      currentResourceFingerprint: translationFingerprint("Deutsche Tasse"),
      resolvePath,
    });

    expect(alternates).toEqual({
      canonical: "https://store.example/us/de/products/deutsche-tasse",
      languages: {
        en: "https://store.example/us/en/products/coffee-mug",
        de: "https://store.example/us/de/products/deutsche-tasse",
        "x-default": "https://store.example/us/en/products/coffee-mug",
      },
    });
  });

  it("resolves each resource locale once across a multi-country Market", async () => {
    vi.mocked(getMarkets).mockResolvedValue({
      data: [market({ countries: [country("US"), country("CA")] })],
    });
    const english = translationFingerprint("Coffee mug");
    const resolvePath = vi.fn(async () => ({
      path: "/products/deutsche-tasse",
      fingerprint: translationFingerprint("Deutsche Tasse"),
    }));

    const languages = await buildHreflangLanguages({
      storeUrl: "https://store.example",
      country: "us",
      locale: "en",
      path: "/products/coffee-mug",
      currentResourceFingerprint: english,
      resolvePath,
    });

    expect(resolvePath).toHaveBeenCalledTimes(1);
    expect(Object.keys(languages)).toEqual([
      "en-US",
      "de-US",
      "en-CA",
      "de-CA",
      "x-default",
    ]);
  });

  it("falls back to the current page when Markets are unavailable", async () => {
    vi.mocked(getMarkets).mockRejectedValue(new Error("API unavailable"));

    const languages = await buildHreflangLanguages({
      storeUrl: "https://store.example",
      country: "us",
      locale: "en",
      path: "/products",
    });

    expect(languages).toEqual({
      en: "https://store.example/us/en/products",
      "x-default": "https://store.example/us/en/products",
    });
  });
});
