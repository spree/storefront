import type { Collection } from "@spree/sdk";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { cachedGetCollection } from "@/lib/data/collections";
import {
  buildLocalizedAlternates,
  translationFingerprint,
} from "@/lib/metadata/alternates";
import { getStoreUrl } from "@/lib/store";

export interface CollectionMetadataParams {
  country: string;
  locale: string;
  permalink: string;
}

export async function generateCollectionMetadata({
  country,
  locale,
  permalink,
}: CollectionMetadataParams): Promise<Metadata> {
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "collections",
  });
  const collection = await cachedGetCollection(permalink, { country, locale });
  if (!collection) return { title: t("collectionNotFound") };

  const title = collection.meta_title || collection.name;
  const description =
    collection.meta_description ||
    collection.description?.slice(0, 160) ||
    t("metaDescription", { name: collection.name });
  const image = collection.image_url;

  // Permalinks are translatable, so each locale's alternate is resolved from
  // that locale's own record, and only genuinely translated ones are listed.
  const storeUrl = getStoreUrl();
  const localizedAlternates = storeUrl
    ? await buildLocalizedAlternates({
        storeUrl,
        country,
        locale,
        path: `/collections/${collection.permalink}`,
        currentResourceFingerprint:
          collectionTranslationFingerprint(collection),
        resolvePath: async (target) => {
          const localized = await cachedGetCollection(collection.id, {
            country: target.country,
            locale: target.locale,
          });
          if (!localized) return null;
          return {
            path: `/collections/${localized.permalink}`,
            fingerprint: collectionTranslationFingerprint(localized),
          };
        },
      })
    : undefined;

  return {
    title,
    description,
    ...(collection.meta_keywords ? { keywords: collection.meta_keywords } : {}),
    ...(localizedAlternates
      ? {
          alternates: {
            canonical: localizedAlternates.canonical,
            languages: localizedAlternates.languages,
          },
        }
      : {}),
    openGraph: {
      title,
      description,
      ...(localizedAlternates ? { url: localizedAlternates.canonical } : {}),
      type: "website",
      ...(image ? { images: [{ url: image, alt: collection.name }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

function collectionTranslationFingerprint(collection: Collection): string {
  return translationFingerprint(
    collection.name,
    collection.permalink,
    collection.description,
    collection.description_html,
    collection.meta_title,
    collection.meta_description,
    collection.meta_keywords,
  );
}
