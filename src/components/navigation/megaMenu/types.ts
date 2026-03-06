import type { StoreTaxon, StoreTaxonomy } from "@spree/sdk";

export interface MegaMenuItemConfig {
  variant?: "grid" | "columns";
  featuredTaxonSlug?: string;
  showCategoryImages?: boolean;
  showSubcategoryImages?: boolean;
}

export interface MegaMenuTaxonItem {
  type: "taxon";
  label?: string;
  slug: string;
  config?: MegaMenuItemConfig;
}

export interface MegaMenuLinkItem {
  type: "link";
  label: string;
  href: string;
}

export type MegaMenuItem = MegaMenuTaxonItem | MegaMenuLinkItem;

export interface MegaMenuConfig {
  defaults?: MegaMenuItemConfig;
  taxonomies?: Record<string, MegaMenuItemConfig>;
  extraItems?: MegaMenuItem[];
}

export interface MegaMenuProps {
  basePath: string;
  config?: MegaMenuConfig;
}

export interface TaxonWithChildren extends StoreTaxon {
  subcategories: StoreTaxon[];
}

export interface ResolvedDisplay {
  variant: "grid" | "columns";
  showCategoryImages: boolean;
  showSubcategoryImages: boolean;
  featuredTaxonSlug: string | null;
}

export interface NavItemTaxonomy {
  kind: "taxonomy";
  key: string;
  label: string;
  taxonomy: StoreTaxonomy;
  display: ResolvedDisplay;
}

export interface NavItemTaxon {
  kind: "taxon";
  key: string;
  label: string;
  taxon: StoreTaxon;
  display: ResolvedDisplay;
}

export interface NavItemLink {
  kind: "link";
  key: string;
  label: string;
  href: string;
}

export type NavItem = NavItemTaxonomy | NavItemTaxon | NavItemLink;

export interface NavItemChildren {
  topLevel: StoreTaxon[];
  allTaxons: StoreTaxon[];
  viewAllHref: string;
}
