"use client";

import type { StoreImage } from "@spree/sdk";
import Image from "next/image";
import { useState } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  ImagePlaceholderIcon,
  SearchPlusIcon,
} from "@/components/icons";

/** Tiny 10×10 neutral gray PNG used as a blur placeholder while images load. */
const BLUR_PLACEHOLDER =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAIElEQVQYV2P4////MwwMDAxMDAwMDGQJMJCvkGwNZCsEAGebBwVss9lRAAAAAElFTkSuQmCC";

interface MediaGalleryProps {
  images: StoreImage[];
  productName: string;
}

export function MediaGallery({ images, productName }: MediaGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);

  if (images.length === 0) {
    return (
      <div className="relative aspect-square bg-gray-100 rounded-xl flex items-center justify-center">
        <span className="text-gray-400">No image available</span>
      </div>
    );
  }

  const selectedImage = images[selectedIndex];
  const mainImageUrl = selectedImage?.original_url || null;

  return (
    <div className="flex flex-col gap-4">
      {/* Main Image */}
      <div
        className="relative aspect-square bg-gray-100 rounded-xl overflow-hidden cursor-zoom-in"
        onClick={() => mainImageUrl && setIsZoomed(true)}
      >
        {mainImageUrl ? (
          <Image
            src={mainImageUrl}
            alt={selectedImage?.alt || productName}
            fill
            className="object-cover"
            priority
            quality={85}
            sizes="(max-width: 768px) 100vw, 50vw"
            placeholder="blur"
            blurDataURL={BLUR_PLACEHOLDER}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            <ImagePlaceholderIcon className="w-24 h-24" />
          </div>
        )}
        {/* Zoom hint */}
        {mainImageUrl && (
          <div className="absolute bottom-4 right-4 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm text-gray-600 flex items-center gap-1.5">
            <SearchPlusIcon className="w-4 h-4" />
            Click to zoom
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {images.map((image, index) => {
            const thumbUrl = image.original_url;
            return (
              <button
                key={image.id}
                onClick={() => setSelectedIndex(index)}
                className={`relative w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-colors bg-gray-100 ${
                  index === selectedIndex
                    ? "border-primary-600"
                    : "border-transparent hover:border-gray-300"
                }`}
              >
                {thumbUrl ? (
                  <Image
                    src={thumbUrl}
                    alt={image.alt || `${productName} ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                    <ImagePlaceholderIcon className="w-8 h-8" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Lightbox */}
      {isZoomed && mainImageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setIsZoomed(false)}
        >
          <button
            className="absolute top-4 right-4 text-white p-2 hover:bg-white/10 rounded-full transition-colors"
            onClick={() => setIsZoomed(false)}
            aria-label="Close lightbox"
          >
            <CloseIcon className="w-8 h-8" />
          </button>

          {/* Navigation arrows */}
          {images.length > 1 && (
            <>
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white p-2 hover:bg-white/10 rounded-full transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedIndex((prev) =>
                    prev === 0 ? images.length - 1 : prev - 1,
                  );
                }}
                aria-label="Previous image"
              >
                <ChevronLeftIcon className="w-8 h-8" />
              </button>
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white p-2 hover:bg-white/10 rounded-full transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedIndex((prev) =>
                    prev === images.length - 1 ? 0 : prev + 1,
                  );
                }}
                aria-label="Next image"
              >
                <ChevronRightIcon className="w-8 h-8" />
              </button>
            </>
          )}

          <div className="relative max-w-4xl max-h-[90vh] w-full h-full m-4">
            <Image
              src={selectedImage?.original_url || mainImageUrl!}
              alt={selectedImage?.alt || productName}
              fill
              className="object-contain"
              sizes="100vw"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Image counter */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white bg-black/50 px-3 py-1 rounded-full text-sm">
              {selectedIndex + 1} / {images.length}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
