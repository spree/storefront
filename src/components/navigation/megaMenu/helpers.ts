import type { StoreTaxon, StoreTaxonomy } from "@spree/sdk";
import type {
  MegaMenuConfig,
  MegaMenuItemConfig,
  NavItemChildren,
  NavItemTaxon,
  NavItemTaxonomy,
  ResolvedDisplay,
  TaxonWithChildren,
} from "./types";

/** Build a `basePath + "/t/" + permalink` link for a taxon */
export function taxonHref(basePath: string, taxon: StoreTaxon): string {
  return `${basePath}/t/${taxon.permalink}`;
}

/** Group flat taxons into parent → children hierarchy (depth 1 → depth 2) */
export function buildHierarchy(allTaxons: StoreTaxon[]): TaxonWithChildren[] {
  const topLevel = allTaxons.filter((t) => t.depth === 1);
  return topLevel.map((parent) => ({
    ...parent,
    subcategories: allTaxons
      .filter((t) => t.depth === 2 && t.parent_id === parent.id)
      .sort((a, b) => a.position - b.position),
  }));
}

/** Search across taxonomies and extra taxons for a featured taxon by slug */
export function findFeaturedTaxon(
  taxonomies: StoreTaxonomy[],
  extraTaxons: StoreTaxon[],
  slug: string,
): StoreTaxon | null {
  for (const taxonomy of taxonomies) {
    const found = taxonomy.taxons?.find((t) => t.permalink === slug);
    if (found) return found;
  }
  for (const taxon of extraTaxons) {
    if (taxon.permalink === slug) return taxon;
    const found = taxon.children?.find((t) => t.permalink === slug);
    if (found) return found;
  }
  return null;
}

/** Merge default config with per-taxonomy overrides */
export function resolveItemConfig(
  taxonomyName: string,
  config?: MegaMenuConfig,
): MegaMenuItemConfig {
  const base = config?.defaults ?? {};
  const override = config?.taxonomies?.[taxonomyName] ?? {};
  return { ...base, ...override };
}

/** Resolve final display settings with smart defaults */
export function resolveDisplay(
  itemConfig: MegaMenuItemConfig,
): ResolvedDisplay {
  const variant = itemConfig.variant ?? "grid";
  return {
    variant,
    showCategoryImages: itemConfig.showCategoryImages ?? variant === "grid",
    showSubcategoryImages: itemConfig.showSubcategoryImages ?? false,
    featuredTaxonSlug: itemConfig.featuredTaxonSlug ?? null,
  };
}

/** Extract child taxons and "view all" href from a dropdown NavItem */
export function getNavItemChildren(
  navItem: NavItemTaxonomy | NavItemTaxon,
  basePath: string,
): NavItemChildren {
  if (navItem.kind === "taxonomy") {
    const topLevel =
      navItem.taxonomy.taxons?.filter((t) => t.depth === 1) ?? [];
    return {
      topLevel,
      allTaxons: navItem.taxonomy.taxons ?? [],
      viewAllHref: `${basePath}/taxonomies`,
    };
  }
  const children = navItem.taxon?.children ?? [];
  return {
    topLevel: children,
    allTaxons: children,
    viewAllHref: taxonHref(basePath, navItem.taxon),
  };
}

/** Build a slug → StoreTaxon map from fetched extra taxons for safe lookup */
export function buildExtraTaxonMap(
  slugs: string[],
  taxons: StoreTaxon[],
): Map<string, StoreTaxon> {
  const map = new Map<string, StoreTaxon>();
  for (let i = 0; i < slugs.length && i < taxons.length; i++) {
    map.set(slugs[i], taxons[i]);
  }
  return map;
}
