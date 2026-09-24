"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/contexts/CartContext";
import type { CountryWithMarket } from "@/contexts/StoreContext";
import { toRouteLocale } from "@/i18n/normalize";
import { updateCartMarket } from "@/lib/data/checkout";
import { rebaseAccountRedirectSearch } from "@/lib/utils/account-redirect";
import { setStoreCookies } from "@/lib/utils/cookies";
import { getPathWithoutPrefix } from "@/lib/utils/path";

interface UseCountrySwitchOptions {
  currentCountry: string;
  currentLocale: string;
  onBeforeNavigate?: () => void;
}

interface UseCountrySwitchResult {
  isCartLoading: boolean;
  isCountryNavigating: boolean;
  handleCountrySelect: (
    entry: CountryWithMarket,
    locale?: string,
  ) => Promise<boolean>;
}

export function useCountrySwitch({
  currentCountry,
  currentLocale,
  onBeforeNavigate,
}: UseCountrySwitchOptions): UseCountrySwitchResult {
  const { cart, loading: isCartLoading, refreshCart } = useCart();
  const pathname = usePathname();
  const [isCountryNavigating, setIsCountryNavigating] = useState(false);

  const handleCountrySelect = async (
    entry: CountryWithMarket,
    locale?: string,
  ): Promise<boolean> => {
    const nextCountry = entry.iso.toLowerCase();
    const activeCountry = currentCountry.toLowerCase();
    const newLocale =
      toRouteLocale(locale || entry.default_locale || "en") ?? "en";
    const activeLocale = toRouteLocale(currentLocale) ?? currentLocale;
    const newCurrency = entry.currency;
    const cartMatchesTarget =
      !cart || (cart.currency === newCurrency && cart.locale === newLocale);

    if (isCountryNavigating) {
      return false;
    }

    if (
      nextCountry === activeCountry &&
      newLocale === activeLocale &&
      cartMatchesTarget
    ) {
      return true;
    }

    if (isCartLoading) {
      return false;
    }

    setIsCountryNavigating(true);

    const pathRest = getPathWithoutPrefix(pathname);
    const newPath = `/${nextCountry}/${newLocale}${pathRest}`;
    const currentBasePath = `/${activeCountry}/${activeLocale}`;
    const nextBasePath = `/${nextCountry}/${newLocale}`;

    try {
      if (
        cart &&
        (cart.currency !== newCurrency || cart.locale !== newLocale)
      ) {
        const result = await updateCartMarket(cart.id, {
          currency: newCurrency,
          locale: newLocale,
        });

        if (!result.success) {
          return false;
        }

        await refreshCart();
      }

      setStoreCookies(nextCountry, newLocale);
      onBeforeNavigate?.();
      const nextSearch = rebaseAccountRedirectSearch(
        window.location.search,
        currentBasePath,
        nextBasePath,
      );
      window.location.assign(`${newPath}${nextSearch}${window.location.hash}`);
      return true;
    } catch {
      return false;
    } finally {
      setIsCountryNavigating(false);
    }
  };

  return {
    isCartLoading,
    isCountryNavigating,
    handleCountrySelect,
  };
}
