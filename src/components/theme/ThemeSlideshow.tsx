"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Children, type ReactNode, useEffect, useId, useState } from "react";

type SlideshowControls = {
  style?: string;
  background?: string;
};

export type SlideshowSettings = {
  fade_effect?: boolean;
  infinite_loop?: boolean;
  auto_rotate?: boolean;
  autoplay_speed?: number | string;
  image_animation?: boolean;
  show_arrows_desktop?: boolean;
  show_arrows_mobile?: boolean;
  show_pagination_desktop?: boolean;
  show_pagination_mobile?: boolean;
  arrow_color?: string;
  arrow_background?: string;
  pagination_color?: string;
  full_width?: boolean;
  remove_side_margins?: boolean;
  background_enabled?: boolean;
  background_color?: string;
  hide_on_mobile?: boolean;
  hide_on_desktop?: boolean;
  padding_top?: number;
  padding_bottom?: number;
  padding_top_mobile?: number;
  padding_bottom_mobile?: number;
};

export function ThemeSlideshow({
  slides: slideChildren,
  controls,
  settings = {},
  label = "Slideshow",
}: {
  slides: ReactNode[];
  controls?: SlideshowControls;
  settings?: SlideshowSettings;
  label?: string;
}) {
  const slides = Children.toArray(slideChildren);
  const [slideIndex, setActiveSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const activeSlide = Math.min(slideIndex, slides.length - 1);
  const slideshowId = useId().replaceAll(":", "");
  useEffect(() => {
    if (
      !settings.auto_rotate ||
      paused ||
      slides.length < 2 ||
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
    )
      return;
    const seconds = Math.max(1, Number(settings.autoplay_speed) || 5);
    const timer = window.setInterval(() => {
      setActiveSlide((current) =>
        settings.infinite_loop === false
          ? Math.min(current + 1, slides.length - 1)
          : (current + 1) % slides.length,
      );
    }, seconds * 1000);
    return () => window.clearInterval(timer);
  }, [
    paused,
    settings.auto_rotate,
    settings.autoplay_speed,
    settings.infinite_loop,
    slides.length,
  ]);
  if (!slides.length) return null;

  const hasControls = Boolean(controls) && slides.length > 1;
  const style = controls?.style === "dots" ? "dots" : "arrows";
  const background = controls?.background || "none";
  const hasArrowSettings =
    settings.show_arrows_desktop !== undefined ||
    settings.show_arrows_mobile !== undefined;
  const hasDotSettings =
    settings.show_pagination_desktop !== undefined ||
    settings.show_pagination_mobile !== undefined;
  const showArrows = hasArrowSettings
    ? settings.show_arrows_desktop !== false ||
      settings.show_arrows_mobile !== false
    : style === "arrows";
  const showDots = hasDotSettings
    ? settings.show_pagination_desktop !== false ||
      settings.show_pagination_mobile !== false
    : style === "dots";
  const controlClass =
    background === "circle"
      ? "rounded-full bg-white/90 text-gray-900 hover:bg-white"
      : background === "square"
        ? "rounded-md bg-white/90 text-gray-900 hover:bg-white"
        : "rounded-full bg-transparent text-white hover:bg-black/15";
  const dotClass =
    background === "circle"
      ? "rounded-full border border-white/80"
      : background === "square"
        ? "rounded-sm border border-white/80"
        : "rounded-full";

  return (
    <section
      aria-roledescription="carousel"
      aria-label={label}
      data-theme-slideshow={slideshowId}
      onFocusCapture={(event) => {
        if (!event.target.hasAttribute("data-slideshow-rotation"))
          setPaused(true);
      }}
      className={`relative w-full ${settings.full_width ? "max-w-none" : "mx-auto max-w-[1440px]"} ${settings.remove_side_margins ? "px-0" : "px-4 sm:px-6 lg:px-8"} ${settings.hide_on_mobile ? "max-md:hidden" : ""} ${settings.hide_on_desktop ? "md:hidden" : ""}`}
      style={{
        paddingTop: settings.padding_top ?? 40,
        paddingBottom: settings.padding_bottom ?? 40,
        backgroundColor: settings.background_enabled
          ? settings.background_color === "palette"
            ? "var(--marketplace-surface-warm)"
            : settings.background_color || "#f7f7f7"
          : undefined,
      }}
    >
      <style>{`@media (max-width: 767px) { [data-theme-slideshow="${slideshowId}"] { padding-top: ${settings.padding_top_mobile ?? 20}px !important; padding-bottom: ${settings.padding_bottom_mobile ?? 20}px !important; } }${settings.show_arrows_mobile === false ? ` @media (max-width: 767px) { [data-theme-slideshow="${slideshowId}"] [data-slideshow-arrows] { display: none; } }` : ""}${settings.show_arrows_desktop === false ? ` @media (min-width: 768px) { [data-theme-slideshow="${slideshowId}"] [data-slideshow-arrows] { display: none; } }` : ""}${settings.show_pagination_mobile === false ? ` @media (max-width: 767px) { [data-theme-slideshow="${slideshowId}"] [data-slideshow-dots] { display: none; } }` : ""}${settings.show_pagination_desktop === false ? ` @media (min-width: 768px) { [data-theme-slideshow="${slideshowId}"] [data-slideshow-dots] { display: none; } }` : ""}${settings.image_animation ? ` [data-theme-slideshow="${slideshowId}"] [data-theme-slide-image] { animation: theme-slide-zoom-${slideshowId} 6s ease-in-out both; } @keyframes theme-slide-zoom-${slideshowId} { from { transform: scale(1); } to { transform: scale(1.06); } }` : ""}`}</style>
      <div
        className={`relative overflow-hidden ${settings.fade_effect ? "grid" : ""}`}
      >
        {slides.map((slide, index) => (
          <fieldset
            key={index}
            aria-roledescription="slide"
            aria-hidden={index !== activeSlide}
            inert={index !== activeSlide}
            className={
              settings.fade_effect
                ? `min-w-0 transition-opacity duration-500 motion-reduce:transition-none ${index === activeSlide ? "opacity-100" : "pointer-events-none opacity-0"}`
                : index === activeSlide
                  ? "block"
                  : "hidden"
            }
            style={settings.fade_effect ? { gridArea: "1 / 1" } : undefined}
          >
            <legend className="sr-only">
              {index + 1} of {slides.length}
            </legend>
            {slide}
          </fieldset>
        ))}
        {hasControls && showArrows ? (
          <div
            data-slideshow-arrows
            className="pointer-events-none absolute inset-x-3 top-1/2 z-20 flex -translate-y-1/2 justify-between"
          >
            <button
              type="button"
              aria-label="Previous slide"
              disabled={settings.infinite_loop === false && activeSlide === 0}
              onClick={() =>
                setActiveSlide((current) =>
                  settings.infinite_loop === false
                    ? Math.max(0, current - 1)
                    : (current - 1 + slides.length) % slides.length,
                )
              }
              className={`pointer-events-auto inline-flex size-11 items-center justify-center shadow-sm disabled:opacity-40 ${controlClass}`}
              style={{
                color: settings.arrow_color,
                backgroundColor:
                  settings.arrow_background === "none"
                    ? "transparent"
                    : settings.arrow_background,
              }}
            >
              <ChevronLeft className="size-5" aria-hidden />
            </button>
            <button
              type="button"
              aria-label="Next slide"
              disabled={
                settings.infinite_loop === false &&
                activeSlide === slides.length - 1
              }
              onClick={() =>
                setActiveSlide((current) =>
                  settings.infinite_loop === false
                    ? Math.min(slides.length - 1, current + 1)
                    : (current + 1) % slides.length,
                )
              }
              className={`pointer-events-auto inline-flex size-11 items-center justify-center shadow-sm disabled:opacity-40 ${controlClass}`}
              style={{
                color: settings.arrow_color,
                backgroundColor:
                  settings.arrow_background === "none"
                    ? "transparent"
                    : settings.arrow_background,
              }}
            >
              <ChevronRight className="size-5" aria-hidden />
            </button>
          </div>
        ) : null}
      </div>
      {hasControls && showDots ? (
        <fieldset
          data-slideshow-dots
          className="flex min-w-0 flex-wrap justify-center"
        >
          <legend className="sr-only">Choose slide</legend>
          {slides.map((_, index) => (
            <button
              key={index}
              type="button"
              aria-label={`Go to slide ${index + 1}`}
              aria-current={index === activeSlide ? "true" : undefined}
              onClick={() => setActiveSlide(index)}
              className="inline-grid size-11 place-items-center rounded-full"
            >
              <span
                aria-hidden
                className={`size-2.5 ${dotClass} ${index === activeSlide ? "opacity-100" : "opacity-50"}`}
                style={{
                  backgroundColor: settings.pagination_color || "#ffffff",
                }}
              />
            </button>
          ))}
        </fieldset>
      ) : null}
      {settings.auto_rotate && slides.length > 1 ? (
        <button
          type="button"
          data-slideshow-rotation
          onClick={() => setPaused(!paused)}
          className="mx-auto flex min-h-11 items-center rounded-full px-4 text-sm underline underline-offset-4 motion-reduce:hidden"
        >
          {paused ? "Resume slideshow" : "Pause slideshow"}
        </button>
      ) : null}
    </section>
  );
}
