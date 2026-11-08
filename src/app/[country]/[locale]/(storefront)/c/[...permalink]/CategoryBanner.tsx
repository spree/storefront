import type { Category } from "@spree/sdk";
import { cacheLife, cacheTag } from "next/cache";
import Link from "next/link";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";

interface CategoryBannerProps {
  category: Category;
  basePath: string;
  locale: string;
}

export async function CategoryBanner({
  category,
  basePath,
  locale,
}: CategoryBannerProps) {
  "use cache: remote";
  cacheLife("minutes");
  cacheTag("category-banner");

  return (
    <>
      <div
        className={`flex flex-col justify-end bg-gray-50 bg-cover bg-center ${
          category.image_url ? "min-h-[350px]" : "pt-4"
        }`}
        style={
          category.image_url
            ? { backgroundImage: `url(${category.image_url})` }
            : undefined
        }
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumbs
            category={category}
            basePath={basePath}
            locale={locale}
          />

          <div className="mb-4">
            <h1 className="text-4xl font-bold text-gray-900">
              {category.name}
            </h1>
          </div>

          {/* Description */}
          {category.description && (
            <p className="mb-4 text-gray-600">{category.description}</p>
          )}
        </div>
      </div>

      {/* Subcategories */}
      {category.children && category.children.length > 0 && (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="flex flex-wrap gap-2 items-center border-b border-gray-100 pb-4">
            {category.children.map((child) => (
              <Link
                key={child.id}
                href={`${basePath}/c/${child.permalink}`}
                className="px-1.5 py-1 hover:bg-gray-100 rounded-lg text-gray-700 transition-colors"
              >
                {child.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
