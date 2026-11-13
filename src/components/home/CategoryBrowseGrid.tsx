import type { Category } from "@spree/sdk";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  MarketplacePage,
  MarketplaceSection,
  MarketplaceSectionHeader,
} from "@/components/marketplace";
import { ProductImage } from "@/components/ui/product-image";
import { resolveCatalogImageUrl } from "@/lib/marketplace-stock-images";

interface CategoryBrowseGridProps {
  categories: Category[];
  basePath: string;
  locale: string;
}

export async function CategoryBrowseGrid({
  categories,
  basePath,
  locale,
}: CategoryBrowseGridProps) {
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "home",
  });

  if (!categories.length) return null;

  const items = categories.slice(0, 8).map((category, index) => ({
    id: category.id,
    name: category.name,
    href: `${basePath}/c/${category.permalink}`,
    imageUrl: resolveCatalogImageUrl(category.image_url, index),
  }));

  return (
    <MarketplaceSection
      surface="none"
      className="py-5 md:py-8"
      data-theme-section="category_grid"
    >
      <MarketplacePage>
        <MarketplaceSectionHeader
          title={t("featuredInterestsTitle")}
          density="home"
        />
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
          {items.map((category, index) => (
            <li key={category.id}>
              <Link href={category.href} className="group block">
                <span className="relative block aspect-[4/5] overflow-hidden rounded-xl bg-marketplace-muted ring-1 ring-marketplace-border-subtle transition group-hover:ring-marketplace-brand">
                  <ProductImage
                    src={category.imageUrl}
                    alt=""
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    iconClassName="size-10"
                    fetchPriority={index < 4 ? "high" : undefined}
                  />
                </span>
                <span className="mt-2 line-clamp-2 text-sm font-semibold leading-snug text-marketplace-foreground group-hover:text-marketplace-brand">
                  {category.name}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </MarketplacePage>
    </MarketplaceSection>
  );
}
