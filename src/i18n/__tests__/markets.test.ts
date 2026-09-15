import type { Country, Market } from "@spree/sdk";
import { describe, expect, it } from "vitest";
import {
  findMarketForCountry,
  getDefaultMarketLocaleTarget,
  getMarketLocales,
  getMarketLocaleTargets,
  isLocaleEnabledForMarket,
} from "@/i18n/markets";

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

describe("Market locale routes", () => {
  it("intersects Market locales with storefront message bundles", () => {
    const current = market();
    expect(getMarketLocales(current)).toEqual(["en", "de"]);
    expect(isLocaleEnabledForMarket(current, "DE")).toBe(true);
    expect(isLocaleEnabledForMarket(current, "fr")).toBe(false);
  });

  it("builds deduplicated country and locale targets across Markets", () => {
    const markets = [
      market({ countries: [country("US"), country("CA")] }),
      market({
        id: "market-2",
        default: false,
        default_locale: "de",
        supported_locales: ["de"],
        countries: [country("DE")],
      }),
    ];

    expect(getMarketLocaleTargets(markets)).toEqual([
      { marketId: "market-1", country: "us", locale: "en" },
      { marketId: "market-1", country: "us", locale: "de" },
      { marketId: "market-1", country: "ca", locale: "en" },
      { marketId: "market-1", country: "ca", locale: "de" },
      { marketId: "market-2", country: "de", locale: "de" },
    ]);
    expect(findMarketForCountry(markets, "ca")?.id).toBe("market-1");
    expect(getDefaultMarketLocaleTarget(markets)).toEqual({
      marketId: "market-1",
      country: "us",
      locale: "en",
    });
  });
});
