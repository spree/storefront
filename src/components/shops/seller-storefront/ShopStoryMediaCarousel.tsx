"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ShopStoryMedia = {
  id: string;
  kind: "video" | "photo";
  url: string;
  caption: string;
};

type ShopStoryMediaCarouselProps = {
  videoUrl?: string | null;
  videoCaption?: string | null;
  videoCaptionsUrl?: string | null;
  photos: Array<{ id: number; url: string; caption: string }>;
  shopName: string;
};

export function ShopStoryMediaCarousel({
  videoUrl,
  videoCaption,
  videoCaptionsUrl,
  photos,
  shopName,
}: ShopStoryMediaCarouselProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [failedIds, setFailedIds] = useState<string[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);

  const media = useMemo(() => {
    const items: ShopStoryMedia[] = [];
    if (videoUrl?.trim()) {
      items.push({
        id: "shop-video",
        kind: "video",
        url: videoUrl,
        caption: videoCaption?.trim() ?? "",
      });
    }
    for (const photo of photos) {
      if (photo.url?.trim()) {
        items.push({
          id: `shop-photo-${photo.id}`,
          kind: "photo",
          url: photo.url,
          caption: photo.caption ?? "",
        });
      }
    }
    return items.filter((item) => !failedIds.includes(item.id));
  }, [failedIds, photos, videoCaption, videoUrl]);

  const activeIndex = Math.max(
    0,
    media.findIndex((item) => item.id === activeId),
  );
  const activeMedia = media[activeIndex];

  useEffect(() => {
    if (!media.length) {
      setActiveId(null);
      return;
    }
    if (!activeId || !media.some((item) => item.id === activeId)) {
      setActiveId(media[0].id);
      setIsPlaying(false);
    }
  }, [activeId, media]);

  if (!activeMedia) return null;

  function stopVideo() {
    setIsPlaying(false);
    if (videoRef.current && !videoRef.current.paused) videoRef.current.pause();
  }

  function moveTo(index: number) {
    const nextIndex = (index + media.length) % media.length;
    stopVideo();
    setActiveId(media[nextIndex].id);
  }

  async function playVideo() {
    try {
      await videoRef.current?.play();
    } catch {
      setIsPlaying(false);
    }
  }

  return (
    <div className="mt-4" data-shop-story-carousel>
      <div className="group relative aspect-[3/2] overflow-hidden rounded-sm bg-black">
        {activeMedia.kind === "video" ? (
          // biome-ignore lint/a11y/useMediaCaption: Seller-provided WebVTT captions are optional.
          <video
            key={activeMedia.id}
            ref={videoRef}
            controls={isPlaying}
            playsInline
            preload="metadata"
            className="h-full w-full object-cover"
            src={activeMedia.url}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
            onError={() => {
              setIsPlaying(false);
              setFailedIds((current) => [...current, activeMedia.id]);
            }}
          >
            {videoCaptionsUrl ? (
              <track
                kind="captions"
                src={videoCaptionsUrl}
                srcLang="und"
                label="Captions"
                default
              />
            ) : null}
          </video>
        ) : (
          // biome-ignore lint/performance/noImgElement: ActiveStorage shop story photos.
          <img
            key={activeMedia.id}
            src={activeMedia.url}
            alt={activeMedia.caption || `${shopName} shop photo`}
            loading="lazy"
            onError={() =>
              setFailedIds((current) => [...current, activeMedia.id])
            }
            className="h-full w-full object-cover"
          />
        )}

        {activeMedia.kind === "video" && !isPlaying ? (
          <button
            type="button"
            onClick={playVideo}
            aria-label={`Play shop video for ${shopName}`}
            className="absolute left-1/2 top-1/2 flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-orange-600 text-white shadow-lg transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="ml-1 size-6 fill-current"
            >
              <path d="M7 4.5v15l12-7.5z" />
            </svg>
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => moveTo(activeIndex - 1)}
          aria-label="Previous shop photo or video"
          disabled={media.length < 2}
          className="absolute left-0 top-1/2 flex h-14 w-9 -translate-y-1/2 items-center justify-center rounded-r-sm bg-white/95 text-neutral-900 shadow-sm transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 disabled:cursor-default disabled:hover:bg-white"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="size-4 fill-none stroke-current stroke-2"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => moveTo(activeIndex + 1)}
          aria-label="Next shop photo or video"
          disabled={media.length < 2}
          className="absolute right-0 top-1/2 flex h-14 w-9 -translate-y-1/2 items-center justify-center rounded-l-sm bg-white/95 text-neutral-900 shadow-sm transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 disabled:cursor-default disabled:hover:bg-white"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="size-4 fill-none stroke-current stroke-2"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </div>
      {activeMedia.caption ? (
        <p className="mt-1.5 text-xs leading-relaxed text-[var(--marketplace-seller-accent-muted,currentColor)]">
          {activeMedia.caption}
        </p>
      ) : null}
      {media.length > 1 ? (
        <span className="sr-only" aria-live="polite">
          {activeIndex + 1} of {media.length}
        </span>
      ) : null}
    </div>
  );
}
