import Image from "next/image";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { getTaxon } from "@/lib/data/taxonomies";
import { CategoryProductsContent } from "./CategoryProductsContent";

export const revalidate = 60;

interface CategoryPageProps {
  params: Promise<{
    country: string;
    locale: string;
    permalink: string[];
  }>;
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { country, locale, permalink } = await params;
  const fullPermalink = permalink.join("/");
  const basePath = `/${country}/${locale}`;

  let taxon;
  try {
    taxon = await getTaxon(fullPermalink, { includes: "ancestors,children" });
  } catch (error) {
    console.error("Failed to fetch taxon:", error);
    notFound();
  }

  if (!taxon) {
    notFound();
  }

  return (
    <div>
      {/* Banner Image */}
      {taxon.image_url && (
        <div className="relative w-full h-48 md:h-64 lg:h-80 bg-gray-100">
          <Image
            src={taxon.image_url}
            alt={taxon.name}
            fill
            preload
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-black/30" />
          <div className="absolute inset-0 flex items-center justify-center">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white drop-shadow-lg">
              {taxon.name}
            </h1>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs taxon={taxon} basePath={basePath} />

        {/* Title (only if no banner) */}
        {!taxon.image_url && (
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">{taxon.name}</h1>
          </div>
        )}

        {/* Description */}
        {taxon.description && (
          <p className="mb-8 text-gray-600">{taxon.description}</p>
        )}

        {/* Subcategories */}
        {taxon.children && taxon.children.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Subcategories
            </h2>
            <div className="flex flex-wrap gap-2">
              {taxon.children.map((child) => (
                <a
                  key={child.id}
                  href={`${basePath}/t/${child.permalink}`}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-700 transition-colors"
                >
                  {child.name}
                  {child.children_count > 0 && (
                    <span className="ml-1 text-gray-400">
                      ({child.children_count})
                    </span>
                  )}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Products */}
        <CategoryProductsContent
          taxonPermalink={fullPermalink}
          taxonId={taxon.id}
          taxonName={taxon.name}
          basePath={basePath}
        />
      </div>
    </div>
  );
}
