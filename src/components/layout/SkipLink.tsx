"use client";

import { useTranslations } from "next-intl";

export const MAIN_CONTENT_ID = "main-content";

/**
 * First focusable element on every page. Hidden until a keyboard user tabs to
 * it, then jumps focus past the header and navigation to the page's <main>.
 */
export function SkipLink() {
  const t = useTranslations("common");

  return (
    <a
      href={`#${MAIN_CONTENT_ID}`}
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-gray-900 focus:shadow-lg focus:[outline:2px_solid_black]"
    >
      {t("skipToContent")}
    </a>
  );
}
