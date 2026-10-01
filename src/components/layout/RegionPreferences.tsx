"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { type FormEvent, useMemo, useState } from "react";
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
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { type CountryWithMarket, useStore } from "@/contexts/StoreContext";
import { useCountrySwitch } from "@/hooks/useCountrySwitch";
import { resolveSupportedLocale, type SupportedLocale } from "@/i18n/locales";
import { toRouteLocale } from "@/i18n/normalize";
import { cn } from "@/lib/utils";

interface RegionPreferencesProps {
  variant: "menu" | "header";
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
  const locales = [entry.default_locale, ...entry.supported_locales];

  return Array.from(
    new Set(
      locales
        .map((locale) => resolveSupportedLocale(locale))
        .filter((locale): locale is SupportedLocale => locale !== undefined),
    ),
  );
}

export function RegionPreferences({ variant }: RegionPreferencesProps) {
  const t = useTranslations("regionPreferences");
  const { countries, country, currency, locale } = useStore();
  const [open, setOpen] = useState(false);
  const [draftCountry, setDraftCountry] = useState(country);
  const [draftLocale, setDraftLocale] = useState(locale);
  const [switchError, setSwitchError] = useState(false);
  const { isCartLoading, isCountryNavigating, handleCountrySelect } =
    useCountrySwitch({
      currentCountry: country,
      currentLocale: locale,
      onBeforeNavigate: () => setOpen(false),
    });

  const selectedCountry =
    getCountry(countries, draftCountry) ?? getCountry(countries, country);
  const localeOptions = selectedCountry
    ? getSupportedLocales(selectedCountry)
    : [toRouteLocale(locale) ?? locale];
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
      setSwitchError(false);
    }
  }

  function handleCountryChange(nextCountry: string): void {
    const entry = getCountry(countries, nextCountry);
    if (!entry) return;

    const supportedLocales = getSupportedLocales(entry);

    setDraftCountry(nextCountry);
    setDraftLocale((currentLocale) =>
      supportedLocales.includes(
        toRouteLocale(currentLocale) ?? currentLocale.toLowerCase(),
      )
        ? (toRouteLocale(currentLocale) ?? currentLocale.toLowerCase())
        : (supportedLocales[0] ?? ""),
    );
    setSwitchError(false);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    if (
      !selectedCountry ||
      localeOptions.length === 0 ||
      !localeOptions.includes(draftLocale)
    ) {
      return;
    }

    setSwitchError(false);
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
  const hasRenderableLocale =
    localeOptions.length > 0 && localeOptions.includes(draftLocale);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {isHeaderVariant ? (
          <Button variant="ghost" size="icon-lg" aria-label={t("title")}>
            <CountryFlag
              country={country}
              className="size-4.5 rounded-full shadow-sm ring-1 ring-black/10"
              sizes="16px"
            />
          </Button>
        ) : (
          <button
            type="button"
            aria-label={t("title")}
            className={cn(
              "relative flex w-fit items-center gap-2 pb-1 text-left font-semibold uppercase tracking-wide outline-none transition-colors after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:origin-right after:scale-x-0 after:bg-current after:transition-transform after:duration-500 after:ease-in-out hover:after:origin-left hover:after:scale-x-100 focus-visible:after:origin-left focus-visible:after:scale-x-100 motion-reduce:after:transition-none",
              "text-sm text-foreground hover:text-foreground focus-visible:text-foreground",
            )}
          >
            <CountryFlag
              country={country}
              className={cn(
                "size-3.5 shrink-0 rounded-full shadow-sm ring-1",
                "ring-black/10",
              )}
              sizes="16px"
            />
            <span aria-hidden="true" className={cn("h-4 w-px", "bg-border")} />
            <span>{locale.toUpperCase()}</span>
            <span aria-hidden="true" className={cn("h-4 w-px", "bg-border")} />
            <span>{currency}</span>
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
                {countries.map((entry) => (
                  <NativeSelectOption
                    key={entry.iso}
                    value={entry.iso.toLowerCase()}
                  >
                    {entry.name} ({entry.currency})
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>

            <Field>
              <FieldLabel htmlFor="region-preferences-language">
                {t("language")}
              </FieldLabel>
              <NativeSelect
                id="region-preferences-language"
                className="w-full"
                value={draftLocale}
                disabled={!hasRenderableLocale}
                onChange={(event) => {
                  setDraftLocale(event.target.value);
                  setSwitchError(false);
                }}
              >
                {hasRenderableLocale ? (
                  localeOptions.map((localeCode) => (
                    <NativeSelectOption key={localeCode} value={localeCode}>
                      {languageDisplayNames?.of(localeCode) ?? localeCode} (
                      {localeCode.toUpperCase()})
                    </NativeSelectOption>
                  ))
                ) : (
                  <NativeSelectOption value="" disabled>
                    {t("noSupportedLanguage")}
                  </NativeSelectOption>
                )}
              </NativeSelect>
            </Field>

            {switchError ? (
              <FieldError>{t("updatePreferencesFailed")}</FieldError>
            ) : null}
          </FieldGroup>

          <DialogFooter className="mt-6 sm:justify-stretch">
            <Button
              type="submit"
              className="w-full"
              disabled={
                !selectedCountry ||
                !hasRenderableLocale ||
                isCartLoading ||
                isCountryNavigating
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
