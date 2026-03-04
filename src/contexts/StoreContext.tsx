"use client";

import type { StoreCountry, StoreMarket, StoreStore } from "@spree/sdk";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getMarkets as getMarketsAction } from "@/lib/data/markets";
import { getStore as getStoreAction } from "@/lib/data/store";
import { setStoreCookies } from "@/lib/utils/cookies";
import { getPathWithoutPrefix } from "@/lib/utils/path";

/** Country enriched with market info (currency, locale, etc.) */
export interface CountryWithMarket extends StoreCountry {
  currency: string;
  default_locale: string;
  marketId: string | null;
}

interface StoreContextValue {
  country: string;
  locale: string;
  currency: string;
  store: StoreStore | null;
  countries: CountryWithMarket[];
  setCountry: (country: string) => void;
  setLocale: (locale: string) => void;
  loading: boolean;
}

const StoreContext = createContext<StoreContextValue | undefined>(undefined);

interface StoreProviderProps {
  children: ReactNode;
  initialCountry: string;
  initialLocale: string;
}

/** Build a flat country list from markets, enriching each country with market info. */
function buildCountriesFromMarkets(
  markets: StoreMarket[],
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
        marketId: market.id,
      });
    }
  }

  return result;
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

function resolveCountryAndCurrency(
  countries: CountryWithMarket[],
  urlCountry: string,
): {
  country: CountryWithMarket | undefined;
  currency: string;
  locale: string;
  needsRedirect: boolean;
} {
  const country = findCountry(countries, urlCountry);

  if (country) {
    return {
      country,
      currency: country.currency || "USD",
      locale: country.default_locale || "en",
      needsRedirect: false,
    };
  }

  // Country not found — redirect to first available country
  const defaultCountry = countries[0];
  if (defaultCountry) {
    return {
      country: defaultCountry,
      currency: defaultCountry.currency || "USD",
      locale: defaultCountry.default_locale || "en",
      needsRedirect: true,
    };
  }

  return {
    country: undefined,
    currency: "USD",
    locale: "en",
    needsRedirect: false,
  };
}

export function StoreProvider({
  children,
  initialCountry,
  initialLocale,
}: StoreProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [country, setCountryState] = useState(initialCountry);
  const [locale, setLocaleState] = useState(initialLocale);
  const [currency, setCurrency] = useState("USD");
  const [store, setStore] = useState<StoreStore | null>(null);
  const [countries, setCountries] = useState<CountryWithMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  // Fetch store and markets data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [storeData, marketsData] = await Promise.all([
          getStoreAction(),
          getMarketsAction(),
        ]);

        setStore(storeData);
        const enrichedCountries = buildCountriesFromMarkets(marketsData.data);
        setCountries(enrichedCountries);

        const resolved = resolveCountryAndCurrency(
          enrichedCountries,
          initialCountry,
        );

        if (resolved.needsRedirect && resolved.country) {
          const newLocale = resolved.locale;
          const pathRest = getPathWithoutPrefix(pathnameRef.current);
          const newPath = `/${resolved.country.iso.toLowerCase()}/${newLocale}${pathRest}`;

          setStoreCookies(resolved.country.iso.toLowerCase(), newLocale);
          setCountryState(resolved.country.iso.toLowerCase());
          setLocaleState(newLocale);
          setCurrency(resolved.currency);
          router.replace(newPath);
          setLoading(false);
          return;
        }

        if (resolved.country) {
          setCountryState(resolved.country.iso.toLowerCase());
        }
        setCurrency(resolved.currency);
        setLocaleState(resolved.locale || initialLocale);
      } catch (error) {
        console.error("Failed to fetch store data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [initialCountry, initialLocale, router]);

  const setCountry = useCallback(
    (newCountry: string): void => {
      setCountryState(newCountry);
      const countryObj = findCountry(countries, newCountry);
      if (countryObj) {
        setCurrency(countryObj.currency);
        setLocaleState(countryObj.default_locale);
      }
    },
    [countries],
  );

  const setLocale = useCallback((newLocale: string): void => {
    setLocaleState(newLocale);
  }, []);

  const value = useMemo<StoreContextValue>(
    () => ({
      country,
      locale,
      currency,
      store,
      countries,
      setCountry,
      setLocale,
      loading,
    }),
    [
      country,
      locale,
      currency,
      store,
      countries,
      setCountry,
      setLocale,
      loading,
    ],
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
