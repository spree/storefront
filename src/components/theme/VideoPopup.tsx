"use client";

import { Play, X } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ProductImage } from "@/components/ui/product-image";

export function VideoPopup({
  src,
  poster,
  title,
  captionsUrl,
  language,
}: {
  src: string;
  poster?: string;
  title: string;
  captionsUrl?: string;
  language?: string;
}) {
  return (
    <Dialog>
      <DialogTrigger
        type="button"
        className="group relative block aspect-video w-full overflow-hidden rounded-md bg-black text-white"
        aria-label={`Play ${title || "video"}`}
      >
        {poster ? (
          <ProductImage
            src={poster}
            alt=""
            fill
            unoptimized={!poster.startsWith("/")}
            sizes="(max-width: 768px) 100vw, 1280px"
            className="object-cover opacity-85 transition group-hover:opacity-100"
          />
        ) : null}
        <span className="absolute inset-0 grid place-items-center">
          <span className="grid size-16 place-items-center rounded-full bg-black/70">
            <Play className="size-6 fill-current" aria-hidden />
          </span>
        </span>
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100dvh-2rem)] max-w-[calc(100%-2rem)] gap-2 overflow-y-auto sm:max-w-5xl"
      >
        <div className="flex items-center justify-between gap-3">
          <DialogTitle>{title || "Video"}</DialogTitle>
          <DialogClose
            className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-marketplace-surface-subtle"
            aria-label="Close video"
          >
            <X className="size-5" aria-hidden />
          </DialogClose>
        </div>
        <DialogDescription className={captionsUrl ? "sr-only" : undefined}>
          {captionsUrl
            ? "Captions are available in the video controls."
            : "Captions are unavailable for this video."}
        </DialogDescription>
        {captionsUrl ? (
          <video
            src={src}
            controls
            autoPlay
            playsInline
            className="max-h-[72dvh] w-full rounded-md bg-black"
          >
            <track
              kind="captions"
              src={captionsUrl}
              srcLang={language}
              label="Captions"
            />
          </video>
        ) : (
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 w-fit items-center font-medium underline underline-offset-4"
          >
            Open video in a new tab
          </a>
        )}
      </DialogContent>
    </Dialog>
  );
}
