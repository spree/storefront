import { canonicalizeLocale, matchLocale } from "@/i18n/normalize";

/**
 * The single registry for storefront message bundles. Adding a locale here
 * updates the runtime loader, SupportedLocale type, middleware allow-list and
 * hreflang filtering together. Dynamic imports keep unused bundles out of the
 * active route chunk.
 */
const MESSAGE_LOADERS = {
  de: () => import("../../messages/de.json"),
  en: () => import("../../messages/en.json"),
  "en-gb": () => import("../../messages/en.json"),
  es: () => import("../../messages/es.json"),
  fr: () => import("../../messages/fr.json"),
  pl: () => import("../../messages/pl.json"),
} as const;

export type SupportedLocale = keyof typeof MESSAGE_LOADERS;

export const DEFAULT_LOCALE: SupportedLocale = "en";

export const SUPPORTED_LOCALES = Object.freeze(
  Object.keys(MESSAGE_LOADERS) as SupportedLocale[],
);

const RTL_LANGUAGES = new Set(["ar", "fa", "he", "ur", "yi"]);

export function resolveSupportedLocale(
  value: string | undefined,
): SupportedLocale | undefined {
  return matchLocale(value, SUPPORTED_LOCALES) as SupportedLocale | undefined;
}

export async function loadMessages(
  locale: SupportedLocale,
): Promise<IntlMessages> {
  const module = await MESSAGE_LOADERS[locale]();
  return module.default as IntlMessages;
}

export function localeLanguage(locale: string): string {
  const canonical = canonicalizeLocale(locale) ?? locale;
  try {
    return new Intl.Locale(canonical).language;
  } catch {
    return canonical.split("-")[0].toLowerCase();
  }
}

export function localeDirection(locale: string): "ltr" | "rtl" {
  return RTL_LANGUAGES.has(localeLanguage(locale)) ? "rtl" : "ltr";
}
