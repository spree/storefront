/** PDP placeholder when a product has no published reviews yet. */
export function ProductReviewsEmptyState({
  heading,
  description,
}: {
  heading: string;
  description: string;
}) {
  return (
    <div
      className="mt-6 flex items-start gap-4"
      data-testid="product-reviews-empty"
    >
      <div
        className="flex size-12 shrink-0 items-center justify-center rounded-full bg-marketplace-surface-subtle text-marketplace-brand-accent"
        aria-hidden="true"
      >
        <ShiningStarIllustration />
      </div>
      <div className="min-w-0 pt-0.5">
        <p className="text-base font-semibold leading-snug text-marketplace-foreground">
          {heading}
        </p>
        <p className="mt-1.5 max-w-md text-sm leading-relaxed text-marketplace-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}

function ShiningStarIllustration() {
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 72 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-marketplace-brand-accent"
    >
      <g stroke="currentColor" strokeLinecap="round" strokeWidth="1.75">
        <path d="M36 8v6M36 58v6M8 36h6M58 36h6" />
        <path d="M17 17l4.5 4.5M50.5 50.5 55 55M55 17l-4.5 4.5M17 55l4.5-4.5" />
      </g>
      <path
        d="M36 22l3.2 9.8h10.3l-8.3 6 3.2 9.8L36 41.6l-8.4 6 3.2-9.8-8.3-6h10.3L36 22z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.75"
      />
    </svg>
  );
}
