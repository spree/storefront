"use client";

import type { Category } from "@spree/sdk";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { SpreeIcon } from "@/components/icons";
import { CmsNavigationIcon } from "@/components/layout/CmsNavigationIcon";
import { RegionPreferences } from "@/components/layout/RegionPreferences";
import { Button } from "@/components/ui/button";
import { CategoryImage } from "@/components/ui/category-image";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetTitle,
} from "@/components/ui/sheet";
import { useStoreThemeSettings } from "@/contexts/ThemeSettingsContext";
import { cmsNavigationHref } from "@/lib/cms-navigation-href";
import type {
  CmsNavigationItem,
  CmsNavigationPayload,
} from "@/lib/data/cms-navigation";
import { marketplaceEtsyPillLinkClass } from "@/lib/marketplace-etsy-motion";
import { getCollectionStockImage } from "@/lib/marketplace-stock-images";
import { themeSettingEnabled } from "@/lib/theme/setting-value";

type PanelType =
  | { kind: "main" }
  | { kind: "category"; category: Category }
  | { kind: "cms"; item: CmsNavigationItem };

interface MobileMenuProps {
  rootCategories: Category[];
  basePath: string;
  /** Whether the wholesale addon is enabled — gates the trade portal link. */
  wholesaleEnabled: boolean;
  triggerVariant?: "icon" | "bottom-nav";
  accordionNavigation?: boolean;
  showNavigationBar?: boolean;
  showDividers?: boolean;
  menuBackgroundColor?: string;
  menuTextColor?: string;
  cmsItems?: CmsNavigationItem[];
  cmsSettings?: CmsNavigationPayload["settings"];
  forYouCategoryIds?: string[];
}

export function MobileMenu({
  rootCategories,
  basePath,
  wholesaleEnabled,
  triggerVariant = "icon",
  accordionNavigation: accordionNavigationSetting,
  showNavigationBar = false,
  showDividers = false,
  menuBackgroundColor,
  menuTextColor,
  cmsItems = [],
  cmsSettings,
  forYouCategoryIds = [],
}: MobileMenuProps) {
  const t = useTranslations("header");
  const { navigation } = useStoreThemeSettings();
  const accordionNavigation =
    themeSettingEnabled(accordionNavigationSetting) ||
    navigation?.mobile_style === "accordion";
  const [open, setOpen] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [panelStack, setPanelStack] = useState<PanelType[]>([{ kind: "main" }]);
  // animatedIndex trails panelStack — new panels mount off-screen, then animate in
  const [animatedIndex, setAnimatedIndex] = useState(0);
  const rafRef = useRef<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const currentPanel = panelStack[panelStack.length - 1];
  const categoryIndex = new Map<string, Category>();
  const categoryList: Category[] = [];
  const indexCategories = (categories: Category[]) => {
    for (const category of categories) {
      categoryList.push(category);
      categoryIndex.set(category.id, category);
      categoryIndex.set(category.permalink, category);
      indexCategories(category.children || []);
    }
  };
  indexCategories(rootCategories);
  const resolveMenuCategory = (item: CmsNavigationItem) => {
    if (item.category_id) {
      const category = categoryIndex.get(item.category_id);
      if (category) return category;
    }
    const targetPermalink = item.target?.match(/\/c\/([^/?#]+)/)?.[1];
    if (targetPermalink) {
      const category = categoryIndex.get(decodeURIComponent(targetPermalink));
      if (category) return category;
    }
    const normalize = (value: string) =>
      value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
    const label = normalize(item.label);
    return categoryList.find(
      (category) =>
        normalize(category.name) === label ||
        normalize(
          category.permalink.split("/").at(-1) || category.permalink,
        ) === label,
    );
  };
  const cmsHref = (item: CmsNavigationItem) => {
    if (item.type === "category") {
      const category = item.category_id
        ? categoryIndex.get(item.category_id)
        : undefined;
      return category ? `${basePath}/c/${category.permalink}` : null;
    }
    return cmsNavigationHref(item, basePath);
  };
  const mobileFeaturedPanels = cmsItems
    .filter((item) => item.enabled !== false)
    .flatMap((item) => item.featured_panels || [])
    .filter((panel) => panel.mobile_visible !== false);
  const exploreImageUrl =
    mobileFeaturedPanels[0]?.image_url ||
    rootCategories[0]?.square_image_url ||
    rootCategories[0]?.image_url ||
    getCollectionStockImage(0, "Explore");

  const cancelPendingCallbacks = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const pushPanel = (panel: PanelType) => {
    cancelPendingCallbacks();
    // Step 1: mount the new panel off-screen (translate-x-full) via flushSync
    flushSync(() => {
      setPanelStack((prev) => [...prev, panel]);
    });
    // Step 2: on next frame, update animatedIndex to trigger slide-in
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      setAnimatedIndex((prev) => prev + 1);
    });
  };

  const popPanel = () => {
    cancelPendingCallbacks();
    // Step 1: animate out by decrementing animatedIndex
    setAnimatedIndex((prev) => Math.max(0, prev - 1));
    // Step 2: after transition, remove the panel from the stack
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      setPanelStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
    }, 300);
  };

  const handleOpenChange = (value: boolean) => {
    setOpen(value);
    if (!value) {
      cancelPendingCallbacks();
      setPanelStack([{ kind: "main" }]);
      setAnimatedIndex(0);
    }
  };

  // Shared link style
  const linkClass = `text-left text-marketplace-foreground hover:text-marketplace-brand hover:bg-marketplace-surface-subtle px-3 py-2.5 text-[15px] transition-colors ${showDividers ? "border-b border-marketplace-border rounded-none" : "rounded-lg"}`;

  const categoryButtonClass = `flex min-h-12 w-full items-center justify-between gap-3 text-left text-marketplace-foreground hover:text-marketplace-brand hover:bg-marketplace-surface-subtle px-3 py-3 text-[15px] transition-colors ${showDividers ? "border-b border-marketplace-border rounded-none" : "rounded-lg"}`;

  const renderAccordionCategory = (
    category: Category,
    depth = 0,
  ): React.ReactNode => (
    <details
      key={category.id}
      className="group"
      style={{ marginLeft: `${Math.min(depth, 4) * 12}px` }}
    >
      <summary className={categoryButtonClass}>
        {category.name}
        <SpreeIcon
          name="forward"
          className="size-4 rotate-90 text-marketplace-muted-foreground transition-transform group-open:rotate-270"
        />
      </summary>
      <div className="flex flex-col gap-1 border-l border-marketplace-border pl-2">
        <Link
          href={`${basePath}/c/${category.permalink}`}
          onClick={() => setOpen(false)}
          className={linkClass}
        >
          View {category.name}
        </Link>
        {category.children?.map((child) =>
          child.children?.length ? (
            renderAccordionCategory(child, depth + 1)
          ) : (
            <Link
              key={child.id}
              href={`${basePath}/c/${child.permalink}`}
              onClick={() => setOpen(false)}
              className={linkClass}
            >
              {child.name}
            </Link>
          ),
        )}
      </div>
    </details>
  );

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      {/* Animated hamburger / X button — two-phase animation matching Lottie reference */}
      <Button
        variant="ghost"
        size={triggerVariant === "icon" ? "icon" : "default"}
        onClick={() => {
          if (!hasInteracted) setHasInteracted(true);
          setOpen(!open);
        }}
        aria-label={open ? t("closeMenu") : t("openMenu")}
        aria-current={
          triggerVariant === "bottom-nav" && open ? "page" : undefined
        }
        className={
          triggerVariant === "bottom-nav"
            ? "relative z-[60] h-16 min-w-0 flex-col gap-0.5 rounded-none px-1 text-[10px] font-medium text-marketplace-muted-foreground hover:bg-marketplace-muted hover:text-marketplace-brand"
            : "relative z-[60] h-9 w-9 cursor-pointer sm:h-10 sm:w-10"
        }
      >
        {triggerVariant === "bottom-nav" ? (
          <>
            <SpreeIcon name="categories" className="size-5" />
            <span>{t("browse")}</span>
          </>
        ) : (
          <div className="relative w-5 h-5">
            {/* Top line: phase 1 translates to center, phase 2 rotates 45° */}
            <span
              className={`absolute left-0 right-0 h-0.5 bg-current rounded-full top-[2px] ${
                hasInteracted
                  ? open
                    ? "animate-hamburger-top-open"
                    : "animate-hamburger-top-close"
                  : ""
              }`}
            />
            {/* Middle line: fades out in phase 1, fades in after delay on close */}
            <span
              className={`absolute left-0 right-0 h-0.5 bg-current rounded-full top-1/2 -translate-y-1/2 ${
                hasInteracted
                  ? open
                    ? "animate-hamburger-mid-open"
                    : "animate-hamburger-mid-close"
                  : ""
              }`}
              style={
                hasInteracted && !open
                  ? { animationDelay: "0.2s", opacity: 0 }
                  : undefined
              }
            />
            {/* Bottom line: phase 1 translates to center, phase 2 rotates -45° */}
            <span
              className={`absolute left-0 right-0 h-0.5 bg-current rounded-full bottom-[2px] ${
                hasInteracted
                  ? open
                    ? "animate-hamburger-bottom-open"
                    : "animate-hamburger-bottom-close"
                  : ""
              }`}
            />
          </div>
        )}
      </Button>

      <SheetContent
        data-theme-mobile-menu
        side="left"
        className="flex flex-col !gap-0 !rounded-none overflow-hidden max-md:!top-16 max-md:!h-[calc(100%-4rem)] max-md:!w-full max-md:!max-w-none max-md:!border-r-0"
        showCloseButton={false}
        overlayClassName="max-md:!top-16 max-md:!bg-transparent"
        style={{ backgroundColor: menuBackgroundColor, color: menuTextColor }}
      >
        <SheetTitle className="sr-only">{t("menu")}</SheetTitle>
        {/* Menu header — changes based on active panel */}
        <div className="hidden md:flex items-center justify-between px-4 h-16 border-b border-marketplace-border relative overflow-hidden">
          {/* "Menu" title — visible when on main panel */}
          <span
            className={`text-base font-semibold transition-all duration-300 ease-in-out absolute left-4 ${
              currentPanel.kind === "main"
                ? "translate-x-0 opacity-100"
                : "-translate-x-8 opacity-0 pointer-events-none"
            }`}
          >
            {t("menu")}
          </span>
          {/* Back button + category name — visible on sub-panels */}
          <button
            type="button"
            onClick={popPanel}
            className={`flex items-center gap-2 text-marketplace-foreground hover:text-marketplace-brand text-base font-semibold cursor-pointer transition-all duration-300 ease-in-out absolute left-4 ${
              currentPanel.kind !== "main"
                ? "translate-x-0 opacity-100"
                : "translate-x-8 opacity-0 pointer-events-none"
            }`}
          >
            <SpreeIcon name="back" className="size-5" />
            <span>
              {currentPanel.kind === "category"
                ? currentPanel.category.name
                : currentPanel.kind === "cms"
                  ? currentPanel.item.label
                  : ""}
            </span>
          </button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setOpen(false)}
            className="cursor-pointer ml-auto"
          >
            <SpreeIcon name="close" className="size-4" />
          </Button>
        </div>

        {/* Sliding panels container */}
        <div className="relative flex-1 overflow-hidden">
          {/* Main menu panel */}
          <div
            className={`absolute inset-0 flex flex-col bg-marketplace-surface transition-transform duration-300 ease-in-out ${
              animatedIndex === 0 && currentPanel.kind === "main"
                ? "translate-x-0"
                : "-translate-x-full"
            }`}
          >
            <nav
              data-theme-mobile-menu-scroll
              className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-5 pt-2"
              style={{
                backgroundColor: menuBackgroundColor,
                color: menuTextColor,
              }}
            >
              <Link
                href={`${basePath}/products`}
                onClick={() => setOpen(false)}
                className="flex min-h-[76px] items-center gap-4 border-b border-marketplace-border/70 px-4 text-marketplace-foreground transition-colors hover:bg-marketplace-curator active:bg-marketplace-curator focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-marketplace-brand"
              >
                <CategoryImage
                  src={exploreImageUrl}
                  alt=""
                  width={48}
                  height={48}
                  className="size-12 shrink-0 rounded-md object-cover"
                  sizes="48px"
                />
                <span className="flex-1 text-[15px] font-medium">
                  {t("navExplore")}
                </span>
                <ChevronRight
                  className="size-5 shrink-0 text-marketplace-foreground"
                  aria-hidden
                />
              </Link>
              {cmsItems.some((item) => item.enabled !== false) ? (
                <section aria-labelledby="mobile-menu-categories">
                  <h2 id="mobile-menu-categories" className="sr-only">
                    {t("shopByCategory")}
                  </h2>
                  {cmsItems
                    .filter((item) => item.enabled !== false)
                    .map((item, index) => {
                      const href = cmsHref(item);
                      const category = resolveMenuCategory(item);
                      const panelImageUrl = item.featured_panels?.find(
                        (panel) =>
                          panel.mobile_visible !== false && panel.image_url,
                      )?.image_url;
                      const imageUrl =
                        category?.square_image_url ||
                        category?.image_url ||
                        panelImageUrl ||
                        getCollectionStockImage(index, item.label);
                      const rowImage = (
                        <CategoryImage
                          key={item.id}
                          src={imageUrl}
                          alt=""
                          width={48}
                          height={48}
                          className="size-12 shrink-0 rounded-md object-cover"
                          sizes="48px"
                        />
                      );
                      return item.children?.length ? (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => pushPanel({ kind: "cms", item })}
                          className="flex min-h-[76px] w-full items-center gap-4 border-b border-marketplace-border/70 px-4 text-left text-marketplace-foreground transition-colors hover:bg-marketplace-curator active:bg-marketplace-curator focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-marketplace-brand"
                        >
                          {rowImage}
                          <span className="min-w-0 flex-1 truncate text-[15px] font-medium">
                            {item.label}
                          </span>
                          <ChevronRight
                            className="size-5 shrink-0 text-marketplace-foreground"
                            aria-hidden
                          />
                        </button>
                      ) : href ? (
                        <Link
                          key={item.id}
                          href={href}
                          onClick={() => setOpen(false)}
                          className="flex min-h-[76px] items-center gap-4 border-b border-marketplace-border/70 px-4 text-marketplace-foreground transition-colors hover:bg-marketplace-curator active:bg-marketplace-curator focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-marketplace-brand"
                        >
                          {rowImage}
                          <span className="min-w-0 flex-1 truncate text-[15px] font-medium">
                            {item.label}
                          </span>
                          <ChevronRight
                            className="size-5 shrink-0 text-marketplace-foreground"
                            aria-hidden
                          />
                        </Link>
                      ) : null;
                    })}
                </section>
              ) : rootCategories.length ? (
                <section aria-labelledby="mobile-menu-categories">
                  <h2 id="mobile-menu-categories" className="sr-only">
                    {t("shopByCategory")}
                  </h2>
                  {rootCategories.map((category, index) =>
                    accordionNavigation && category.children?.length ? (
                      renderAccordionCategory(category)
                    ) : category.children && category.children.length > 0 ? (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() =>
                          pushPanel({ kind: "category", category })
                        }
                        className="flex min-h-[76px] w-full items-center gap-4 border-b border-marketplace-border/70 px-4 text-left text-marketplace-foreground transition-colors hover:bg-marketplace-curator active:bg-marketplace-curator focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-marketplace-brand"
                      >
                        <CategoryImage
                          src={
                            category.square_image_url ||
                            category.image_url ||
                            getCollectionStockImage(index, category.name)
                          }
                          alt=""
                          width={48}
                          height={48}
                          className="size-12 shrink-0 rounded-md object-cover"
                          sizes="48px"
                        />
                        <span className="min-w-0 flex-1 truncate text-[15px] font-medium">
                          {category.name}
                        </span>
                        <ChevronRight
                          className="size-5 shrink-0 text-marketplace-foreground"
                          aria-hidden
                        />
                      </button>
                    ) : (
                      <Link
                        key={category.id}
                        href={`${basePath}/c/${category.permalink}`}
                        onClick={() => setOpen(false)}
                        className="flex min-h-[76px] items-center gap-4 border-b border-marketplace-border/70 px-4 text-marketplace-foreground transition-colors hover:bg-marketplace-curator active:bg-marketplace-curator focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-marketplace-brand"
                      >
                        <CategoryImage
                          src={
                            category.square_image_url ||
                            category.image_url ||
                            getCollectionStockImage(index, category.name)
                          }
                          alt=""
                          width={48}
                          height={48}
                          className="size-12 shrink-0 rounded-md object-cover"
                          sizes="48px"
                        />
                        <span className="min-w-0 flex-1 truncate text-[15px] font-medium">
                          {category.name}
                        </span>
                        <ChevronRight
                          className="size-5 shrink-0 text-marketplace-foreground"
                          aria-hidden
                        />
                      </Link>
                    ),
                  )}
                </section>
              ) : null}
              {cmsSettings?.show_for_you && forYouCategoryIds.length ? (
                <section className="mt-3 border-t border-marketplace-border pt-3">
                  <p className="px-3 pb-1 text-xs font-semibold uppercase text-marketplace-muted-foreground">
                    {t("forYou")}
                  </p>
                  {forYouCategoryIds
                    .map((id) => categoryIndex.get(id))
                    .filter((category): category is Category =>
                      Boolean(category),
                    )
                    .map((category) => (
                      <Link
                        key={category.id}
                        href={`${basePath}/c/${category.permalink}`}
                        onClick={() => setOpen(false)}
                        className={linkClass}
                      >
                        {category.name}
                      </Link>
                    ))}
                </section>
              ) : null}
              {cmsSettings?.search_shortcuts?.length ? (
                <section className="mt-3 border-t border-marketplace-border pt-3">
                  <p className="px-3 pb-1 text-xs font-semibold uppercase text-marketplace-muted-foreground">
                    {t("exploreSearches")}
                  </p>
                  {cmsSettings.search_shortcuts.map((shortcut) => (
                    <Link
                      key={shortcut.id}
                      href={`${basePath}/products?q=${encodeURIComponent(shortcut.query)}`}
                      onClick={() => setOpen(false)}
                      className={linkClass}
                    >
                      {shortcut.label}
                    </Link>
                  ))}
                </section>
              ) : null}
              {/* Secondary links stay visually quiet, like the utility links in the menu reference. */}
              <div className="mt-3 border-t border-marketplace-border px-1 pt-2">
                <Link
                  href={`${basePath}/#contact`}
                  onClick={() => setOpen(false)}
                  className="flex min-h-10 items-center px-3 text-sm text-marketplace-muted-foreground transition-colors hover:text-marketplace-foreground"
                >
                  {t("contact")}
                </Link>
                {wholesaleEnabled && (
                  <Link
                    href={`${basePath}/wholesale`}
                    onClick={() => setOpen(false)}
                    className="flex min-h-10 items-center px-3 text-sm text-marketplace-muted-foreground transition-colors hover:text-marketplace-foreground"
                  >
                    {t("wholesale")}
                  </Link>
                )}
                <SheetClose asChild>
                  <Link
                    href={`${basePath}/account`}
                    className="flex min-h-10 items-center px-3 text-sm text-marketplace-muted-foreground transition-colors hover:text-marketplace-foreground"
                  >
                    {t("myAccount")}
                  </Link>
                </SheetClose>
              </div>
            </nav>

            {showNavigationBar && rootCategories.length > 0 && (
              <nav
                aria-label={t("categoryNavigation")}
                data-theme-mobile-navigation-bar
                className="flex shrink-0 gap-2 overflow-x-auto border-t border-marketplace-border px-3 py-2 md:hidden"
                style={{
                  backgroundColor: menuBackgroundColor,
                  color: menuTextColor,
                }}
              >
                {rootCategories.map((category) => (
                  <Link
                    key={category.id}
                    href={`${basePath}/c/${category.permalink}`}
                    onClick={() => setOpen(false)}
                    className={`${marketplaceEtsyPillLinkClass} text-xs`}
                  >
                    {category.name}
                  </Link>
                ))}
              </nav>
            )}

            {/* Footer: centered Region and language control (mobile only) */}
            <SheetFooter className="lg:hidden items-center gap-2 border-t border-marketplace-border px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)_+_0.75rem)]">
              <RegionPreferences variant="menu" />
            </SheetFooter>
          </div>

          {/* Category sub-panels — one for each level in the stack */}
          {!accordionNavigation &&
            panelStack.map((panel, index) => {
              if (panel.kind === "main") return null;
              const isAnimatedIn = index <= animatedIndex;
              let translateClass = "translate-x-full";
              if (isAnimatedIn && index < panelStack.length - 1)
                translateClass = "-translate-x-full";
              else if (isAnimatedIn) translateClass = "translate-x-0";

              return (
                <div
                  key={`${panel.kind}-${panel.kind === "category" ? panel.category.id : panel.item.id}-${index}`}
                  className={`absolute inset-0 flex flex-col bg-marketplace-surface transition-transform duration-300 ease-in-out ${translateClass}`}
                >
                  {/* Back button (mobile only — desktop uses the global header) */}
                  <div className="md:hidden px-4 py-2 border-b border-marketplace-border">
                    <button
                      type="button"
                      onClick={popPanel}
                      className="flex items-center gap-2 py-2 text-base font-medium text-marketplace-foreground hover:text-marketplace-brand"
                    >
                      <SpreeIcon name="back" className="size-5" />
                      <span>
                        {panel.kind === "category"
                          ? panel.category.name
                          : panel.item.label}
                      </span>
                    </button>
                  </div>

                  {/* Children */}
                  {panel.kind === "category" ? (
                    <nav
                      data-theme-mobile-menu-scroll
                      className="flex flex-col gap-1 px-4 flex-1 overflow-y-auto pt-2"
                    >
                      {panel.category.children?.map((child) =>
                        child.children && child.children.length > 0 ? (
                          <button
                            key={child.id}
                            type="button"
                            onClick={() =>
                              pushPanel({ kind: "category", category: child })
                            }
                            className={categoryButtonClass}
                          >
                            <span>{child.name}</span>
                            <SpreeIcon
                              name="forward"
                              className="size-4 text-marketplace-muted-foreground"
                            />
                          </button>
                        ) : (
                          <Link
                            key={child.id}
                            href={`${basePath}/c/${child.permalink}`}
                            onClick={() => handleOpenChange(false)}
                            className={linkClass}
                          >
                            {child.name}
                          </Link>
                        ),
                      )}
                    </nav>
                  ) : (
                    <nav
                      data-theme-mobile-menu-scroll
                      className="flex flex-col gap-1 px-4 flex-1 overflow-y-auto pt-2"
                    >
                      {panel.item.children
                        ?.filter((item) => item.enabled !== false)
                        .map((item) => {
                          const href = cmsHref(item);
                          return href ? (
                            <Link
                              key={item.id}
                              href={href}
                              onClick={() => handleOpenChange(false)}
                              className={`${linkClass} flex items-center gap-3`}
                            >
                              <CmsNavigationIcon
                                name={item.icon}
                                className="size-4 shrink-0"
                              />
                              <span>{item.label}</span>
                            </Link>
                          ) : null;
                        })}
                    </nav>
                  )}

                  {/* "View all" at the bottom */}
                  <div className="border-t border-marketplace-border px-4 py-3">
                    <Link
                      href={
                        panel.kind === "category"
                          ? `${basePath}/c/${panel.category.permalink}`
                          : cmsHref(panel.item) || `${basePath}/products`
                      }
                      onClick={() => handleOpenChange(false)}
                      className="block w-full py-2 text-center text-sm text-marketplace-muted-foreground transition-colors hover:text-marketplace-brand"
                    >
                      {panel.kind === "category"
                        ? t("viewAllCategory", {
                            category: panel.category.name,
                          })
                        : `View all ${panel.item.label}`}
                    </Link>
                  </div>
                </div>
              );
            })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
