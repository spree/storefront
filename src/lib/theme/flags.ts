/**
 * Minted-inspired Made & Found presentation. Toggle via `STOREFRONT_PRESENTATION=editorial`
 * in `storefront/.env.local` (unset or `classic` restores the prior default homepage chrome).
 */
function normalizePresentationFlag(raw?: string): string | undefined {
  return raw?.trim().toLowerCase() || undefined;
}

export function editorialStorefrontEnabled(): boolean {
  const value =
    normalizePresentationFlag(process.env.STOREFRONT_PRESENTATION) ||
    normalizePresentationFlag(process.env.NEXT_PUBLIC_STOREFRONT_PRESENTATION);
  if (!value || value === "classic" || value === "default") return false;
  return value === "editorial" || value === "minted";
}

export function themeTemplateHomeEnabled(): boolean {
  const values = [
    process.env.THEME_TEMPLATE_HOME_ENABLED,
    process.env.CMS_HOMEPAGE_ENABLED,
  ].map((value) => value?.toLowerCase());
  if (values.some((value) => value === "0" || value === "false")) return false;
  return true;
}

export function themeTemplateProductEnabled(): boolean {
  return enabledUnlessDisabled(process.env.THEME_TEMPLATE_PRODUCT_ENABLED);
}

export function themeTemplateSellerEnabled(): boolean {
  return enabledUnlessDisabled(process.env.THEME_TEMPLATE_SELLER_ENABLED);
}

export function themeTemplateCollectionEnabled(): boolean {
  return enabledUnlessDisabled(process.env.THEME_TEMPLATE_COLLECTION_ENABLED);
}

export function themeTemplateCategoryEnabled(): boolean {
  return enabledUnlessDisabled(process.env.THEME_TEMPLATE_CATEGORY_ENABLED);
}

export function themeTemplatePageEnabled(): boolean {
  return enabledUnlessDisabled(process.env.THEME_TEMPLATE_PAGE_ENABLED);
}

export function themeSectionGroupsEnabled(): boolean {
  return enabledUnlessDisabled(process.env.THEME_SECTION_GROUPS_ENABLED);
}

function enabledUnlessDisabled(value?: string): boolean {
  const normalized = value?.toLowerCase();
  return normalized !== "0" && normalized !== "false";
}
