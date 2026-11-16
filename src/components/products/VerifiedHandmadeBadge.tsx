"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

type Certification = {
  name: string;
  handmade_verified?: boolean | null;
  authenticity_explanation?: string | null;
  authenticity_classification_label?: string | null;
  authenticity_disclosure?: string | null;
};

export function VerifiedHandmadeBadge({
  product,
  standardsHref,
}: {
  product: Certification;
  standardsHref?: string;
}) {
  const t = useTranslations("products.handmade");
  if (product.handmade_verified !== true) return null;

  return (
    <span
      className="relative z-[2] mt-1 inline-flex max-w-full"
      data-handmade-verified="true"
    >
      <details className="max-w-full">
        <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-950 ring-1 ring-emerald-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marketplace-brand [&::-webkit-details-marker]:hidden">
          {t("badge")}
        </summary>
        <div
          className="mt-1 max-w-xs rounded-md bg-white p-2 text-xs leading-relaxed text-marketplace-foreground shadow-sm ring-1 ring-black/10"
          role="note"
        >
          <p>{product.authenticity_explanation || t("explanation")}</p>
          {product.authenticity_classification_label ? (
            <p className="mt-1 font-medium">
              {product.authenticity_classification_label}
            </p>
          ) : null}
          {product.authenticity_disclosure ? (
            <p className="mt-1 text-marketplace-muted-foreground">
              {product.authenticity_disclosure}
            </p>
          ) : null}
          {standardsHref ? (
            <Link
              href={standardsHref}
              className="mt-2 inline-flex underline underline-offset-2"
            >
              {t("standards")}
            </Link>
          ) : null}
        </div>
      </details>
    </span>
  );
}
