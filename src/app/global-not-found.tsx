import "./globals.css";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import StorefrontLayout from "@/app/[country]/[locale]/(storefront)/layout";
import { CountryLocaleProviders } from "@/app/[country]/[locale]/layout";
import { DocumentShell } from "@/components/layout/DocumentShell";
import { NotFoundContent } from "@/components/layout/NotFoundContent";
import {
  DEFAULT_LOCALE,
  loadMessages,
  resolveSupportedLocale,
} from "@/i18n/locales";
import { findMarketForCountry } from "@/i18n/markets";
import { REQUEST_PATHNAME_HEADER } from "@/i18n/routing";
import { getStorefrontMarkets } from "@/lib/data/markets";
import { getDefaultCountry, getDefaultLocale, getStoreName } from "@/lib/store";

/**
 * Served with a real 404 status for unmatched URLs and for products,
 * categories and policies the proxy found missing (see src/proxy.ts). Next.js
 * sets that status before rendering, which a page inside the streaming
 * [country]/[locale] layout cannot do, so this page renders the storefront
 * chrome itself. The country and language come from the original URL, which
 * the proxy forwards in a request header.
 */
async function getRequestContext() {
  const pathname = (await headers()).get(REQUEST_PATHNAME_HEADER) ?? "";
  const [, requestedCountry, requestedLocale] = pathname.split("/");
  const markets = await getStorefrontMarkets()
    .then((res) => res.data)
    .catch(() => []);
  const country =
    requestedCountry && findMarketForCountry(markets, requestedCountry)
      ? requestedCountry.toLowerCase()
      : getDefaultCountry();
  const locale =
    resolveSupportedLocale(requestedLocale) ??
    resolveSupportedLocale(getDefaultLocale()) ??
    DEFAULT_LOCALE;

  return { country, locale, markets };
}

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getRequestContext();
  const t = await getTranslations({ locale, namespace: "notFound" });
  return {
    title: `${t("title")} | ${getStoreName()}`,
    description: t("description"),
  };
}

export default function GlobalNotFound(): React.JSX.Element {
  return (
    <Suspense fallback={null}>
      <NotFoundDocument />
    </Suspense>
  );
}

async function NotFoundDocument(): Promise<React.JSX.Element> {
  const { country, locale, markets } = await getRequestContext();
  const messages = await loadMessages(locale);
  const basePath = `/${country}/${locale}`;

  return (
    <DocumentShell locale={locale}>
      <CountryLocaleProviders
        country={country}
        locale={locale}
        markets={markets}
        messages={messages}
      >
        <StorefrontLayout params={Promise.resolve({ country, locale })}>
          <NotFoundContent basePath={basePath} />
        </StorefrontLayout>
      </CountryLocaleProviders>
    </DocumentShell>
  );
}
