"use client";

import { Pencil } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  type FormEvent,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { useAuth } from "@/contexts/AuthContext";
import { type CountryWithMarket, useStore } from "@/contexts/StoreContext";
import { useStoreThemeSettings } from "@/contexts/ThemeSettingsContext";
import { useCountrySwitch } from "@/hooks/useCountrySwitch";
import { getCustomerShippingDestination } from "@/lib/data/shipping-estimates";
import {
  formatDeliveryDestinationLabel,
  mergeCustomerDestination,
  readDeliveryDestination,
  writeDeliveryDestination,
} from "@/lib/delivery-destination";
import { themeSettingEnabled } from "@/lib/theme/setting-value";
import { cn } from "@/lib/utils";

interface RegionPreferencesProps {
  variant: "menu" | "header" | "deliver";
  showCountryOverride?: boolean;
  showLanguageOverride?: boolean;
  showCountryName?: boolean;
}

interface CountryFlagProps {
  country: string;
  className: string;
  sizes: string;
}

function CountryFlag({ country, className, sizes }: CountryFlagProps) {
  return (
    <span
      aria-hidden="true"
      className={cn("relative inline-block overflow-hidden", className)}
    >
      <Image
        src={`/flags/1x1/${country.toLowerCase()}.svg`}
        alt=""
        fill
        sizes={sizes}
        className="object-cover"
        unoptimized
      />
    </span>
  );
}

function getCountry(
  countries: CountryWithMarket[],
  countryIso: string,
): CountryWithMarket | undefined {
  return countries.find(
    (entry) => entry.iso.toLowerCase() === countryIso.toLowerCase(),
  );
}

function getSupportedLocales(entry: CountryWithMarket): string[] {
  return entry.supported_locales.length > 0
    ? entry.supported_locales
    : [entry.default_locale];
}

function getSupportedCurrencies(value: unknown): Set<string> | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const currencies = value
    .split(/[\s,;]+/)
    .map((currencyCode) => currencyCode.trim().toUpperCase())
    .filter(Boolean);
  return currencies.length ? new Set(currencies) : null;
}

function subscribeDeliveryDestination(onStoreChange: () => void): () => void {
  window.addEventListener("spree:delivery-destination", onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener("spree:delivery-destination", onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

export function RegionPreferences({
  variant,
  showCountryOverride,
  showLanguageOverride,
  showCountryName = false,
}: RegionPreferencesProps) {
  const t = useTranslations("regionPreferences");
  const { countries, country, currency, locale } = useStore();
  const { localization } = useStoreThemeSettings();
  const isDeliverVariant = variant === "deliver";
  const showCountry =
    isDeliverVariant ||
    (showCountryOverride ??
      themeSettingEnabled(localization?.show_country_selector, true));
  const showLanguage =
    showLanguageOverride ??
    themeSettingEnabled(localization?.show_language_selector, true);
  const currencyFormat = localization?.currency_format;
  const showCurrency =
    currencyFormat === "with_currency" ||
    (currencyFormat !== "without_currency" &&
      themeSettingEnabled(localization?.show_currency_code, true));
  const supportedCurrencySetting = localization?.supported_currencies;
  const supportedCurrencies = useMemo(
    () => getSupportedCurrencies(supportedCurrencySetting),
    [supportedCurrencySetting],
  );
  const availableCountries = useMemo(() => {
    const supported = supportedCurrencies
      ? countries.filter((entry) =>
          supportedCurrencies.has(entry.currency.toUpperCase()),
        )
      : countries;
    // Keep the current market selectable even if the merchant has since removed
    // its currency from the allowlist, so customers can switch away from it.
    const current = getCountry(countries, country);
    const choices =
      current && !supported.some((entry) => entry.iso === current.iso)
        ? [...supported, current]
        : supported;
    const defaultCurrency = String(
      localization?.default_currency || "",
    ).toUpperCase();
    return defaultCurrency
      ? [...choices].sort(
          (left, right) =>
            Number(right.currency.toUpperCase() === defaultCurrency) -
            Number(left.currency.toUpperCase() === defaultCurrency),
        )
      : choices;
  }, [countries, country, localization?.default_currency, supportedCurrencies]);
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [open, setOpen] = useState(false);
  const [draftCountry, setDraftCountry] = useState(country);
  const [draftLocale, setDraftLocale] = useState(locale);
  const persistedDestinationKey = useSyncExternalStore(
    subscribeDeliveryDestination,
    () => JSON.stringify(readDeliveryDestination(country)),
    () => JSON.stringify({ countryCode: country, postalCode: "" }),
  );
  const persistedDestination = useMemo(
    () =>
      JSON.parse(persistedDestinationKey) as ReturnType<
        typeof readDeliveryDestination
      >,
    [persistedDestinationKey],
  );
  const persistedPostalCode = persistedDestination.postalCode;
  const [draftPostalCode, setDraftPostalCode] = useState("");
  const [switchError, setSwitchError] = useState(false);
  const { isCartLoading, isCountryNavigating, handleCountrySelect } =
    useCountrySwitch({
      currentCountry: country,
      currentLocale: locale,
      onBeforeNavigate: () => setOpen(false),
    });

  useEffect(() => {
    if (!isDeliverVariant || authLoading) return;

    let cancelled = false;
    async function seedFromCustomer() {
      if (!isAuthenticated) return;
      const local = readDeliveryDestination(country);
      const customerDestination = await getCustomerShippingDestination();
      const next = mergeCustomerDestination(local, customerDestination);
      if (
        cancelled ||
        !customerDestination ||
        (local.manual && local.postalCode)
      ) {
        return;
      }
      if (
        next.postalCode !== local.postalCode ||
        next.countryCode !== local.countryCode ||
        next.stateCode !== local.stateCode ||
        next.city !== local.city
      ) {
        writeDeliveryDestination(next);
      }
    }

    void seedFromCustomer();
    return () => {
      cancelled = true;
    };
  }, [authLoading, country, isAuthenticated, isDeliverVariant]);

  useEffect(() => {
    if (!isDeliverVariant) return;
    setDraftPostalCode(persistedPostalCode);
  }, [country, isDeliverVariant, persistedPostalCode]);

  const selectedCountry =
    getCountry(countries, draftCountry) ?? getCountry(countries, country);
  const localeOptions = selectedCountry
    ? getSupportedLocales(selectedCountry)
    : [locale];
  const languageDisplayNames = useMemo(() => {
    try {
      return new Intl.DisplayNames([locale], { type: "language" });
    } catch {
      return null;
    }
  }, [locale]);

  function handleOpenChange(nextOpen: boolean): void {
    setOpen(nextOpen);
    if (nextOpen) {
      setDraftCountry(country);
      setDraftLocale(locale);
      setDraftPostalCode(persistedPostalCode);
      setSwitchError(false);
    }
  }

  function handleCountryChange(nextCountry: string): void {
    const entry = getCountry(countries, nextCountry);
    if (!entry) return;

    const supportedLocales = getSupportedLocales(entry);
    setDraftCountry(nextCountry);
    setDraftLocale((currentLocale) =>
      supportedLocales.includes(currentLocale)
        ? currentLocale
        : entry.default_locale || supportedLocales[0],
    );
    setSwitchError(false);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    if (!selectedCountry) return;

    setSwitchError(false);

    if (isDeliverVariant) {
      const nextPostal = draftPostalCode.trim();
      writeDeliveryDestination({
        countryCode: selectedCountry.iso.toLowerCase(),
        postalCode: nextPostal,
        manual: true,
      });
    }

    const switched = await handleCountrySelect(selectedCountry, draftLocale);
    if (!switched) {
      setSwitchError(true);
    } else if (
      selectedCountry.iso.toLowerCase() === country.toLowerCase() &&
      draftLocale === locale
    ) {
      setOpen(false);
    }
  }

  const isHeaderVariant = variant === "header";
  const liveCountryName =
    getCountry(countries, country)?.name ?? country.toUpperCase();
  const destinationName = formatDeliveryDestinationLabel(
    persistedDestination,
    liveCountryName,
  );

  if (!showCountry && !showLanguage && !showCurrency && !isDeliverVariant) {
    return (
      <>
        <span data-theme-country-selector style={{ display: "none" }}>
          <CountryFlag
            country={country}
            className="size-3.5 shrink-0 rounded-full shadow-sm ring-1 ring-black/10"
            sizes="16px"
          />
        </span>
        <span data-theme-language-selector style={{ display: "none" }}>
          {locale.toUpperCase()}
        </span>
      </>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {isDeliverVariant ? (
          <button
            type="button"
            aria-label={t("deliverToAria", { destination: destinationName })}
            className="inline-flex max-w-full items-center gap-1.5 text-left text-[15px] leading-snug text-[#222] hover:underline"
          >
            <span>
              {t.rich("deliverTo", {
                destination: destinationName,
                place: (chunks) => (
                  <span className="font-semibold">{chunks}</span>
                ),
              })}
            </span>
            <Pencil className="size-3.5 shrink-0 text-[#222]" aria-hidden />
          </button>
        ) : isHeaderVariant ? (
          <Button variant="ghost" size="icon-lg" className="min-h-11 min-w-11">
            {showCountry && (
              <CountryFlag
                country={country}
                className="size-4.5 rounded-full shadow-sm ring-1 ring-black/10"
                sizes="16px"
              />
            )}
            {showLanguage && <span>{locale.toUpperCase()}</span>}
            {showCurrency && <span>{currency}</span>}
            <span className="sr-only">{t("title")}</span>
          </Button>
        ) : (
          <button
            type="button"
            className={cn(
              "relative flex min-h-11 w-fit items-center gap-2 rounded-sm text-left font-semibold uppercase tracking-wide transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marketplace-focus",
              "text-sm text-foreground hover:text-foreground focus-visible:text-foreground",
            )}
          >
            <span
              data-theme-country-selector
              style={showCountry ? undefined : { display: "none" }}
            >
              <CountryFlag
                country={country}
                className={cn(
                  "size-3.5 shrink-0 rounded-full shadow-sm ring-1",
                  "ring-black/10",
                )}
                sizes="16px"
              />
            </span>
            {showCountry &&
              (showLanguage || showCurrency) &&
              !showCountryName && (
                <span
                  aria-hidden="true"
                  className={cn("h-4 w-px", "bg-border")}
                />
              )}
            <span
              data-theme-language-selector
              style={
                showLanguage && !showCountryName
                  ? undefined
                  : { display: "none" }
              }
            >
              {locale.toUpperCase()}
            </span>
            <span
              className="normal-case tracking-normal"
              style={
                showCountry && showCountryName ? undefined : { display: "none" }
              }
            >
              {selectedCountry?.name ?? country}
            </span>
            {showLanguage && showCurrency && !showCountryName && (
              <span
                aria-hidden="true"
                className={cn("h-4 w-px", "bg-border")}
              />
            )}
            {showCurrency && !showCountryName && <span>{currency}</span>}
            <span className="sr-only">{t("title")}</span>
          </button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>

          <FieldGroup className="mt-6">
            {showCountry && (
              <Field>
                <FieldLabel htmlFor="region-preferences-country">
                  {t("region")}
                </FieldLabel>
                <NativeSelect
                  id="region-preferences-country"
                  className="w-full"
                  value={draftCountry}
                  onChange={(event) => handleCountryChange(event.target.value)}
                >
                  {availableCountries.map((entry) => (
                    <NativeSelectOption
                      key={entry.iso}
                      value={entry.iso.toLowerCase()}
                    >
                      {entry.name} ({entry.currency})
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
            )}

            {showLanguage && !isDeliverVariant && (
              <Field>
                <FieldLabel htmlFor="region-preferences-language">
                  {t("language")}
                </FieldLabel>
                <NativeSelect
                  id="region-preferences-language"
                  className="w-full"
                  value={draftLocale}
                  onChange={(event) => {
                    setDraftLocale(event.target.value);
                    setSwitchError(false);
                  }}
                >
                  {localeOptions.map((localeCode) => (
                    <NativeSelectOption key={localeCode} value={localeCode}>
                      {languageDisplayNames?.of(localeCode) ?? localeCode} (
                      {localeCode.toUpperCase()})
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
            )}

            {isDeliverVariant ? (
              <Field>
                <FieldLabel htmlFor="region-preferences-postal">
                  {t("postalCode")}
                </FieldLabel>
                <Input
                  id="region-preferences-postal"
                  value={draftPostalCode}
                  onChange={(event) => setDraftPostalCode(event.target.value)}
                  placeholder={t("postalCodePlaceholder")}
                  autoComplete="postal-code"
                  inputMode="numeric"
                />
              </Field>
            ) : null}

            {switchError ? (
              <FieldError>{t("updatePreferencesFailed")}</FieldError>
            ) : null}
          </FieldGroup>

          <DialogFooter className="mt-6 sm:justify-stretch">
            <Button
              type="submit"
              className="w-full"
              disabled={
                !selectedCountry || isCartLoading || isCountryNavigating
              }
            >
              {isCountryNavigating
                ? t("updatingPreferences")
                : t("updatePreferences")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
