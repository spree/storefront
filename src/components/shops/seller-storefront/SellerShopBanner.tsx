import Link from "next/link";
import type { CSSProperties } from "react";
import type { SellerShopBannerPayload } from "@/lib/data/seller-storefront-types";
import { SellerShopBannerCarousel } from "./SellerShopBannerCarousel";
import { ShopEditorAction } from "./ShopEditorAction";

const layoutClasses: Record<SellerShopBannerPayload["layout"], string> = {
  none: "",
  single_mini: "h-44 sm:h-52",
  single_standard: "h-64 sm:h-80 lg:h-[28rem]",
  carousel: "h-64 sm:h-80 lg:h-[28rem]",
  collage: "h-64 sm:h-80 lg:h-[28rem]",
  collage_2: "h-64 grid-cols-2 sm:h-80 lg:h-[28rem]",
  collage_3: "h-64 grid-cols-2 grid-rows-2 sm:h-80 lg:h-[28rem]",
  collage_4: "h-64 grid-cols-2 grid-rows-2 sm:h-80 lg:h-[28rem]",
};

export function SellerShopBanner({
  banner,
  basePath,
  editorPreview = false,
}: {
  banner: SellerShopBannerPayload;
  basePath: string;
  editorPreview?: boolean;
}) {
  const slides = banner.slides
    .filter((slide) => slide.image_url)
    .sort((a, b) => a.position - b.position);
  if (banner.layout === "none") {
    return null;
  }
  if (!slides.length) return null;

  const collage =
    banner.layout === "collage" || banner.layout.startsWith("collage_");
  const carousel = banner.layout === "carousel";
  const classes = layoutClasses[banner.layout];
  const visibleSlideLimit =
    banner.layout === "single_mini" || banner.layout === "single_standard"
      ? 1
      : banner.layout === "collage_2"
        ? 2
        : banner.layout === "collage_3"
          ? 3
          : 4;
  const visibleSlides = slides.slice(0, visibleSlideLimit);
  const slideElements = visibleSlides.map((slide, index) => {
    const isFirst = index === 0;
    const itemSpan =
      collage && visibleSlides.length === 3 && isFirst
        ? "row-span-2 min-h-52"
        : undefined;
    const href = slide.link_href ? `${basePath}${slide.link_href}` : undefined;
    const image = (
      // biome-ignore lint/performance/noImgElement: uploaded seller banner images are dynamic URLs
      <img
        key={slide.id}
        src={slide.image_url!}
        alt={slide.link_label || ""}
        className="h-full w-full object-cover object-[var(--seller-banner-focal-point)]"
        style={
          {
            "--seller-banner-focal-point": `${slide.focal_point_x}% ${slide.focal_point_y}%`,
          } as CSSProperties
        }
      />
    );
    const content = (
      <div
        key={slide.id}
        className={`relative h-full overflow-hidden bg-marketplace-surface-warm ${carousel ? "w-full shrink-0 snap-center" : ""}`}
      >
        {image}
        {slide.link_label ? (
          <span className="absolute bottom-3 left-3 max-w-[calc(100%-1.5rem)] truncate rounded-sm bg-black/65 px-3 py-1.5 text-sm font-medium text-white">
            {slide.link_label}
          </span>
        ) : null}
      </div>
    );

    return href ? (
      <Link
        key={slide.id}
        href={href}
        aria-label={slide.link_label || undefined}
        className={`block h-full min-h-28 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marketplace-brand ${carousel ? "w-full shrink-0 snap-center" : ""} ${itemSpan ?? ""}`}
      >
        {content}
      </Link>
    ) : (
      <div
        key={slide.id}
        className={`h-full min-h-28 ${carousel ? "w-full shrink-0 snap-center" : ""} ${itemSpan ?? ""}`}
      >
        {content}
      </div>
    );
  });

  return (
    <section
      aria-label="Shop banner"
      className={`relative ${
        collage
          ? `grid ${classes} ${
              visibleSlides.length === 2
                ? "grid-cols-2 grid-rows-1"
                : visibleSlides.length === 3
                  ? "grid-cols-2 grid-rows-2 [&>*:first-child]:row-span-2"
                  : "grid-cols-2 grid-rows-2"
            } gap-1`
          : carousel
            ? `${classes} overflow-hidden`
            : `${classes} overflow-hidden`
      }`}
      data-shop-banner-layout={banner.layout}
    >
      {editorPreview ? (
        <div className="absolute left-3 top-3 z-10 flex items-center gap-2">
          <ShopEditorAction
            action="banner-layout"
            label="Change layout"
            showLabel
            className="inline-flex h-8 items-center gap-2 rounded-full bg-white px-3 text-xs font-semibold text-[#222] shadow hover:bg-white/90"
          />
        </div>
      ) : null}
      {editorPreview ? (
        <ShopEditorAction
          action="banner"
          label="Edit banner"
          className="absolute bottom-3 right-3 z-10 inline-flex size-9 items-center justify-center rounded-full bg-white text-[#222] shadow hover:bg-white/90"
        />
      ) : null}
      {carousel ? (
        <SellerShopBannerCarousel slideCount={visibleSlides.length}>
          {slideElements}
        </SellerShopBannerCarousel>
      ) : (
        slideElements
      )}
    </section>
  );
}
