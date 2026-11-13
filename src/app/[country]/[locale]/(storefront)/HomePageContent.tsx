import { connection } from "next/server";
import { MarketplaceHomeEditorialHero } from "@/components/home/MarketplaceHomeEditorialHero";
import { MarketplaceHomeSections } from "@/components/home/MarketplaceHomeSections";
import { ThemePageRenderer } from "@/components/theme/ThemePageRenderer";
import { resolveCurrency } from "@/lib/data/markets";
import { getMerchandisingPlacements } from "@/lib/data/merchandising";
import { getHomePersonalizationComposition } from "@/lib/data/storefront-personalization";
import { applyHomePersonalization } from "@/lib/theme/apply-home-composition";
import { themeTemplateHomeEnabled } from "@/lib/theme/flags";
import {
  getActiveTheme,
  getResolvedTemplate,
  themeGroupHasContent,
} from "@/lib/theme/resolver";
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

  const [currency, placements, composition] = await Promise.all([
    resolveCurrency(country),
    getMerchandisingPlacements({ surface: "homepage" }),
    getHomePersonalizationComposition(previewPersona),
  ]);
  if (themeTemplateHomeEnabled()) {
    const [theme, template] = await Promise.all([
      getActiveTheme(),
      getResolvedTemplate({ templateType: "home", templateKey: "default" }),
    ]);
    const templateData = template?.data;
    if (theme && templateData && themeGroupHasContent(templateData)) {
      const personalized = applyHomePersonalization({
        template,
        composition,
      });
      return (
        <div
          className="bg-marketplace-background"
          data-composition-version={
            personalized.contextExtras.compositionVersion
          }
        >
          <ThemePageRenderer
            theme={theme}
            template={personalized.template}
            context={{
              kind: "home",
              basePath,
              locale,
              country,
              currency,
              placements,
              ...personalized.contextExtras,
            }}
          />
        </div>
      );
    }
  }

  return (
    <div className="bg-marketplace-background">
      <MarketplaceHomeEditorialHero basePath={basePath} locale={locale} />
      <MarketplaceHomeSections
        basePath={basePath}
        locale={locale}
        country={country}
        currency={currency}
        placements={placements}
      />
    </div>
  );
}
