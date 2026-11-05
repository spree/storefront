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
  // Over a merchant image the text goes light on a dark scrim, so it stays
  // readable whatever the image looks like.
  const hasImage = Boolean(collection.image_url);

  return (
    <div
      className="relative flex flex-col justify-end min-h-[350px] bg-gray-50 bg-cover bg-center"
      style={
        hasImage
          ? { backgroundImage: `url(${collection.image_url})` }
          : undefined
      }
    >
      {hasImage && (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/10"
        />
      )}
      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="mb-4">
          <ol
            className={`flex items-center gap-1 text-sm ${hasImage ? "text-white/80" : "text-gray-500"}`}
          >
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
            <li
              aria-current="page"
              className={hasImage ? "text-white" : "text-gray-900"}
            >
              {collection.name}
            </li>
          </ol>
        </nav>

        <h1
          className={`mb-4 text-4xl font-bold ${hasImage ? "text-white" : "text-gray-900"}`}
        >
          {collection.name}
        </h1>

        {collection.description_html ? (
          <div
            className={`prose mb-4 max-w-3xl ${hasImage ? "prose-invert" : "prose-gray"}`}
            // Rich text is sanitized by Spree when it is saved.
            dangerouslySetInnerHTML={{ __html: collection.description_html }}
          />
        ) : (
          collection.description && (
            <p
              className={`mb-4 max-w-3xl ${hasImage ? "text-white/90" : "text-gray-600"}`}
            >
              {collection.description}
            </p>
          )
        )}
      </div>
    </div>
  );
}
