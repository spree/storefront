"use client";

import type { ProductReview } from "@spree/sdk";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import type Swiper from "swiper";
import { Navigation } from "swiper/modules";
import { Swiper as SwiperComponent, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import { StarRatingDisplay } from "@/components/reviews/StarRating";
import { formatShopReviewDate } from "@/lib/utils/format";

interface ProductShopReviewsCarouselProps {
  reviews: ProductReview[];
  basePath: string;
  locale: string;
  anonymousReviewer: string;
  purchasedLabel: string;
  previousLabel: string;
  nextLabel: string;
}

export function ProductShopReviewsCarousel({
  reviews,
  basePath,
  locale,
  anonymousReviewer,
  purchasedLabel,
  previousLabel,
  nextLabel,
}: ProductShopReviewsCarouselProps) {
  const previous = useRef<HTMLButtonElement>(null);
  const next = useRef<HTMLButtonElement>(null);
  const [isBeginning, setIsBeginning] = useState(true);
  const [isEnd, setIsEnd] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(reviews.length > 1);

  const updateNavigation = useCallback((swiper: Swiper) => {
    setIsBeginning(swiper.isBeginning);
    setIsEnd(swiper.isEnd);
    setHasOverflow(!swiper.isLocked && (swiper.snapGrid?.length ?? 0) > 1);
  }, []);

  const beforeInit = useCallback((swiper: Swiper) => {
    if (typeof swiper.params.navigation === "object") {
      swiper.params.navigation.prevEl = previous.current;
      swiper.params.navigation.nextEl = next.current;
    }
  }, []);

  const onSwiper = useCallback(
    (swiper: Swiper) => {
      swiper.navigation.init();
      swiper.navigation.update();
      updateNavigation(swiper);
    },
    [updateNavigation],
  );

  const showPrevious = hasOverflow && !isBeginning;
  const showNext = hasOverflow && !isEnd;

  return (
    <div className="relative min-w-0">
      <button
        ref={previous}
        type="button"
        aria-label={previousLabel}
        aria-hidden={!showPrevious}
        tabIndex={showPrevious ? 0 : -1}
        disabled={!showPrevious}
        className={`absolute left-1 top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-[#e2ddd8] bg-white text-[#39343c] shadow-[0_5px_22px_rgba(40,32,28,0.16)] transition-opacity hover:bg-[#f7f4f1] disabled:pointer-events-none sm:left-2 ${showPrevious ? "opacity-100" : "opacity-0"}`}
      >
        <ChevronLeft className="size-5" aria-hidden />
      </button>
      <button
        ref={next}
        type="button"
        aria-label={nextLabel}
        aria-hidden={!showNext}
        tabIndex={showNext ? 0 : -1}
        disabled={!showNext}
        className={`absolute right-1 top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-[#e2ddd8] bg-white text-[#39343c] shadow-[0_5px_22px_rgba(40,32,28,0.16)] transition-opacity hover:bg-[#f7f4f1] disabled:pointer-events-none sm:right-2 ${showNext ? "opacity-100" : "opacity-0"}`}
      >
        <ChevronRight className="size-5" aria-hidden />
      </button>

      <SwiperComponent
        modules={[Navigation]}
        navigation={{ prevEl: previous.current, nextEl: next.current }}
        onBeforeInit={beforeInit}
        onSwiper={onSwiper}
        onSlideChange={updateNavigation}
        onReachBeginning={updateNavigation}
        onReachEnd={updateNavigation}
        onAfterInit={updateNavigation}
        onResize={updateNavigation}
        watchOverflow
        slidesPerView={1.08}
        spaceBetween={16}
        breakpoints={{
          640: { slidesPerView: 1.9, spaceBetween: 16 },
          768: { slidesPerView: 2.55, spaceBetween: 16 },
          1024: { slidesPerView: 3, spaceBetween: 16 },
          1280: { slidesPerView: 3.2, spaceBetween: 16 },
        }}
        className="!w-full"
      >
        {reviews.map((review) => {
          const reviewer = review.customer_name?.trim() || anonymousReviewer;
          const displayDate = review.published_at ?? review.created_at;
          const productHref = review.product_slug
            ? `${basePath}/products/${review.product_slug}`
            : null;

          return (
            <SwiperSlide key={review.id} className="h-auto">
              <article className="flex h-[202px] flex-col rounded-lg border border-[#e2ddd8] bg-white p-4">
                <div className="flex items-center gap-1.5">
                  <StarRatingDisplay
                    rating={review.rating}
                    size="sm"
                    tone="dark"
                  />
                  <span className="text-xs font-medium tabular-nums text-[#39343c]">
                    {review.rating}
                  </span>
                  <span className="sr-only">out of 5</span>
                </div>
                <div className="mt-2 flex-1 overflow-hidden">
                  <p className="line-clamp-3 text-sm leading-[17px] text-[#514b50]">
                    {review.body || review.title}
                  </p>
                </div>
                <div className="mt-2 min-w-0 text-xs leading-4 text-[#716a68]">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span
                      aria-hidden="true"
                      className="grid size-8 shrink-0 place-items-center rounded-full bg-[#eee9e4] text-[11px] font-semibold text-[#514b50]"
                    >
                      {reviewer.slice(0, 1).toUpperCase()}
                    </span>
                    <p className="min-w-0 truncate">
                      <span className="font-semibold text-[#39343c]">
                        {reviewer}
                      </span>
                      {displayDate ? (
                        <>
                          <span aria-hidden="true"> | </span>
                          {formatShopReviewDate(displayDate, locale)}
                        </>
                      ) : null}
                    </p>
                  </div>
                  {review.product_name && productHref ? (
                    <p className="mt-0.5 truncate pl-9">
                      {purchasedLabel}:{" "}
                      <a
                        href={productHref}
                        className="text-[#514b50] underline decoration-[#aaa2a0] underline-offset-2 hover:text-[#242025]"
                      >
                        {review.product_name}
                      </a>
                    </p>
                  ) : null}
                </div>
              </article>
            </SwiperSlide>
          );
        })}
      </SwiperComponent>
    </div>
  );
}
