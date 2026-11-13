"use server";

import { getClient, getLocaleOptions } from "@/lib/spree";

export type CmsNavigationItem = {
  id: string;
  type: string;
  label: string;
  target?: string;
  category_id?: string;
  collection_id?: string;
  seller_id?: string;
  cms_page_id?: string;
  enabled?: boolean;
  icon?: string;
  highlight_style?: "pill" | "badge" | "underline" | "";
  highlight_tone?: "subtle" | "bold" | "";
  text_color?: string;
  background_color?: string;
  children?: CmsNavigationItem[];
  featured_panels?: CmsNavigationFeaturedPanel[];
};

export type CmsNavigationFeaturedPanel = {
  id: string;
  image_id?: string;
  image_url?: string;
  heading: string;
  text?: string;
  cta_label?: string;
  destination_type?:
    | "category"
    | "collection"
    | "internal_link"
    | "external_link";
  category_id?: string;
  collection_id?: string;
  target?: string;
  placement?: "right" | "bottom";
  desktop_visible?: boolean;
  mobile_visible?: boolean;
};

export type CmsNavigationPayload = {
  key: string;
  items: CmsNavigationItem[];
  settings?: {
    show_for_you?: boolean;
    search_shortcuts?: Array<{ id: string; label: string; query: string }>;
  };
};

export async function getPublishedNavigation(
  key: string,
): Promise<CmsNavigationPayload | null> {
  const options = await getLocaleOptions();
  try {
    const response = await getClient().request<{ data: CmsNavigationPayload }>(
      "GET",
      `/cms/navigations/${encodeURIComponent(key)}`,
      options,
    );
    return response.data ?? null;
  } catch {
    return null;
  }
}
