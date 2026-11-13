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
import type { RecommendationClickContext } from "@/lib/analytics/recommendation-click";
import { isOrganicRecommendationListId } from "@/lib/analytics/recommendation-click";
import {
  marketplaceProductHrefForProduct,
  type SellerShopListId,
  sellerShopProductHrefForProduct,
} from "@/lib/discovery-context";

interface ProductCarouselProps {
  products: Product[];
  basePath: string;
  /** Optional currency used for analytics in each ProductCard. */
  currency?: string;
  listId?: string;
  listName?: string;
  variant?: "default" | "etsy";
  spaceBetween?: number;
  mobileSlidesPerView?: number;
  sellerShopDiscovery?: {
    sellerId: string;
    listId: SellerShopListId;
    section?: string;
  };
  /** Homepage / marketplace recommendation rail section key for attribution. */
  homeRailSection?: string;
  dismissibleRecommendations?: boolean;
  onDismissRecommendation?: (product: Product) => void;
  dismissing?: boolean;
  recommendationClick?: RecommendationClickContext;
  suppressRelevanceReason?: boolean;
}

const NAV_BUTTON_BASE =
  "absolute top-1/2 z-20 flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-[#302a31] text-white shadow-lg transition-[background-color,box-shadow,opacity] duration-200 ease-out hover:bg-[#1f1b22] disabled:cursor-default disabled:opacity-35 motion-reduce:transition-none";

const NAV_BUTTON_ETSY = NAV_BUTTON_BASE;

export function ProductCarousel({
  products,
  basePath,
  currency,
  listId = "featured-products",
  listName = "Featured Products",
  variant = "default",
  spaceBetween,
  mobileSlidesPerView,
  sellerShopDiscovery,
  homeRailSection,
  dismissibleRecommendations,
  onDismissRecommendation,
  dismissing,
  recommendationClick,
  suppressRelevanceReason = false,
}: ProductCarouselProps): ReactElement {
  const t = useTranslations("products");
  const [isBeginning, setIsBeginning] = useState(true);
  const [isEnd, setIsEnd] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(products.length > 1);

  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const updateNavState = useCallback((swiper: Swiper) => {
    setIsBeginning(swiper.isBeginning);
    setIsEnd(swiper.isEnd);
    const snapCount = swiper.snapGrid?.length ?? 0;
    setHasOverflow(!swiper.isLocked && snapCount > 1);
  }, []);

  const handleBeforeInit = useCallback((swiper: Swiper) => {
    if (typeof swiper.params.navigation === "object") {
      swiper.params.navigation.prevEl = prevRef.current;
      swiper.params.navigation.nextEl = nextRef.current;
    }
  }, []);

  const handleSwiper = useCallback(
    (swiper: Swiper) => {
      swiper.navigation.init();
      swiper.navigation.update();
      updateNavState(swiper);
    },
    [updateNavState],
  );

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{t("noProductsFound")}</p>
      </div>
    );
  }

  const isEtsy = variant === "etsy";
  const navClass = isEtsy ? NAV_BUTTON_ETSY : NAV_BUTTON_BASE;
  const cardDensity = "rail";
  const showPrev = hasOverflow && !isBeginning;
  const showNext = hasOverflow && !isEnd;

  return (
    <div data-theme-carousel-navigation className="relative min-w-0 w-full">
      {!isEtsy && (
        <button
          ref={prevRef}
          type="button"
          aria-label={t("carouselPrev")}
          aria-hidden={!showPrev}
          tabIndex={showPrev ? 0 : -1}
          disabled={!showPrev}
          className={`${navClass} left-0 sm:-left-5 ${showPrev ? "" : "pointer-events-none !opacity-0"}`}
        >
          <ChevronLeft className="size-5" />
        </button>
      )}
      {isEtsy && (
        <button
          ref={prevRef}
          type="button"
          aria-label={t("carouselPrev")}
          aria-hidden={!showPrev}
          tabIndex={showPrev ? 0 : -1}
          disabled={!showPrev}
          className={`${navClass} left-1 sm:left-2 ${showPrev ? "opacity-100" : "pointer-events-none opacity-0"}`}
        >
          <ChevronLeft className="size-5" />
        </button>
      )}
      <button
        ref={nextRef}
        type="button"
        aria-label={t("carouselNext")}
        aria-hidden={!showNext}
        tabIndex={showNext ? 0 : -1}
        disabled={!showNext}
        className={`${navClass} ${isEtsy ? "right-1 sm:right-2" : "right-0 sm:-right-5"} ${showNext ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        <ChevronRight className="size-5" />
      </button>
      <div className="min-w-0 overflow-hidden">
        <SwiperComponent
          modules={[Navigation]}
          watchOverflow={false}
          spaceBetween={spaceBetween ?? 16}
          slidesPerView={mobileSlidesPerView ?? 2.2}
          navigation={{
            prevEl: prevRef.current,
            nextEl: nextRef.current,
          }}
          onBeforeInit={handleBeforeInit}
          onSwiper={handleSwiper}
          onSlideChange={updateNavState}
          onReachBeginning={updateNavState}
          onReachEnd={updateNavState}
          onAfterInit={updateNavState}
          onResize={updateNavState}
          onBreakpoint={updateNavState}
          onUpdate={updateNavState}
          breakpoints={{
            640: { slidesPerView: 3.15, spaceBetween: 16 },
            768: { slidesPerView: 4.1, spaceBetween: 16 },
            1024: { slidesPerView: 5, spaceBetween: 16 },
            1280: { slidesPerView: 5, spaceBetween: 16 },
          }}
          className="product-carousel !w-full max-w-full"
        >
          {products.map((product, index) => (
            <SwiperSlide key={product.id}>
              <ProductCard
                product={product}
                dismissibleRecommendation={dismissibleRecommendations}
                onDismissRecommendation={
                  onDismissRecommendation
                    ? () => onDismissRecommendation(product)
                    : undefined
                }
                dismissDisabled={dismissing}
                href={(() => {
                  if (sellerShopDiscovery) {
                    return sellerShopProductHrefForProduct(basePath, product, {
                      sellerId: sellerShopDiscovery.sellerId,
                      listId: sellerShopDiscovery.listId,
                      position: index,
                      section: sellerShopDiscovery.section,
                    });
                  }
                  if (isOrganicRecommendationListId(listId)) {
                    if (listId.startsWith("seller-discovery-")) {
                      const sellerId =
                        product.seller?.id ?? product.seller_id ?? undefined;
                      if (sellerId) {
                        return sellerShopProductHrefForProduct(
                          basePath,
                          product,
                          {
                            sellerId,
                            listId: listId as SellerShopListId,
                            position: index,
                          },
                        );
                      }
                    }
                    return marketplaceProductHrefForProduct(basePath, product, {
                      listId,
                      position: index,
                      section: homeRailSection,
                    });
                  }
                  return undefined;
                })()}
                recommendationClick={
                  recommendationClick
                    ? { ...recommendationClick, position: index + 1 }
                    : undefined
                }
                basePath={basePath}
                index={index}
                listId={listId}
                listName={listName}
                currency={currency}
                fetchPriority={index === 0 ? "high" : undefined}
                density={cardDensity}
                showFavorite={false}
                merchandisingSurface={
                  sellerShopDiscovery
                    ? "seller_shop"
                    : listId.startsWith("recommendation-")
                      ? "homepage_rail"
                      : "product_card"
                }
                suppressRelevanceReason={
                  suppressRelevanceReason ||
                  Boolean(sellerShopDiscovery) ||
                  listId.startsWith("recommendation-")
                }
              />
            </SwiperSlide>
          ))}
        </SwiperComponent>
      </div>
    </div>
  );
}
