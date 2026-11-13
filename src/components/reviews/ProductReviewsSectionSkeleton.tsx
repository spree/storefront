export function ProductReviewsSectionSkeleton({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  return (
    <section
      id="reviews"
      aria-busy="true"
      className={
        embedded
          ? "border-t border-marketplace-border-subtle pt-10 pb-4"
          : "container mx-auto border-t border-marketplace-border-subtle px-4 py-10 sm:px-6 sm:py-12 lg:px-8"
      }
    >
      <div className="flex items-center justify-between border-b border-marketplace-border-subtle pb-4">
        <div className="h-7 w-48 animate-pulse rounded-lg bg-marketplace-muted" />
        <div className="h-5 w-24 animate-pulse rounded-full bg-marketplace-muted" />
      </div>
      <div className="mt-5 rounded-lg border border-marketplace-border-subtle bg-marketplace-surface p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-16 animate-pulse rounded bg-marketplace-muted" />
            <div className="h-8 w-8 animate-pulse rounded-full bg-marketplace-muted" />
          </div>
          <div className="flex gap-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="size-[4.5rem] animate-pulse rounded-full bg-marketplace-muted"
              />
            ))}
          </div>
        </div>
      </div>
      <div className="mt-6 flex gap-2 overflow-hidden">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="h-9 w-24 shrink-0 animate-pulse rounded-full bg-marketplace-muted"
          />
        ))}
      </div>
      <div className="mt-6 space-y-0 divide-y divide-marketplace-border-subtle">
        <div className="h-32 animate-pulse bg-marketplace-muted/40 py-6" />
        <div className="h-32 animate-pulse bg-marketplace-muted/40 py-6" />
      </div>
    </section>
  );
}
