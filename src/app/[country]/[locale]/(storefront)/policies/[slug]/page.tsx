import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { cachedGetPolicy, getPolicy } from "@/lib/data/policies";
import {
  buildLocalizedAlternates,
  translationFingerprint,
} from "@/lib/metadata/alternates";
import { getStoreName, getStoreUrl } from "@/lib/store";

interface PolicyPageProps {
  params: Promise<{
    country: string;
    locale: string;
    slug: string;
  }>;
}

export async function generateMetadata({
  params,
}: PolicyPageProps): Promise<Metadata> {
  const { country, locale, slug } = await params;
  const policy = await getPolicy(slug, { country, locale });

  const storeName = getStoreName();

  if (!policy) {
    const t = await getTranslations({
      locale: locale as Locale,
      namespace: "policies",
    });
    return {
      title: t("policyNotFound"),
      description: t("noContent"),
    };
  }

  const description = `${policy.name} — ${storeName}`;
  const storeUrl = getStoreUrl();
  const localizedAlternates = storeUrl
    ? await buildLocalizedAlternates({
        storeUrl,
        country,
        locale,
        path: `/policies/${policy.slug}`,
        currentResourceFingerprint: policyTranslationFingerprint(policy),
        resolvePath: async (target) => {
          const localizedPolicy = await cachedGetPolicy(policy.id, target);
          return localizedPolicy
            ? {
                path: `/policies/${localizedPolicy.slug}`,
                fingerprint: policyTranslationFingerprint(localizedPolicy),
              }
            : undefined;
        },
      })
    : undefined;

  return {
    title: policy.name,
    description,
    ...(localizedAlternates
      ? {
          alternates: {
            canonical: localizedAlternates.canonical,
            languages: localizedAlternates.languages,
          },
        }
      : {}),
    openGraph: {
      title: policy.name,
      description,
      ...(localizedAlternates ? { url: localizedAlternates.canonical } : {}),
    },
  };
}

export default async function PolicyPage({
  params,
}: PolicyPageProps): Promise<React.JSX.Element> {
  const { country, slug, locale } = await params;
  const [policy, t] = await Promise.all([
    getPolicy(slug, { country, locale }),
    getTranslations({ locale: locale as Locale, namespace: "policies" }),
  ]);

  if (!policy) {
    notFound();
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">{policy.name}</h1>
      {policy.body_html ? (
        <div
          className="prose prose-gray"
          dangerouslySetInnerHTML={{ __html: policy.body_html }}
        />
      ) : policy.body ? (
        <div className="prose prose-gray whitespace-pre-wrap">
          {policy.body}
        </div>
      ) : (
        <p className="text-gray-500">{t("noContent")}</p>
      )}
    </div>
  );
}

function policyTranslationFingerprint(policy: {
  name: string;
  slug: string;
  body: string | null;
  body_html: string | null;
}): string {
  return translationFingerprint(
    policy.name,
    policy.slug,
    policy.body,
    policy.body_html,
  );
}
