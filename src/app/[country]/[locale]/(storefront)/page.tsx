import type { Metadata } from "next";
import { Suspense } from "react";
import { CollectionCarouselsSection } from "@/components/home/CollectionCarouselsSection";
import { HeroSection } from "@/components/home/HeroSection";
import { WholesaleSection } from "@/components/home/WholesaleSection";
import { ProductCarouselSkeleton } from "@/components/products/LazyProductCarousel";
import { resolveCurrency } from "@/lib/data/markets";
import { generateHomeMetadata } from "@/lib/metadata/home";

interface HomePageProps {
  params: Promise<{
    country: string;
    locale: string;
  }>;
}

export async function generateMetadata({
  params,
}: HomePageProps): Promise<Metadata> {
  const { country, locale } = await params;
  return generateHomeMetadata({ country, locale });
}

export default async function HomePage({ params }: HomePageProps) {
  const { country, locale } = await params;
  const basePath = `/${country}/${locale}`;
  const currency = await resolveCurrency(country);

  return (
    <div>
      <HeroSection basePath={basePath} locale={locale} />
      <Suspense
        fallback={
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <ProductCarouselSkeleton />
          </div>
        }
      >
        <CollectionCarouselsSection
          basePath={basePath}
          locale={locale}
          country={country}
          currency={currency}
        />
      </Suspense>
      <WholesaleSection basePath={basePath} locale={locale} />
    </div>
  );
}
