"use client";

import Link from "next/link";
import { useState } from "react";
import { ProductImage } from "@/components/ui/product-image";
import { sellerDisplayName, sellerMonogram } from "@/lib/utils/seller-display";

export type ShopEditorialImage = {
  src: string;
  kind: "product" | "cover" | "logo";
  href: string;
  label: string;
  price?: string;
};

export function ShopEditorialMedia({
  images,
  name,
  shopHref,
}: {
  images: ShopEditorialImage[];
  name: string;
  shopHref: string;
}) {
  const [index, setIndex] = useState(0);
  const image = images[index];
  const initials =
    sellerDisplayName(name)
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word.match(/[\p{L}\p{N}]/u)?.[0])
      .join("")
      .toUpperCase() || sellerMonogram(name);

  return (
    <Link
      href={image?.href ?? shopHref}
      aria-label={
        image?.price ? `${image.label}, ${image.price}` : image?.label
      }
      data-shop-editorial-media={image?.kind ?? "monogram"}
      className="relative block aspect-[4/5] overflow-hidden bg-marketplace-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-marketplace-brand"
    >
      {image ? (
        <ProductImage
          key={image.src}
          src={image.src}
          alt=""
          fill
          sizes="(min-width: 1024px) 23vw, (min-width: 640px) 46vw, 90vw"
          className={
            image.kind === "logo" ? "object-contain p-[20%]" : "object-cover"
          }
          onError={() =>
            setIndex((current) => (current === index ? current + 1 : current))
          }
        />
      ) : (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-linear-to-br from-marketplace-accent to-marketplace-surface-warm px-[12%] text-center text-marketplace-brand">
          <span
            aria-hidden="true"
            className="grid aspect-square w-[48%] place-items-center rounded-t-full rounded-b-[38%] border border-current/25 font-display text-[clamp(1.75rem,3.5vw,4.5rem)] leading-none uppercase"
          >
            {initials}
          </span>
          <span className="line-clamp-2 text-xs font-semibold tracking-[0.12em] uppercase">
            {name}
          </span>
        </span>
      )}
      {image?.price ? (
        <span className="absolute bottom-3 left-3 rounded-full bg-marketplace-surface px-2.5 py-1 text-xs font-semibold leading-none text-marketplace-foreground shadow-sm">
          {image.price}
        </span>
      ) : null}
    </Link>
  );
}
