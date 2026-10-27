import "./globals.css";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DocumentShell } from "@/components/layout/DocumentShell";
import { Button } from "@/components/ui/button";
import { DEFAULT_LOCALE, resolveSupportedLocale } from "@/i18n/locales";
import { getDefaultLocale, getStoreName } from "@/lib/store";

/**
 * Served with a real 404 status for unmatched URLs and for products,
 * categories and policies the proxy found missing (see src/proxy.ts). It
 * renders outside the [country]/[locale] layout, so it uses the store's
 * default language. Its links are plain anchors so the request goes through
 * the proxy, which sends each visitor to their own country and language.
 */
const locale = resolveSupportedLocale(getDefaultLocale()) ?? DEFAULT_LOCALE;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "notFound" });
  return {
    title: `${t("title")} | ${getStoreName()}`,
    description: t("description"),
  };
}

export default async function GlobalNotFound(): Promise<React.JSX.Element> {
  const t = await getTranslations({ locale, namespace: "notFound" });

  return (
    <DocumentShell locale={locale}>
      <header className="border-b border-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <a href="/" className="text-xl font-bold text-gray-900">
            {getStoreName()}
          </a>
        </div>
      </header>
      <main className="flex-1 flex items-center">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          <p className="text-sm font-semibold text-gray-500">404</p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900 sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-4 text-gray-600">{t("description")}</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button asChild>
              <a href="/">{t("backHome")}</a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/products">{t("browseProducts")}</a>
            </Button>
          </div>
        </div>
      </main>
    </DocumentShell>
  );
}
