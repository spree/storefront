import type { Metadata } from "next";
import Link from "next/link";
import { CheckIcon, LightningBoltIcon, SupportIcon } from "@/components/icons";
import { ProductCarousel } from "@/components/products/ProductCarousel";
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

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Welcome to Spree Store
            </h1>
            <p className="mt-4 text-xl text-primary-100 max-w-2xl mx-auto">
              Discover amazing products with our modern e-commerce experience
              powered by Spree Commerce.
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <Link
                href={`${basePath}/products`}
                className="bg-white text-primary-500 px-6 py-3 rounded-xl font-medium hover:bg-primary-50 transition-colors"
              >
                Shop Now
              </Link>
              <Link
                href={`${basePath}/taxonomies`}
                className="border border-white text-white px-6 py-3 rounded-xl font-medium hover:bg-white/10 transition-colors"
              >
                Browse Categories
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-900">
            Featured Products
          </h2>
          <Link
            href={`${basePath}/products`}
            className="text-primary-500 hover:text-primary-700 font-medium"
          >
            View all &rarr;
          </Link>
        </div>
        <ProductCarousel basePath={basePath} />
      </section>

      {/* Features Section */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary-100 text-primary-500 rounded-xl flex items-center justify-center mx-auto">
                <CheckIcon className="w-6 h-6" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                Quality Products
              </h3>
              <p className="mt-2 text-gray-500">
                Carefully curated selection of the best products.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary-100 text-primary-500 rounded-xl flex items-center justify-center mx-auto">
                <LightningBoltIcon className="w-6 h-6" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                Fast Shipping
              </h3>
              <p className="mt-2 text-gray-500">
                Quick and reliable delivery to your doorstep.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary-100 text-primary-500 rounded-xl flex items-center justify-center mx-auto">
                <SupportIcon className="w-6 h-6" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                24/7 Support
              </h3>
              <p className="mt-2 text-gray-500">
                Our team is here to help you anytime.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
