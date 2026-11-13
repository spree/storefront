"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { MadeTogetherCompact } from "@/components/products/MadeTogetherCompact";
import { loadMadeTogetherPresentation } from "@/lib/data/made-together";
import type { MadeTogetherPresentation } from "@/lib/made-together/types";

type MadeTogetherBuyBoxProps = {
  productId: string;
  basePath: string;
  initial: MadeTogetherPresentation | null;
  fallback: ReactNode;
};

export function MadeTogetherBuyBox({
  productId,
  basePath,
  initial,
  fallback,
}: MadeTogetherBuyBoxProps) {
  const [presentation, setPresentation] =
    useState<MadeTogetherPresentation | null>(initial);

  useEffect(() => {
    if (presentation) return;
    let cancelled = false;
    void loadMadeTogetherPresentation(productId, basePath).then((loaded) => {
      if (!cancelled && loaded) setPresentation(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [productId, basePath, presentation]);

  if (presentation) {
    return <MadeTogetherCompact presentation={presentation} />;
  }

  return fallback;
}
