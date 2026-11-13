export type CmsNavigationItemWire = {
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
  children?: CmsNavigationItemWire[];
};

export function cmsNavigationHref(
  item: CmsNavigationItemWire,
  basePath: string,
): string | null {
  if (item.enabled === false) return null;
  switch (item.type) {
    case "internal_link":
      return item.target?.startsWith("/") ? `${basePath}${item.target}` : null;
    case "external_link":
      return item.target || null;
    case "category":
      return item.category_id ? `${basePath}/c/${item.category_id}` : null;
    case "collection":
      return item.collection_id
        ? `${basePath}/collections/${item.collection_id}`
        : null;
    case "seller":
      return item.seller_id ? `${basePath}/sellers/${item.seller_id}` : null;
    case "cms_page":
      return item.cms_page_id ? `${basePath}/pages/${item.cms_page_id}` : null;
    default:
      return null;
  }
}
