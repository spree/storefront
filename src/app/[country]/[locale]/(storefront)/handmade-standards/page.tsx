import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale: locale as "en" | "de" | "es" | "fr" | "pl",
    namespace: "products.handmadeStandards",
  });
  return {
    title: t("title"),
    description: t("intro"),
  };
}

export default async function HandmadeStandardsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({
    locale: locale as "en" | "de" | "es" | "fr" | "pl",
    namespace: "products.handmadeStandards",
  });
  const sections = [
    ["makerTitle", "makerBody"],
    ["productTitle", "productBody"],
    ["partnerTitle", "partnerBody"],
    ["resaleTitle", "resaleBody"],
    ["reportTitle", "reportBody"],
  ] as const;

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10">
      <h1 className="font-display text-3xl font-semibold text-marketplace-foreground">
        {t("title")}
      </h1>
      <p className="mt-4 text-base leading-relaxed text-marketplace-muted-foreground">
        {t("intro")}
      </p>
      <div className="mt-8 space-y-8">
        {sections.map(([titleKey, bodyKey]) => (
          <section key={titleKey}>
            <h2 className="text-xl font-semibold text-marketplace-foreground">
              {t(titleKey)}
            </h2>
            <p className="mt-2 leading-relaxed text-marketplace-muted-foreground">
              {t(bodyKey)}
            </p>
          </section>
        ))}
      </div>
    </main>
  );
}
