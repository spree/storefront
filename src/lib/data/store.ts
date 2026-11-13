import type { Store } from "@spree/sdk";
import { cacheLife, cacheTag } from "next/cache";
import { cache } from "react";
import { DEFAULT_LOCALE, resolveSupportedLocale } from "@/i18n/locales";
import { getClient } from "@/lib/spree";
import { FALLBACK_STORE_NAME, getDefaultLocale } from "@/lib/store";

async function cachedGetStore(locale: string): Promise<Store> {
  "use cache: remote";
  cacheLife("hours");
  cacheTag("store");
  return getClient().store.get({ locale });
}

/**
 * The current store's name and default SEO metadata, translated into
 * `locale` (the Store API falls back to the store's default locale for
 * missing translations). Never throws: an API outage degrades to the
 * fallback name rather than taking down every page's chrome and metadata.
 */
export const getStore = cache(async (locale?: string): Promise<Store> => {
  const resolvedLocale =
    resolveSupportedLocale(locale ?? getDefaultLocale()) ?? DEFAULT_LOCALE;
  try {
    return await cachedGetStore(resolvedLocale);
  } catch (error) {
    console.error("getStore: failed to load the current store", error);
    return {
      id: "",
      name: FALLBACK_STORE_NAME,
      seo_title: null,
      meta_description: null,
    };
  }
});

/** The `<title>` for the store: its SEO title, else its name. */
export function storeSeoTitle(store: Store): string {
  return store.seo_title || store.name;
}
