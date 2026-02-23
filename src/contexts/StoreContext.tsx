"use client";

import type { StoreCountry, StoreStore } from "@spree/sdk";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { getCountries as getCountriesAction } from "@/lib/data/countries";
import { getStore as getStoreAction } from "@/lib/data/store";
import { setStoreCookies } from "@/lib/utils/cookies";
import { getPathWithoutPrefix } from "@/lib/utils/path";

interface StoreContextValue {
  country: string;
  locale: string;
  currency: string;
  store: StoreStore | null;
  countries: StoreCountry[];
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

/** Find a country by ISO code in the flat countries list. */
function findCountry(
  countries: StoreCountry[],
  countryIso: string,
): StoreCountry | undefined {
  return countries.find(
    (c) => c.iso.toLowerCase() === countryIso.toLowerCase(),
  );
}

function resolveCountryAndCurrency(
  countries: StoreCountry[],
  storeData: StoreStore,
  urlCountry: string,
): {
  country: StoreCountry | undefined;
  currency: string;
  locale: string;
  needsRedirect: boolean;
} {
  const country = findCountry(countries, urlCountry);

  if (country) {
    return {
      country,
      currency: country.currency || storeData.default_currency || "USD",
      locale: country.default_locale || storeData.default_locale || "en",
      needsRedirect: false,
    };
  }

  // Country not found — redirect to first available country
  const defaultCountry = countries[0];
  if (defaultCountry) {
    return {
      country: defaultCountry,
      currency: defaultCountry.currency || storeData.default_currency || "USD",
      locale: defaultCountry.default_locale || storeData.default_locale || "en",
      needsRedirect: true,
    };
  }

  return {
    country: undefined,
    currency: storeData.default_currency || "USD",
    locale: storeData.default_locale || "en",
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
  const [countries, setCountries] = useState<StoreCountry[]>([]);
  const [loading, setLoading] = useState(true);
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  // Fetch store and countries data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [storeData, countriesData] = await Promise.all([
          getStoreAction(),
          getCountriesAction(),
        ]);

        setStore(storeData);
        setCountries(countriesData.data);

        const resolved = resolveCountryAndCurrency(
          countriesData.data,
          storeData,
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

  const setCountry = (newCountry: string) => {
    setCountryState(newCountry);
    const countryObj = findCountry(countries, newCountry);
    if (countryObj?.currency) {
      setCurrency(countryObj.currency);
    }
  };

  const setLocale = (newLocale: string) => {
    setLocaleState(newLocale);
  };

  return (
    <StoreContext.Provider
      value={{
        country,
        locale,
        currency,
        store,
        countries,
        setCountry,
        setLocale,
        loading,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error("useStore must be used within a StoreProvider");
  }
  return context;
}
