"use client";

import type { Country, CurrencyCode, LocaleCode, Market } from "@spree/sdk";
import { createContext, type ReactNode, useContext, useMemo } from "react";
import { getStoreName } from "@/lib/store";
import { sortByCountryName } from "@/lib/utils/format";

/** Country enriched with market info (currency, locale, etc.) */
export interface CountryWithMarket extends Country {
  currency: CurrencyCode;
  default_locale: LocaleCode;
  supported_locales: LocaleCode[];
  marketId: string | null;
}

const storeName = getStoreName();

interface StoreContextValue {
  storeName: string;
  country: string;
  locale: string;
  currency: string;
  countries: CountryWithMarket[];
  loading: boolean;
}

const StoreContext = createContext<StoreContextValue | undefined>(undefined);

interface StoreProviderProps {
  children: ReactNode;
  initialCountry: string;
  initialLocale: string;
  initialMarkets: Market[];
}

/** Build a flat country list from markets, enriching each country with market info. */
function buildCountriesFromMarkets(
  markets: Market[],
  locale: string,
): CountryWithMarket[] {
  const seen = new Set<string>();
  const result: CountryWithMarket[] = [];

  for (const market of markets) {
    for (const country of market.countries ?? []) {
      if (seen.has(country.iso)) continue;
      seen.add(country.iso);

      result.push({
        ...country,
        currency: market.currency,
        default_locale: market.default_locale,
        supported_locales:
          market.supported_locales.length > 0
            ? market.supported_locales
            : [market.default_locale],
        marketId: market.id,
      });
    }
  }

  return sortByCountryName(result, locale);
}

/** Find a country by ISO code in the flat countries list. */
function findCountry(
  countries: CountryWithMarket[],
  countryIso: string,
): CountryWithMarket | undefined {
  return countries.find(
    (c) => c.iso.toLowerCase() === countryIso.toLowerCase(),
  );
}

export function StoreProvider({
  children,
  initialCountry,
  initialLocale,
  initialMarkets,
}: StoreProviderProps) {
  const countries = useMemo(
    () => buildCountriesFromMarkets(initialMarkets, initialLocale),
    [initialMarkets, initialLocale],
  );

  const selectedCountry = useMemo(
    () => findCountry(countries, initialCountry),
    [countries, initialCountry],
  );

  // The layout performs server-side validation, so the URL country should
  // always be valid. Use fallbacks only as a defensive measure.
  const country = (selectedCountry?.iso || initialCountry).toLowerCase();
  const locale = selectedCountry
    ? initialLocale
    : (countries[0]?.default_locale ?? initialLocale);
  const currency = selectedCountry?.currency ?? countries[0]?.currency ?? "USD";

  const value = useMemo<StoreContextValue>(
    () => ({
      storeName,
      country,
      locale,
      currency,
      countries,
      loading: false,
    }),
    [country, locale, currency, countries],
  );

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error("useStore must be used within a StoreProvider");
  }
  return context;
}
