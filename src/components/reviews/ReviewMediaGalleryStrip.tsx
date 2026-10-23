"use client";

import type { ProductReview } from "@spree/sdk";
import { useState } from "react";
import { ReviewMediaLightbox } from "./ReviewMediaLightbox";
import { flattenReviewMedia } from "./review-media-items";

type ReviewMediaGalleryStripProps = {
  reviews: ProductReview[];
};

export function ReviewMediaGalleryStrip({
  reviews,
}: ReviewMediaGalleryStripProps) {
  const items = reviews.flatMap((review) =>
    flattenReviewMedia(review.images, review.videos).map((item) => ({
      ...item,
      reviewId: review.id,
    })),
  );
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (items.length === 0) return null;

  return (
    <>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {items.slice(0, 12).map((item, index) => (
          <button
            key={`${item.reviewId}-${item.url}`}
            type="button"
            className="relative size-16 shrink-0 overflow-hidden rounded-md border border-[#e1e3df] bg-[#f5f5f5]"
            onClick={() => setOpenIndex(index)}
          >
            {item.kind === "video" ? (
              <video src={item.url} className="size-full object-cover" muted />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.url} alt="" className="size-full object-cover" />
            )}
          </button>
        ))}
      </div>
      {openIndex != null ? (
        <ReviewMediaLightbox
          items={items}
          activeIndex={openIndex}
          onClose={() => setOpenIndex(null)}
          onNavigate={setOpenIndex}
        />
      ) : null}
    </>
  );
}
