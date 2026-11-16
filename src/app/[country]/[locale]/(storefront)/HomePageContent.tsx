import { connection } from "next/server";
import { Suspense } from "react";
import { MarketplaceHomeEditorialHero } from "@/components/home/MarketplaceHomeEditorialHero";
import { MarketplaceHomeSections } from "@/components/home/MarketplaceHomeSections";
import styles from "@/components/theme/editorial-storefront.module.css";
import { ThemePageRenderer } from "@/components/theme/ThemePageRenderer";
import { ThemeTemplateRenderer } from "@/components/theme/ThemeTemplateRenderer";
import { resolveCurrency } from "@/lib/data/markets";
import { getMerchandisingPlacements } from "@/lib/data/merchandising";
import { getHomePersonalizationComposition } from "@/lib/data/storefront-personalization";
import { applyHomePersonalization } from "@/lib/theme/apply-home-composition";
import { editorialHomeDocument } from "@/lib/theme/editorial-home";
import {
  editorialStorefrontEnabled,
  themeTemplateHomeEnabled,
} from "@/lib/theme/flags";
import {
  getActiveTheme,
  getResolvedTemplate,
  themeGroupHasContent,
} from "@/lib/theme/resolver";
import type { HomeMerchandisingContext } from "@/lib/theme/types";

async function loadHomeMerchandising(country: string) {
  const [currency, placements] = await Promise.all([
    resolveCurrency(country),
    getMerchandisingPlacements({ surface: "homepage" }),
  ]);
  return { currency, placements };
}

export async function HomePageContent({
  country,
  locale,
  basePath,
  previewPersona,
}: {
  country: string;
  locale: string;
  basePath: string;
  previewPersona?: string;
}) {
  await connection();

  const useTemplate = themeTemplateHomeEnabled();
  const isEditorial = editorialStorefrontEnabled();
  let merchandising: Promise<HomeMerchandisingContext> | undefined;
  const loadMerchandising = async () => {
    if (!useTemplate && isEditorial) {
      // The parent layout uses this same request to reveal the campaign.
      await getActiveTheme().catch(() => null);
    }
    return loadHomeMerchandising(country);
  };
  const homeMerchandising = () => (merchandising ??= loadMerchandising());
  const [composition, theme, template] = await Promise.all([
    useTemplate ? getHomePersonalizationComposition(previewPersona) : null,
    useTemplate ? getActiveTheme() : null,
    useTemplate
      ? getResolvedTemplate({ templateType: "home", templateKey: "default" })
      : null,
  ]);
  if (theme && template?.data && themeGroupHasContent(template.data)) {
    const personalized = applyHomePersonalization({
      template,
      composition,
    });
    return (
      <div
        className="bg-marketplace-background"
        data-composition-version={personalized.contextExtras.compositionVersion}
      >
        <ThemePageRenderer
          theme={theme}
          template={personalized.template}
          homeMerchandising={homeMerchandising}
          context={{
            kind: "home",
            basePath,
            locale,
            country,
            ...personalized.contextExtras,
          }}
        />
      </div>
    );
  }

  if (isEditorial) {
    return (
      <div className={styles.home} data-storefront-presentation="editorial">
        <ThemeTemplateRenderer
          data={editorialHomeDocument(basePath)}
          context={{
            kind: "home",
            basePath,
            locale,
            country,
          }}
          homeMerchandising={homeMerchandising}
        />
      </div>
    );
  }

  return (
    <div className="bg-marketplace-background">
      <MarketplaceHomeEditorialHero basePath={basePath} locale={locale} />
      <Suspense fallback={<div className="min-h-svh" aria-hidden="true" />}>
        <LegacyHomeSections
          basePath={basePath}
          locale={locale}
          country={country}
        />
      </Suspense>
    </div>
  );
}

async function LegacyHomeSections({
  basePath,
  locale,
  country,
}: Pick<
  Parameters<typeof HomePageContent>[0],
  "basePath" | "locale" | "country"
>) {
  const { currency, placements } = await loadHomeMerchandising(country);
  return (
    <MarketplaceHomeSections
      basePath={basePath}
      locale={locale}
      country={country}
      currency={currency}
      placements={placements}
    />
  );
}
