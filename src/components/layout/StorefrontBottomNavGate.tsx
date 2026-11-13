"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

function isProductDetailPath(pathname: string) {
  return /\/products\/[^/?#]+/.test(pathname);
}

/**
 * Hides the mobile bottom tab bar on routes where a fixed footer would compete
 * with primary actions (checkout uses a separate layout without this chrome).
 */
export function StorefrontBottomNavGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const normalized = pathname.replace(/^\/storefront-embed(?=\/|$)/, "");
  if (/\/checkout(?:\/|$)/.test(normalized)) return null;
  if (isProductDetailPath(normalized)) return null;
  return children;
}
