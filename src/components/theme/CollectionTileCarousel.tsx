"use client";

import type { CSSProperties, ReactNode } from "react";
import { useCallback, useRef } from "react";
import type Swiper from "swiper";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import { Swiper as SwiperComponent, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { ChevronLeft, ChevronRight } from "lucide-react";

type CollectionTileCarouselProps = {
  items: ReactNode[];
  columnsDesktop: number;
  columnsTablet: number;
  columnsMobile: number;
  gap: number;
  mobileGap: number;
  loop: boolean;
  autoRotate: boolean;
  speed: number;
  arrowsDesktop: boolean;
  arrowsMobile: boolean;
  paginationDesktop: boolean;
  paginationMobile: boolean;
  arrowColor: string;
  arrowBackground: string;
  paginationColor: string;
  itemLabel?: string;
};

export function CollectionTileCarousel(props: CollectionTileCarouselProps) {
  const previous = useRef<HTMLButtonElement>(null);
  const next = useRef<HTMLButtonElement>(null);
  const beforeInit = useCallback((swiper: Swiper) => {
    if (typeof swiper.params.navigation === "object") {
      swiper.params.navigation.prevEl = previous.current;
      swiper.params.navigation.nextEl = next.current;
    }
  }, []);
  const beforeCount = props.items.length;
  const loop = props.loop && beforeCount > props.columnsDesktop;

  return (
    <div
      className="collection-theme-carousel relative min-w-0"
      data-theme-carousel
      style={
        {
          "--carousel-columns-mobile": props.columnsMobile,
          "--carousel-columns-tablet": props.columnsTablet,
          "--carousel-columns-desktop": props.columnsDesktop,
          "--carousel-gap-mobile": `${props.mobileGap}px`,
          "--carousel-gap-desktop": `${props.gap}px`,
          "--carousel-pagination-color": props.paginationColor,
          "--carousel-pagination-mobile": props.paginationMobile
            ? "block"
            : "none",
          "--carousel-pagination-desktop": props.paginationDesktop
            ? "block"
            : "none",
        } as CSSProperties
      }
    >
      <button
        ref={previous}
        type="button"
        aria-label={`Previous ${props.itemLabel || "collections"}`}
        className={`collection-theme-arrow collection-theme-arrow-prev ${props.arrowsMobile ? "" : "collection-theme-arrow-mobile-hidden"} ${props.arrowsDesktop ? "" : "collection-theme-arrow-desktop-hidden"}`}
        style={{
          color: props.arrowColor,
          backgroundColor: props.arrowBackground,
        }}
      >
        <ChevronLeft aria-hidden="true" className="size-5" />
      </button>
      <button
        ref={next}
        type="button"
        aria-label={`Next ${props.itemLabel || "collections"}`}
        className={`collection-theme-arrow collection-theme-arrow-next ${props.arrowsMobile ? "" : "collection-theme-arrow-mobile-hidden"} ${props.arrowsDesktop ? "" : "collection-theme-arrow-desktop-hidden"}`}
        style={{
          color: props.arrowColor,
          backgroundColor: props.arrowBackground,
        }}
      >
        <ChevronRight aria-hidden="true" className="size-5" />
      </button>
      <SwiperComponent
        modules={[Navigation, Pagination, Autoplay]}
        slidesPerView={props.columnsMobile}
        spaceBetween={props.mobileGap}
        loop={loop}
        watchOverflow
        navigation={{ prevEl: previous.current, nextEl: next.current }}
        pagination={{
          clickable: true,
          bulletClass: "collection-theme-bullet",
          bulletActiveClass: "collection-theme-bullet-active",
        }}
        autoplay={
          props.autoRotate
            ? {
                delay: Math.max(3, props.speed) * 1000,
                disableOnInteraction: false,
                pauseOnMouseEnter: true,
              }
            : false
        }
        onBeforeInit={beforeInit}
        breakpoints={{
          640: { slidesPerView: props.columnsTablet, spaceBetween: props.gap },
          1024: {
            slidesPerView: props.columnsDesktop,
            spaceBetween: props.gap,
          },
        }}
        className="collection-theme-swiper"
      >
        {props.items.map((item, index) => (
          <SwiperSlide key={index} className="h-auto">
            {item}
          </SwiperSlide>
        ))}
      </SwiperComponent>
      <style>{`
        .collection-theme-carousel { --carousel-columns:var(--carousel-columns-mobile); --carousel-gap:var(--carousel-gap-mobile) }
        .collection-theme-carousel .collection-theme-swiper:not(.swiper-initialized) .swiper-slide { width:calc((100% - (var(--carousel-columns) - 1) * var(--carousel-gap)) / var(--carousel-columns)); margin-inline-end:var(--carousel-gap) }
        .collection-theme-carousel .collection-theme-arrow { position:absolute; z-index:3; top:42%; display:flex; width:44px; height:44px; align-items:center; justify-content:center; border:0; border-radius:9999px; box-shadow:0 2px 8px #0002; cursor:pointer }
        .collection-theme-carousel .collection-theme-arrow:focus-visible { outline:2px solid var(--marketplace-focus); outline-offset:2px }
        .collection-theme-carousel .collection-theme-arrow-prev { left:8px }
        .collection-theme-carousel .collection-theme-arrow-next { right:8px }
        .collection-theme-carousel .collection-theme-arrow.swiper-button-disabled { visibility:hidden }
        .collection-theme-carousel .collection-theme-swiper { overflow:hidden; padding-bottom:26px }
        .collection-theme-carousel .swiper-pagination { bottom:0; line-height:8px }
        .collection-theme-carousel .collection-theme-bullet { display:inline-block; width:7px; height:7px; margin:0 4px; border-radius:50%; background:var(--carousel-pagination-color); opacity:.45; cursor:pointer }
        .collection-theme-carousel .collection-theme-bullet-active { opacity:1 }
        @media (min-width: 640px) { .collection-theme-carousel { --carousel-columns:var(--carousel-columns-tablet); --carousel-gap:var(--carousel-gap-desktop) } }
        @media (min-width: 1024px) { .collection-theme-carousel { --carousel-columns:var(--carousel-columns-desktop) } }
        @media (max-width: 767px) { .collection-theme-carousel .collection-theme-arrow-mobile-hidden { display:none } .collection-theme-carousel .swiper-pagination { display:var(--carousel-pagination-mobile) } }
        @media (min-width: 768px) { .collection-theme-carousel .collection-theme-arrow-desktop-hidden { display:none } .collection-theme-carousel .swiper-pagination { display:var(--carousel-pagination-desktop) } }
      `}</style>
    </div>
  );
}
