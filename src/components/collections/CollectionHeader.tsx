import type { Collection } from "@spree/sdk";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

interface CollectionHeaderProps {
  collection: Collection;
  basePath: string;
  locale: Locale;
}

/** Banner image, breadcrumb, name and description of a collection page. */
export async function CollectionHeader({
  collection,
  basePath,
  locale,
}: CollectionHeaderProps): Promise<React.JSX.Element> {
  const t = await getTranslations({ locale, namespace: "collections" });

  return (
    <div
      className="flex flex-col justify-end min-h-[350px] bg-gray-50 bg-cover bg-center"
      style={
        collection.image_url
          ? { backgroundImage: `url(${collection.image_url})` }
          : undefined
      }
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="mb-4">
          <ol className="flex items-center gap-1 text-sm text-gray-500">
            <li>
              <Link
                href={`${basePath}/collections`}
                className="hover:underline"
              >
                {t("allCollections")}
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="h-4 w-4" />
            </li>
            <li aria-current="page" className="text-gray-900">
              {collection.name}
            </li>
          </ol>
        </nav>

        <h1 className="mb-4 text-4xl font-bold text-gray-900">
          {collection.name}
        </h1>

        {collection.description_html ? (
          <div
            className="prose prose-gray mb-4 max-w-3xl"
            // Rich text is sanitized by Spree when it is saved.
            dangerouslySetInnerHTML={{ __html: collection.description_html }}
          />
        ) : (
          collection.description && (
            <p className="mb-4 max-w-3xl text-gray-600">
              {collection.description}
            </p>
          )
        )}
      </div>
    </div>
  );
}
