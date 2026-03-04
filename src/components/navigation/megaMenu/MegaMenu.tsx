"use client";

import type { StoreTaxon, StoreTaxonomy } from "@spree/sdk";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDownIcon, MenuIcon } from "@/components/icons";
import { useDismiss } from "@/hooks/useDismiss";
import { getTaxon, getTaxonomies } from "@/lib/data/taxonomies";
import {
  buildExtraTaxonMap,
  buildHierarchy,
  findFeaturedTaxon,
  getNavItemChildren,
  resolveDisplay,
  resolveItemConfig,
} from "./helpers";
import { ColumnLayout, FeaturedTaxonCard, GridLayout } from "./Layouts";
import { MobileDrawer } from "./MobileDrawer";
import type {
  MegaMenuProps,
  MegaMenuTaxonItem,
  NavItem,
  NavItemLink,
  NavItemTaxon,
  ResolvedDisplay,
} from "./types";
import { useOverflowDetection } from "./useOverflowDetection";

const CLOSE_DELAY_MS = 150;

interface DropdownPanelProps {
  label: string;
  taxons: StoreTaxon[];
  allTaxons: StoreTaxon[];
  basePath: string;
  display: ResolvedDisplay;
  taxonomies: StoreTaxonomy[];
  extraTaxons: StoreTaxon[];
  viewAllHref: string;
}

function DropdownPanel({
  label,
  taxons,
  allTaxons,
  basePath,
  display,
  taxonomies,
  extraTaxons,
  viewAllHref,
}: DropdownPanelProps) {
  const featuredTaxon = display.featuredTaxonSlug
    ? findFeaturedTaxon(taxonomies, extraTaxons, display.featuredTaxonSlug)
    : null;

  return (
    <div
      className="fixed left-0 right-0 top-16 bg-white border-t border-gray-200 shadow-lg z-50"
      role="menu"
      aria-label={label}
    >
      <div className="max-w-7xl mx-auto p-6">
        <div className={featuredTaxon ? "flex gap-8" : ""}>
          <div className={featuredTaxon ? "flex-1 min-w-0" : ""}>
            {display.variant === "grid" ? (
              <GridLayout
                taxons={taxons}
                basePath={basePath}
                showImages={display.showCategoryImages}
              />
            ) : (
              <ColumnLayout
                taxonsWithChildren={buildHierarchy(allTaxons)}
                basePath={basePath}
                showCategoryImages={display.showCategoryImages}
                showSubcategoryImages={display.showSubcategoryImages}
              />
            )}
          </div>

          {featuredTaxon && (
            <div className="w-64 flex-shrink-0">
              <FeaturedTaxonCard taxon={featuredTaxon} basePath={basePath} />
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 text-center">
          <Link
            href={viewAllHref}
            className="text-sm text-primary-500 hover:text-primary-700 font-medium transition-colors"
          >
            View all {label.toLowerCase()}
          </Link>
        </div>
      </div>
    </div>
  );
}

interface DesktopNavDropdownProps {
  navItem: NavItem & { kind: "taxonomy" | "taxon" };
  index: number;
  isActive: boolean;
  basePath: string;
  taxonomies: StoreTaxonomy[];
  extraTaxons: StoreTaxon[];
  onMouseEnter: (index: number) => void;
  onMouseLeave: () => void;
}

function DesktopNavDropdown({
  navItem,
  index,
  isActive,
  basePath,
  taxonomies,
  extraTaxons,
  onMouseEnter,
  onMouseLeave,
}: DesktopNavDropdownProps) {
  const {
    topLevel: taxons,
    allTaxons,
    viewAllHref,
  } = useMemo(() => getNavItemChildren(navItem, basePath), [navItem, basePath]);

  return (
    <div onMouseEnter={() => onMouseEnter(index)} onMouseLeave={onMouseLeave}>
      <Link
        href={viewAllHref}
        className={`flex items-center gap-1 py-5 text-sm font-medium transition-colors ${
          isActive ? "text-gray-900" : "text-gray-600 hover:text-gray-900"
        }`}
        aria-expanded={isActive}
        aria-haspopup="true"
      >
        {navItem.label}
        <ChevronDownIcon
          className={`w-4 h-4 transition-transform ${isActive ? "rotate-180" : ""}`}
        />
      </Link>

      {isActive && taxons.length > 0 && (
        <DropdownPanel
          label={navItem.label}
          taxons={taxons}
          allTaxons={allTaxons}
          basePath={basePath}
          display={navItem.display}
          taxonomies={taxonomies}
          extraTaxons={extraTaxons}
          viewAllHref={viewAllHref}
        />
      )}
    </div>
  );
}

export function MegaMenu({ basePath, config }: MegaMenuProps) {
  const [taxonomies, setTaxonomies] = useState<StoreTaxonomy[]>([]);
  const [extraTaxonMap, setExtraTaxonMap] = useState<Map<string, StoreTaxon>>(
    new Map(),
  );
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(),
  );
  const measureRef = useRef<HTMLElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();
  const prevPathnameRef = useRef(pathname);

  const extraTaxonSlugs = useMemo(
    () =>
      config?.extraItems
        ?.filter((item): item is MegaMenuTaxonItem => item.type === "taxon")
        .map((item) => item.slug) ?? [],
    [config?.extraItems],
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [taxonomiesRes, ...taxonResults] = await Promise.all([
          getTaxonomies({ per_page: 100, includes: "taxons" }),
          ...extraTaxonSlugs.map((slug) =>
            getTaxon(slug, { includes: "children" }),
          ),
        ]);
        setTaxonomies(taxonomiesRes.data);
        setExtraTaxonMap(buildExtraTaxonMap(extraTaxonSlugs, taxonResults));
      } catch (error) {
        console.error("Failed to fetch mega menu data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [extraTaxonSlugs]);

  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname;
      setActiveIndex(null);
      setDrawerOpen(false);
      setExpandedSections(new Set());
    }
  }, [pathname]);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  const dismissDropdown = useCallback(() => setActiveIndex(null), []);
  useDismiss(navRef, activeIndex !== null, dismissDropdown);

  const extraTaxons = useMemo(
    () => Array.from(extraTaxonMap.values()),
    [extraTaxonMap],
  );

  const navItems: NavItem[] = useMemo(() => {
    if (loading) return [];

    const visibleTaxonomies = taxonomies.filter((taxonomy) => {
      const topLevel = taxonomy.taxons?.filter((t) => t.depth === 1) ?? [];
      return topLevel.length > 0;
    });

    return [
      ...visibleTaxonomies.map((taxonomy) => ({
        kind: "taxonomy" as const,
        key: `taxonomy-${taxonomy.id}`,
        label: taxonomy.name,
        taxonomy,
        display: resolveDisplay(resolveItemConfig(taxonomy.name, config)),
      })),
      ...(config?.extraItems
        ?.map((item, i) => {
          if (item.type === "link") {
            return {
              kind: "link" as const,
              key: `link-${i}`,
              label: item.label,
              href: item.href,
            } satisfies NavItemLink;
          }
          const taxon = extraTaxonMap.get(item.slug);
          if (!taxon) return null;
          return {
            kind: "taxon" as const,
            key: `taxon-${item.slug}`,
            label: item.label ?? taxon.name ?? item.slug,
            taxon,
            display: resolveDisplay(item.config ?? config?.defaults ?? {}),
          } satisfies NavItemTaxon;
        })
        .filter((item): item is NavItemLink | NavItemTaxon => item !== null) ??
        []),
    ];
  }, [loading, taxonomies, extraTaxonMap, config]);

  const isOverflowing = useOverflowDetection(measureRef, navItems.length);

  const handleMouseEnter = useCallback((index: number) => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setActiveIndex(index);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    closeTimeoutRef.current = setTimeout(() => {
      setActiveIndex(null);
    }, CLOSE_DELAY_MS);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setExpandedSections(new Set());
  }, []);

  const toggleSection = useCallback((key: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  if (loading) {
    return (
      <>
        <nav className="hidden md:flex items-center space-x-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-4 w-20 bg-gray-200 rounded animate-pulse"
            />
          ))}
        </nav>
        <div className="md:hidden p-2 text-gray-300">
          <MenuIcon className="w-6 h-6" />
        </div>
      </>
    );
  }

  if (navItems.length === 0) return null;

  return (
    <>
      {/* Invisible measurement nav — always in DOM for overflow detection */}
      <nav
        ref={measureRef}
        className="absolute invisible whitespace-nowrap flex items-center space-x-6 pointer-events-none"
        aria-hidden="true"
      >
        {navItems.map((navItem) => (
          <span
            key={navItem.key}
            className="py-5 text-sm font-medium flex items-center gap-1"
          >
            {navItem.label}
            {navItem.kind !== "link" && <ChevronDownIcon className="w-4 h-4" />}
          </span>
        ))}
      </nav>

      {/* Desktop horizontal nav — shown only when items fit */}
      {!isOverflowing && (
        <nav
          ref={navRef}
          className="hidden md:flex items-center space-x-6 mr-4"
        >
          {navItems.map((navItem, index) => {
            if (navItem.kind === "link") {
              return (
                <Link
                  key={navItem.key}
                  href={navItem.href}
                  className="py-5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  {navItem.label}
                </Link>
              );
            }

            return (
              <DesktopNavDropdown
                key={navItem.key}
                navItem={navItem}
                index={index}
                isActive={activeIndex === index}
                basePath={basePath}
                taxonomies={taxonomies}
                extraTaxons={extraTaxons}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              />
            );
          })}
        </nav>
      )}

      {/* Hamburger button — always visible on mobile, visible on desktop when overflowing */}
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className={`p-2 text-gray-600 hover:text-gray-900 transition-colors ${
          isOverflowing ? "" : "md:hidden"
        }`}
        aria-label="Open navigation menu"
      >
        <MenuIcon className="w-6 h-6" />
      </button>

      <MobileDrawer
        isOpen={drawerOpen}
        navItems={navItems}
        expandedSections={expandedSections}
        toggleSection={toggleSection}
        basePath={basePath}
        onClose={closeDrawer}
      />
    </>
  );
}
