"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

function isCartPath(pathname: string | null): boolean {
  if (!pathname) return false;
  const normalized = pathname.replace(/\/+$/, "") || "/";
  return normalized.endsWith("/cart");
}

/**
 * Hides the global site footer on the cart page so the cart route can render
 * its own compact footer without stacking two footers.
 */
export function StorefrontFooterGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (isCartPath(pathname)) return null;
  return children;
}
