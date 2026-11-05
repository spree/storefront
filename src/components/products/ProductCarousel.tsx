"use client";

import type { Product } from "@spree/sdk";
import type { ReactElement } from "react";
import { useCallback, useRef, useState } from "react";
import type Swiper from "swiper";
import { Navigation } from "swiper/modules";
import { Swiper as SwiperComponent, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { ProductCard } from "@/components/products/ProductCard";

interface ProductCarouselProps {
  products: Product[];
  basePath: string;
  /** Optional currency used for analytics in each ProductCard. */
  currency?: string;
  /** Analytics list the cards belong to. */
  listId?: string;
  listName?: string;
  /**
   * Fetch the first card's image at high priority. Only the carousel nearest
   * the top of the page should, so several carousels don't compete.
   */
  prioritizeFirst?: boolean;
}

const NAV_BUTTON_BASE =
  "absolute top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center cursor-pointer rounded-lg bg-white border border-gray-300 text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors";

export function ProductCarousel({
  products,
  basePath,
  currency,
  listId = "featured-products",
  listName = "Featured Products",
  prioritizeFirst = true,
}: ProductCarouselProps): ReactElement {
  const t = useTranslations("products");
  const [isBeginning, setIsBeginning] = useState(true);
  const [isEnd, setIsEnd] = useState(false);

  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  const handleBeforeInit = useCallback((swiper: Swiper) => {
    if (typeof swiper.params.navigation === "object") {
      swiper.params.navigation.prevEl = prevRef.current;
      swiper.params.navigation.nextEl = nextRef.current;
    }
  }, []);

  const updateNavState = useCallback((swiper: Swiper) => {
    setIsBeginning(swiper.isBeginning);
    setIsEnd(swiper.isEnd);
  }, []);

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{t("noProductsFound")}</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        ref={prevRef}
        type="button"
        aria-label={t("carouselPrev")}
        disabled={isBeginning}
        className={`${NAV_BUTTON_BASE} -left-5 ${isBeginning ? "opacity-0" : ""}`}
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        ref={nextRef}
        type="button"
        aria-label={t("carouselNext")}
        disabled={isEnd}
        className={`${NAV_BUTTON_BASE} -right-5 ${isEnd ? "opacity-0" : ""}`}
      >
        <ChevronRight className="w-5 h-5" />
      </button>
      <SwiperComponent
        modules={[Navigation]}
        spaceBetween={24}
        slidesPerView={1}
        navigation={{
          prevEl: prevRef.current,
          nextEl: nextRef.current,
        }}
        onBeforeInit={handleBeforeInit}
        onSlideChange={updateNavState}
        onReachBeginning={updateNavState}
        onReachEnd={updateNavState}
        onAfterInit={updateNavState}
        breakpoints={{
          640: { slidesPerView: 2, spaceBetween: 24 },
          768: { slidesPerView: 3, spaceBetween: 24 },
          1024: { slidesPerView: 4, spaceBetween: 24 },
        }}
        className="product-carousel"
      >
        {products.map((product, index) => (
          <SwiperSlide key={product.id} className="p-1">
            <ProductCard
              product={product}
              basePath={basePath}
              index={index}
              listId={listId}
              listName={listName}
              currency={currency}
              fetchPriority={
                prioritizeFirst && index === 0 ? "high" : undefined
              }
            />
          </SwiperSlide>
        ))}
      </SwiperComponent>
    </div>
  );
}
