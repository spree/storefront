import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { MarketplaceHomeHeroSearch } from "@/components/home/MarketplaceHomeHeroSearch";
import { SpreeIcon } from "@/components/icons";
import { MarketplacePage } from "@/components/marketplace";
import { Button } from "@/components/ui/button";
import { getMarketplaceHeroImageUrl } from "@/lib/marketplace-stock-images";

interface MarketplaceHomeEditorialHeroProps {
  basePath: string;
  locale: string;
}

export async function MarketplaceHomeEditorialHero({
  basePath,
  locale,
}: MarketplaceHomeEditorialHeroProps) {
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "home",
  });

  const desktopSrc = getMarketplaceHeroImageUrl("desktop");
  const mobileSrc = getMarketplaceHeroImageUrl("mobile");

  const trustItems = [
    t("marketplaceHeroTrustShops"),
    t("marketplaceHeroTrustSecure"),
    t("marketplaceHeroTrustGlobal"),
    t("marketplaceHeroTrustGifts"),
  ];

  return (
    <section
      className="relative overflow-hidden border-b border-marketplace-border-subtle bg-marketplace-canvas"
      data-testid="marketplace-home-hero"
      data-theme-section="home-editorial-hero"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_70%_-10%,color-mix(in_srgb,var(--marketplace-brand)_18%,transparent),transparent)]" />
      <MarketplacePage className="relative grid gap-8 py-8 md:grid-cols-[minmax(0,1fr)_minmax(280px,42%)] md:items-center md:py-12 lg:gap-12">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-marketplace-brand">
            {t("marketplaceHeroEyebrow")}
          </p>
          <h1 className="mt-3 max-w-[14ch] font-display text-[clamp(2rem,1.55rem+2vw,3.25rem)] font-semibold leading-[1.02] tracking-tight text-marketplace-foreground">
            {t("marketplaceHeroTitle")}
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-marketplace-muted-foreground md:text-base">
            {t("marketplaceHeroDescription")}
          </p>
          <MarketplaceHomeHeroSearch basePath={basePath} />
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              size="lg"
              className="h-9 rounded-full bg-marketplace-brand px-6 text-sm text-marketplace-brand-foreground hover:bg-marketplace-brand/90"
              asChild
            >
              <Link href={`${basePath}/products`}>
                {t("marketplaceHeroPrimaryCta")}
                <SpreeIcon name="forward" className="ml-1 size-4" aria-hidden />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-9 rounded-full border-marketplace-border bg-marketplace-surface px-6 text-sm text-marketplace-foreground hover:bg-marketplace-surface-elevated"
              asChild
            >
              <Link href={`${basePath}/shops`}>{t("viewAllShops")}</Link>
            </Button>
          </div>
          <ul className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-xs text-marketplace-muted-foreground">
            {trustItems.map((label) => (
              <li key={label} className="flex items-center gap-1.5">
                <span
                  className="size-1.5 shrink-0 rounded-full bg-marketplace-brand"
                  aria-hidden
                />
                {label}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative hidden min-h-[22rem] overflow-hidden rounded-[var(--marketplace-radius-lg,1rem)] border border-marketplace-border-subtle shadow-[0_24px_60px_-32px_rgba(28,25,23,0.35)] md:block">
          <Image
            src={desktopSrc}
            alt=""
            fill
            className="object-cover"
            sizes="(min-width: 768px) 42vw, 100vw"
            priority
          />
        </div>
        <div className="relative aspect-[16/10] overflow-hidden rounded-[var(--marketplace-radius-lg,1rem)] border border-marketplace-border-subtle md:hidden">
          <Image
            src={mobileSrc}
            alt=""
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
        </div>
      </MarketplacePage>
    </section>
  );
}
