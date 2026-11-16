import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  MarketplacePage,
  MarketplaceSection,
  MarketplaceSectionHeader,
} from "@/components/marketplace";

interface HomeTrustSectionProps {
  basePath: string;
  locale: string;
}

export async function HomeTrustSection({
  basePath,
  locale,
}: HomeTrustSectionProps) {
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "home",
  });

  return (
    <MarketplaceSection surface="warm">
      <MarketplacePage>
        <MarketplaceSectionHeader
          title={t("trustTitle")}
          description={t("trustDescription")}
          density="home"
        />
        <ul className="grid gap-4 sm:grid-cols-3">
          <li className="rounded-[var(--marketplace-radius-md)] border border-marketplace-border-subtle bg-marketplace-surface-elevated p-5">
            <h3 className="font-semibold">{t("trustIndependentTitle")}</h3>
            <p className="mt-2 text-sm text-marketplace-muted-foreground">
              {t("trustIndependentBody")}
            </p>
          </li>
          <li className="rounded-[var(--marketplace-radius-md)] border border-marketplace-border-subtle bg-marketplace-surface-elevated p-5">
            <h3 className="font-semibold">{t("trustPersonalizedTitle")}</h3>
            <p className="mt-2 text-sm text-marketplace-muted-foreground">
              {t("trustPersonalizedBody")}
            </p>
          </li>
          <li className="rounded-[var(--marketplace-radius-md)] border border-marketplace-border-subtle bg-marketplace-surface-elevated p-5">
            <h3 className="font-semibold">{t("trustConnectTitle")}</h3>
            <p className="mt-2 text-sm text-marketplace-muted-foreground">
              {t("trustConnectBody")}
            </p>
            <Link
              href={`${basePath}/policies/terms-of-service`}
              className="mt-3 inline-block text-sm font-medium text-marketplace-brand underline-offset-4 hover:underline"
            >
              {t("trustPoliciesLink")}
            </Link>
          </li>
        </ul>
      </MarketplacePage>
    </MarketplaceSection>
  );
}
