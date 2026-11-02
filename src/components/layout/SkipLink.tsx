"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const MAIN_CONTENT_ID = "main-content";

/**
 * First focusable element on every page. Kept off-screen until a keyboard user
 * tabs to it, then jumps focus past the header and navigation to the page's
 * <MainContent>.
 */
export function SkipLink(): React.JSX.Element {
  const t = useTranslations("common");

  return (
    <a
      href={`#${MAIN_CONTENT_ID}`}
      className="fixed top-2 left-2 z-[100] -translate-y-[200%] rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-900 shadow-lg focus:translate-y-0 focus:[outline:2px_solid_black]"
    >
      {t("skipToContent")}
    </a>
  );
}

interface MainContentProps {
  children: ReactNode;
  className?: string;
}

/** The page's <main> landmark and the target of <SkipLink>. */
export function MainContent({
  children,
  className,
}: MainContentProps): React.JSX.Element {
  return (
    <main
      id={MAIN_CONTENT_ID}
      tabIndex={-1}
      className={cn("outline-none", className)}
    >
      {children}
    </main>
  );
}
