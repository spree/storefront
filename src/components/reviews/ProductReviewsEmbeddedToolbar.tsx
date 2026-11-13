"use client";

import { Suspense } from "react";
import { ProductReviewsFilters } from "./ProductReviewsFilters";
import type { ProductReviewSort } from "./ProductReviewsSort";
import { ProductReviewsSort } from "./ProductReviewsSort";

type ProductReviewsEmbeddedToolbarProps = {
  currentSort: ProductReviewSort;
};

export function ProductReviewsEmbeddedToolbar({
  currentSort,
}: ProductReviewsEmbeddedToolbarProps) {
  return (
    <div className="mt-6 space-y-4 rounded-2xl border border-marketplace-border-subtle bg-marketplace-surface p-4 shadow-sm">
      <Suspense fallback={null}>
        <ProductReviewsFilters compact currentSort={currentSort} />
      </Suspense>
      <Suspense fallback={null}>
        <ProductReviewsSort compact current={currentSort} />
      </Suspense>
    </div>
  );
}
