"use client";

import { useState } from "react";

type ShopStoryPhoto = { id: number; url: string; caption: string };

export function ShopStoryPhotos({ photos }: { photos: ShopStoryPhoto[] }) {
  const [unavailable, setUnavailable] = useState<number[]>([]);
  const visiblePhotos = photos.filter(
    (photo) => !unavailable.includes(photo.id),
  );

  if (!visiblePhotos.length) return null;

  return (
    <div className="grid grid-cols-2 gap-3">
      {visiblePhotos.map((photo) => (
        <figure
          key={photo.id}
          className={`min-w-0 ${visiblePhotos.length === 1 ? "col-span-2" : ""}`}
        >
          {/* biome-ignore lint/performance/noImgElement: ActiveStorage shop story photos */}
          <img
            src={photo.url}
            alt={photo.caption}
            loading="lazy"
            onError={() => setUnavailable((current) => [...current, photo.id])}
            className={`${visiblePhotos.length === 1 ? "aspect-[3/2]" : "aspect-square"} w-full object-cover`}
          />
          {photo.caption ? (
            <figcaption className="mt-1.5 break-words text-xs text-marketplace-muted-foreground [overflow-wrap:anywhere]">
              {photo.caption}
            </figcaption>
          ) : null}
        </figure>
      ))}
    </div>
  );
}
