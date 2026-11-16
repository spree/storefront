import type { CmsTheme, ThemeTemplatePayload } from "@spree/sdk";
import { cacheLife, cacheTag } from "next/cache";
import { cache } from "react";
import { getClient, getLocaleOptions } from "@/lib/spree";
import { PUBLISHED_THEME_CACHE_TAG } from "@/lib/theme/published-cache";

async function readPublishedTheme(country?: string, locale?: string) {
  "use cache: remote";
  cacheLife({ stale: 0, revalidate: 30, expire: 60 });
  cacheTag(PUBLISHED_THEME_CACHE_TAG);

  const response = await getClient().request<{ data: CmsTheme }>(
    "GET",
    "/theme",
    { country, locale },
  );
  return response.data;
}

async function loadPublishedTheme(): Promise<CmsTheme | null> {
  const { country, locale } = await getLocaleOptions();
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await readPublishedTheme(country, locale);
    } catch (error) {
      lastError = error;
    }
  }
  if (process.env.NODE_ENV === "development") {
    console.warn("[theme] Published theme could not be loaded", lastError);
  }
  return null;
}

export const getActiveTheme = cache(loadPublishedTheme);

async function readPublishedHomeTemplate(country?: string, locale?: string) {
  "use cache: remote";
  cacheLife({ stale: 0, revalidate: 30, expire: 60 });
  cacheTag(PUBLISHED_THEME_CACHE_TAG);

  const response = await getClient().request<{ data: ThemeTemplatePayload }>(
    "GET",
    "/theme/templates/home/default",
    { country, locale },
  );
  return response.data;
}

const getResolvedTemplateCached = cache(
  async (
    templateType: string,
    templateKey: string,
    resourceType: string,
    resourceId: string,
  ): Promise<ThemeTemplatePayload | null> => {
    const options = await getLocaleOptions();
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        if (
          templateType === "home" &&
          templateKey === "default" &&
          !resourceType &&
          !resourceId
        ) {
          return await readPublishedHomeTemplate(
            options.country,
            options.locale,
          );
        }
        const requestOptions = {
          ...options,
          resource_type: resourceType || undefined,
          resource_id: resourceId || undefined,
        };
        const query = new URLSearchParams();
        if (requestOptions.resource_type)
          query.set("resource_type", requestOptions.resource_type);
        if (requestOptions.resource_id)
          query.set("resource_id", requestOptions.resource_id);
        const suffix = query.toString() ? `?${query.toString()}` : "";
        const response = await getClient().request<{
          data: ThemeTemplatePayload;
        }>(
          "GET",
          `/theme/templates/${encodeURIComponent(templateType)}/${encodeURIComponent(templateKey)}${suffix}`,
          options,
        );
        return response.data;
      } catch {
        // Retry once when the API is slow to answer.
      }
    }
    return null;
  },
);

export async function getResolvedTemplate(params: {
  templateType: string;
  templateKey?: string;
  resourceType?: string;
  resourceId?: string;
}): Promise<ThemeTemplatePayload | null> {
  return getResolvedTemplateCached(
    params.templateType,
    params.templateKey || "default",
    params.resourceType ?? "",
    params.resourceId ?? "",
  );
}

export function themeGroupHasContent(document?: { order?: string[] }): boolean {
  return Boolean(document?.order?.length);
}

/** True when a seller template document includes the seller storefront body. */
export function themeTemplateHasSellerMain(document?: {
  order?: string[];
  sections?: Record<string, { type?: string }>;
}): boolean {
  if (!document?.order?.length || !document.sections) return false;
  return document.order.some((sectionId) => {
    const section = document.sections?.[sectionId];
    return section?.type === "seller_main";
  });
}
