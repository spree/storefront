import type { Product } from "@spree/sdk";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  MarketplacePage,
  MarketplaceSection,
  MarketplaceSectionHeader,
} from "@/components/marketplace";
import { ProductCarousel } from "@/components/products/ProductCarousel";
import { RecommendationDismissibleCarousel } from "@/components/products/RecommendationDismissibleCarousel";
import { RecommendationListAnalytics } from "@/components/products/RecommendationListAnalytics";
import { Button } from "@/components/ui/button";
import type { RecommendationSurface } from "@/lib/analytics/recommendation-attribution";

export type RecommendationSource =
  | "similar"
  | "shop"
  | "trending"
  | "new"
  | "followed_shops";

interface ProductRecommendationRailProps {
  title: string;
  products: Product[];
  basePath: string;
  currency?: string;
  listId: string;
  listName: string;
  moreHref?: string;
  moreLabel?: string;
  variant?: "default" | "etsy";
  mobileSlidesPerView?: number;
  homeRailKey?: "recommended-for-you" | "similar-to-saved";
  dismissSurface?: string;
  dismissible?: boolean;
  analyticsSurface?: RecommendationSurface;
  personalized?: boolean;
  experiment?: string | null;
  suppressRelevanceReason?: boolean;
}

export async function ProductRecommendationRail({
  title,
  products,
  basePath,
  currency,
  listId,
  listName,
  moreHref,
  moreLabel,
  variant = "default",
  mobileSlidesPerView,
  homeRailKey,
  dismissSurface,
  dismissible = true,
  analyticsSurface,
  personalized = false,
  experiment,
  suppressRelevanceReason = false,
}: ProductRecommendationRailProps) {
  const recommendationClick =
    analyticsSurface != null
      ? {
          surface: analyticsSurface,
          listId,
          personalized,
          experiment,
        }
      : undefined;
  if (!products.length) return null;

  const t = await getTranslations("home");

  return (
    <MarketplaceSection
      className={variant === "etsy" ? "py-4 sm:py-5" : undefined}
      data-home-rail={homeRailKey}
    >
      <MarketplacePage>
        {analyticsSurface ? (
          <RecommendationListAnalytics
            products={products}
            listId={listId}
            listName={listName}
            currency={currency ?? "USD"}
            surface={analyticsSurface}
            personalized={personalized}
            experiment={experiment}
          />
        ) : null}
        <MarketplaceSectionHeader
          title={title}
          density={variant === "etsy" ? "home" : "default"}
          className={variant === "etsy" ? "mb-3" : undefined}
          action={
            moreHref ? (
              <Button variant="link" asChild>
                <Link href={moreHref}>{moreLabel ?? `${t("viewAll")} →`}</Link>
              </Button>
            ) : null
          }
        />
        {dismissible && (homeRailKey || dismissSurface || personalized) ? (
          <RecommendationDismissibleCarousel
            products={products}
            basePath={basePath}
            currency={currency}
            listId={listId}
            listName={listName}
            variant={variant}
            mobileSlidesPerView={mobileSlidesPerView}
            homeRailSection={homeRailKey}
            dismissSurface={
              dismissSurface ??
              (homeRailKey ? `home_rail:${homeRailKey}` : `rail:${listId}`)
            }
            recommendationClick={recommendationClick}
            suppressRelevanceReason={suppressRelevanceReason}
          />
        ) : (
          <ProductCarousel
            products={products}
            basePath={basePath}
            currency={currency}
            listId={listId}
            listName={listName}
            variant={variant}
            mobileSlidesPerView={mobileSlidesPerView}
            homeRailSection={homeRailKey}
            recommendationClick={recommendationClick}
            suppressRelevanceReason={suppressRelevanceReason}
          />
        )}
      </MarketplacePage>
    </MarketplaceSection>
  );
}
