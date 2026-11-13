"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Shows a mobile sticky purchase bar after the primary purchase block scrolls
 * out of view. Desktop keeps theme sticky-cart CSS instead.
 */
export function useProductStickyPurchaseBar(enabled: boolean) {
  const purchaseRef = useRef<HTMLDivElement>(null);
  const [showSticky, setShowSticky] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setShowSticky(false);
      return;
    }
    const node = purchaseRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowSticky(!entry.isIntersecting);
      },
      { threshold: 0, rootMargin: "0px 0px -1px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled]);

  return {
    purchaseRef,
    showSticky: enabled && showSticky,
  };
}
