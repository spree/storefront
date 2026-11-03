import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getCollections } from "@/lib/data/collections";

interface CollectionsPageProps {
  params: Promise<{ locale: string; country: string }>;
}

export async function generateMetadata({
  params,
}: CollectionsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "collections",
  });
  return { title: t("title"), description: t("description") };
}

export default async function CollectionsPage({
  params,
}: CollectionsPageProps) {
  const { country, locale } = await params;
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "collections",
  });
  const { data: collections } = await getCollections();
  const basePath = `/${country}/${locale}`;

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{t("title")}</h1>
        <p className="mt-2 text-gray-600">{t("description")}</p>
      </header>

      {collections.length > 0 ? (
        <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((collection) => (
            <Link
              key={collection.id}
              href={`${basePath}/collections/${collection.permalink}`}
              className="group block"
            >
              <div
                className="aspect-[4/3] bg-gray-100 bg-cover bg-center"
                style={
                  collection.image_url
                    ? { backgroundImage: `url(${collection.image_url})` }
                    : undefined
                }
              />
              <h2 className="mt-3 text-lg font-semibold text-gray-900 group-hover:underline">
                {collection.name}
              </h2>
              {collection.description && (
                <p className="mt-1 line-clamp-2 text-sm text-gray-600">
                  {collection.description}
                </p>
              )}
            </Link>
          ))}
        </div>
      ) : (
        <p className="py-12 text-center text-gray-600">{t("empty")}</p>
      )}
    </div>
  );
}
