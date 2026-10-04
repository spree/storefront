"use client";

import type { Category } from "@spree/sdk";
import { ArrowLeft, ChevronRight, X } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { RegionPreferences } from "@/components/layout/RegionPreferences";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetTitle,
} from "@/components/ui/sheet";

type PanelType = { kind: "main" } | { kind: "category"; category: Category };

interface MobileMenuProps {
  rootCategories: Category[];
  basePath: string;
  /** Whether the wholesale addon is enabled — gates the trade portal link. */
  wholesaleEnabled: boolean;
}

export function MobileMenu({
  rootCategories,
  basePath,
  wholesaleEnabled,
}: MobileMenuProps) {
  const t = useTranslations("header");
  const [open, setOpen] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [panelStack, setPanelStack] = useState<PanelType[]>([{ kind: "main" }]);
  // animatedIndex trails panelStack — new panels mount off-screen, then animate in
  const [animatedIndex, setAnimatedIndex] = useState(0);
  const rafRef = useRef<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const currentPanel = panelStack[panelStack.length - 1];

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
  const linkClass =
    "text-left text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg px-3 py-2.5 text-base transition-colors";

  // Shared button style for items with children (chevron)
  const categoryButtonClass =
    "flex items-center justify-between w-full text-left text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg px-3 py-2.5 text-base transition-colors";

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      {/* Animated hamburger / X button — two-phase animation matching Lottie reference */}
      <Button
        variant="ghost"
        size="icon-lg"
        onClick={() => {
          if (!hasInteracted) setHasInteracted(true);
          setOpen(!open);
        }}
        aria-label={open ? t("closeMenu") : t("openMenu")}
        className="relative z-[60] cursor-pointer"
      >
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
      </Button>

      <SheetContent
        side="left"
        className="flex flex-col !gap-0 !rounded-none overflow-hidden max-md:!top-16 max-md:!h-[calc(100%-4rem)] max-md:!w-full max-md:!max-w-none max-md:!border-r-0"
        showCloseButton={false}
        overlayClassName="max-md:!top-16 max-md:!bg-transparent"
      >
        <SheetTitle className="sr-only">{t("menu")}</SheetTitle>
        {/* Menu header — changes based on active panel */}
        <div className="hidden md:flex items-center justify-between px-4 h-16 border-b border-gray-200 relative overflow-hidden">
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
            className={`flex items-center gap-2 text-gray-700 hover:text-gray-900 text-base font-semibold cursor-pointer transition-all duration-300 ease-in-out absolute left-4 ${
              currentPanel.kind !== "main"
                ? "translate-x-0 opacity-100"
                : "translate-x-8 opacity-0 pointer-events-none"
            }`}
          >
            <ArrowLeft className="w-5 h-5" />
            <span>
              {currentPanel.kind === "category"
                ? currentPanel.category.name
                : ""}
            </span>
          </button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setOpen(false)}
            className="cursor-pointer ml-auto"
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* Sliding panels container */}
        <div className="relative flex-1 overflow-hidden">
          {/* Main menu panel */}
          <div
            className={`absolute inset-0 flex flex-col bg-white transition-transform duration-300 ease-in-out ${
              animatedIndex === 0 && currentPanel.kind === "main"
                ? "translate-x-0"
                : "-translate-x-full"
            }`}
          >
            <nav className="flex flex-col gap-1 px-4 flex-1 overflow-y-auto pt-2">
              <Link
                href={basePath || "/"}
                onClick={() => setOpen(false)}
                className={linkClass}
              >
                {t("home")}
              </Link>
              <Link
                href={`${basePath}/products`}
                onClick={() => setOpen(false)}
                className={linkClass}
              >
                {t("allProducts")}
              </Link>
              <Link
                href={`${basePath}/account/wishlist`}
                onClick={() => setOpen(false)}
                className={linkClass}
              >
                {t("wishlist")}
              </Link>
              {rootCategories.map((category) =>
                category.children && category.children.length > 0 ? (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => pushPanel({ kind: "category", category })}
                    className={categoryButtonClass}
                  >
                    <span>{category.name}</span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </button>
                ) : (
                  <Link
                    key={category.id}
                    href={`${basePath}/c/${category.permalink}`}
                    onClick={() => setOpen(false)}
                    className={linkClass}
                  >
                    {category.name}
                  </Link>
                ),
              )}
              <Link
                href={`${basePath}/#contact`}
                onClick={() => setOpen(false)}
                className={linkClass}
              >
                {t("contact")}
              </Link>
              {/* Secondary links — kept out of the category list above. */}
              <div className="mt-2 pt-2 border-t border-gray-200">
                {wholesaleEnabled && (
                  <Link
                    href={`${basePath}/wholesale`}
                    onClick={() => setOpen(false)}
                    className={`${linkClass} block`}
                  >
                    {t("wholesale")}
                  </Link>
                )}
              </div>
            </nav>

            {/* Footer: region preferences and account links on mobile */}
            <SheetFooter className="lg:hidden items-center border-t border-gray-200 pt-4 gap-2">
              <div className="mx-4 mb-3 w-full">
                <RegionPreferences variant="menu" />
              </div>
            </SheetFooter>

            <div className="md:hidden space-y-2 mx-4 mb-2">
              <SheetClose asChild>
                <Link
                  href={`${basePath}/account/wishlist`}
                  className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 text-gray-800 rounded-lg text-base font-medium hover:bg-gray-50 transition-colors"
                >
                  <span>{t("wishlist")}</span>
                </Link>
              </SheetClose>

              <SheetClose asChild>
                <Link
                  href={`${basePath}/account`}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-black text-white rounded-lg text-base font-medium hover:bg-gray-800 transition-colors"
                >
                  <span>{t("myAccount")}</span>
                </Link>
              </SheetClose>
            </div>
          </div>

          {/* Category sub-panels — one for each level in the stack */}
          {panelStack.map((panel, index) => {
            if (panel.kind !== "category") return null;
            const isAnimatedIn = index <= animatedIndex;
            let translateClass = "translate-x-full";
            if (isAnimatedIn && index < panelStack.length - 1)
              translateClass = "-translate-x-full";
            else if (isAnimatedIn) translateClass = "translate-x-0";

            return (
              <div
                key={`cat-${panel.category.id}-${index}`}
                className={`absolute inset-0 flex flex-col bg-white transition-transform duration-300 ease-in-out ${translateClass}`}
              >
                {/* Back button (mobile only — desktop uses the global header) */}
                <div className="md:hidden px-4 py-2 border-b border-gray-200">
                  <button
                    type="button"
                    onClick={popPanel}
                    className="flex items-center gap-2 text-gray-700 hover:text-gray-900 py-2 text-base font-medium"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    <span>{panel.category.name}</span>
                  </button>
                </div>

                {/* Children */}
                <nav className="flex flex-col gap-1 px-4 flex-1 overflow-y-auto pt-2">
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
                        <ChevronRight className="w-4 h-4 text-gray-400" />
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

                {/* "View all" at the bottom */}
                <div className="border-t border-gray-200 px-4 py-3">
                  <Link
                    href={`${basePath}/c/${panel.category.permalink}`}
                    onClick={() => handleOpenChange(false)}
                    className="block w-full text-center text-sm text-gray-500 hover:text-gray-900 py-2 transition-colors"
                  >
                    {t("viewAllCategory", { category: panel.category.name })}
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
