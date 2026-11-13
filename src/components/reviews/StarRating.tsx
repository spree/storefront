"use client";

import { Star, StarHalf } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface StarRatingDisplayProps {
  rating: number;
  max?: number;
  size?: "xs" | "sm" | "md";
  showValue?: boolean;
  /** When true, renders half-filled stars (e.g. 4.5 → four full + one half). */
  fractional?: boolean;
  /** With `showValue`, show `4.5` instead of “4.5 out of 5”. */
  plainValue?: boolean;
  /** Shop review lists use solid dark stars (Etsy-style). */
  tone?: "amber" | "dark";
}

export function StarRatingDisplay({
  rating,
  max = 5,
  size = "md",
  showValue = false,
  fractional = false,
  plainValue = false,
  tone = "amber",
}: StarRatingDisplayProps) {
  const t = useTranslations("reviews");
  const iconClass =
    size === "xs" ? "w-3.5 h-3.5" : size === "sm" ? "w-4 h-4" : "w-5 h-5";
  const starGap = size === "xs" ? "gap-0" : "gap-0.5";
  const clamped = Math.max(0, Math.min(max, rating));
  const rounded = Math.max(0, Math.min(max, Math.round(clamped)));
  const filledClass =
    tone === "dark"
      ? "fill-[#222] text-[#222]"
      : "fill-[#f3cc3e] text-[#f3cc3e]";
  const emptyClass = "fill-transparent text-[#d8d8d8]";

  return (
    <div
      className={`inline-flex items-center ${starGap}`}
      role="img"
      aria-label={t("ratingOutOf", {
        rating: clamped.toFixed(1),
        max: String(max),
      })}
    >
      <span className="inline-flex" aria-hidden="true">
        {Array.from({ length: max }, (_, index) => {
          if (fractional) {
            const remainder = clamped - index;
            if (remainder >= 1) {
              return (
                <Star key={index} className={`${iconClass} ${filledClass}`} />
              );
            }
            if (remainder >= 0.25) {
              return (
                <StarHalf
                  key={index}
                  className={`${iconClass} ${filledClass}`}
                />
              );
            }
            return (
              <Star key={index} className={`${iconClass} ${emptyClass}`} />
            );
          }
          const filled = index < rounded;
          return (
            <Star
              key={index}
              className={`${iconClass} ${filled ? filledClass : emptyClass}`}
            />
          );
        })}
      </span>
      {showValue ? (
        <span aria-hidden="true" className="text-sm font-normal text-[#222]">
          {plainValue
            ? clamped.toFixed(1)
            : t("ratingOutOf", { rating: clamped.toFixed(1), max })}
        </span>
      ) : null}
    </div>
  );
}

interface StarRatingInputProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  disabled?: boolean;
}

export function StarRatingInput({
  value,
  onChange,
  label,
  disabled = false,
}: StarRatingInputProps) {
  const t = useTranslations("reviews");
  const [hovered, setHovered] = useState(0);
  const activeValue = hovered || value;

  return (
    <div
      className="inline-flex gap-1"
      role="radiogroup"
      aria-label={label ?? t("ratingLabel")}
      aria-required="true"
    >
      {Array.from({ length: 5 }, (_, index) => {
        const star = index + 1;
        const filled = star <= activeValue;
        return (
          // biome-ignore lint/a11y/useSemanticElements: icon buttons for larger tap targets in star picker
          <button
            key={star}
            type="button"
            disabled={disabled}
            role="radio"
            aria-checked={value === star}
            className="rounded p-0.5 transition-transform duration-150 ease-out hover:scale-110 focus-visible:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
            onPointerEnter={() => setHovered(star)}
            onPointerLeave={() => setHovered(0)}
            onFocus={() => setHovered(star)}
            onBlur={() => setHovered(0)}
            onClick={() => onChange(star)}
          >
            <Star
              className={`size-8 transition-colors duration-150 ${
                filled ? "fill-amber-400 text-amber-400" : "text-gray-300"
              }`}
            />
            <span className="sr-only">{t("starLabel", { count: star })}</span>
          </button>
        );
      })}
    </div>
  );
}
