"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { type ReactNode, useRef } from "react";

export function SellerShopBannerCarousel({
  children,
  slideCount,
}: {
  children: ReactNode;
  slideCount: number;
}) {
  const trackRef = useRef<HTMLFieldSetElement>(null);

  function move(direction: -1 | 1) {
    const track = trackRef.current;
    if (!track) return;

    const lastSlide = track.scrollWidth - track.clientWidth;
    const atStart = track.scrollLeft <= 2;
    const atEnd = track.scrollLeft >= lastSlide - 2;

    if (direction < 0 && atStart) {
      track.scrollTo({ left: lastSlide, behavior: "smooth" });
    } else if (direction > 0 && atEnd) {
      track.scrollTo({ left: 0, behavior: "smooth" });
    } else {
      track.scrollBy({
        left: direction * track.clientWidth,
        behavior: "smooth",
      });
    }
  }

  return (
    <div className="absolute inset-0">
      <fieldset
        ref={trackRef}
        data-seller-banner-track
        aria-roledescription="carousel"
        aria-label="Shop banner slides"
        className="m-0 flex h-full w-full min-w-0 border-0 p-0 snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </fieldset>
      {slideCount > 1 ? (
        <div className="pointer-events-none absolute inset-x-3 top-1/2 z-20 flex -translate-y-1/2 justify-between sm:inset-x-5">
          <button
            type="button"
            aria-label="Previous banner slide"
            onClick={() => move(-1)}
            className="pointer-events-auto inline-flex size-10 items-center justify-center rounded-full border border-black/5 bg-white/95 text-[#29232d] shadow-md transition hover:bg-white hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <ChevronLeft className="size-5" aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Next banner slide"
            onClick={() => move(1)}
            className="pointer-events-auto inline-flex size-10 items-center justify-center rounded-full border border-black/5 bg-white/95 text-[#29232d] shadow-md transition hover:bg-white hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <ChevronRight className="size-5" aria-hidden />
          </button>
        </div>
      ) : null}
    </div>
  );
}
