"use client";

import type { ReactElement } from "react";
import { useCallback, useRef, useState } from "react";
import type Swiper from "swiper";
import { Navigation } from "swiper/modules";
import { Swiper as SwiperComponent, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { ProductCard } from "@/components/products/ProductCard";
import { useCarouselProducts } from "@/hooks/useCarouselProducts";

interface ProductCarouselProps {
  taxonId?: string;
  limit?: number;
  basePath: string;
}

const NAV_BUTTON_BASE =
  "absolute top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center cursor-pointer rounded-full bg-white border border-gray-300 text-gray-600 shadow-md hover:bg-gray-100 hover:text-gray-900 transition-colors";

export function ProductCarousel({
  taxonId,
  limit = 8,
  basePath,
}: ProductCarouselProps): ReactElement {
  const { products, loading, error } = useCarouselProducts({ taxonId, limit });
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

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="aspect-square bg-gray-200 rounded-xl mb-4" />
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-1/4" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No products found.</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        ref={prevRef}
        type="button"
        aria-label="Previous products"
        disabled={isBeginning}
        className={`${NAV_BUTTON_BASE} -left-5 ${isBeginning ? "opacity-0" : ""}`}
      >
        <ChevronLeftIcon className="w-5 h-5" />
      </button>
      <button
        ref={nextRef}
        type="button"
        aria-label="Next products"
        disabled={isEnd}
        className={`${NAV_BUTTON_BASE} -right-5 ${isEnd ? "opacity-0" : ""}`}
      >
        <ChevronRightIcon className="w-5 h-5" />
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
        {products.map((product) => (
          <SwiperSlide key={product.id} className="p-1">
            <ProductCard product={product} basePath={basePath} />
          </SwiperSlide>
        ))}
      </SwiperComponent>
    </div>
  );
}
