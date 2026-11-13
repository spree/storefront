"use client";

import type { CSSProperties } from "react";
import { useState } from "react";

interface SellerAboutContentProps {
  html: string;
  accentTextColor?: string;
  readMoreLabel: string;
  readLessLabel: string;
  /** Plain-text length above which the excerpt + read more toggle appears. */
  collapseThreshold?: number;
  plainTextLength: number;
}

export function SellerAboutContent({
  html,
  accentTextColor,
  readMoreLabel,
  readLessLabel,
  collapseThreshold = 480,
  plainTextLength,
}: SellerAboutContentProps) {
  const collapsible = plainTextLength > collapseThreshold;
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <article
        style={
          {
            "--seller-about-story-color": accentTextColor ?? "#222222",
          } as CSSProperties
        }
        className={`prose prose-sm max-w-3xl prose-p:text-[var(--marketplace-seller-accent-text,var(--seller-about-story-color,#222))] prose-headings:font-semibold prose-headings:text-[var(--marketplace-seller-accent-text,var(--seller-about-story-color,#222))] prose-a:text-[var(--marketplace-seller-accent-text,var(--seller-about-story-color,#222))] prose-a:underline prose-strong:text-[var(--marketplace-seller-accent-text,var(--seller-about-story-color,#222))] prose-li:text-[var(--marketplace-seller-accent-text,var(--seller-about-story-color,#222))] [&_*]:!text-[var(--marketplace-seller-accent-text,var(--seller-about-story-color,#222))] ${
          collapsible && !expanded ? "max-h-[14rem] overflow-hidden" : ""
        }`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {collapsible ? (
        <button
          type="button"
          className="mt-3 text-sm font-medium text-[var(--marketplace-seller-accent-text,var(--seller-about-story-color,#222))] underline underline-offset-2 decoration-current/40 hover:decoration-current"
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
        >
          {expanded ? readLessLabel : readMoreLabel}
        </button>
      ) : null}
    </div>
  );
}
