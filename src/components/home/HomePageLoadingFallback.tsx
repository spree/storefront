/**
 * Shown while {@link HomePageContent} resolves theme and personalization data.
 * Intentionally not a marketing hero — the previous fallback rendered the full
 * split promo and flashed on every home load.
 */
export function HomePageLoadingFallback() {
  return (
    <div
      role="status"
      className="min-h-svh bg-marketplace-background"
      aria-busy="true"
      aria-label="Loading homepage"
    >
      <div
        aria-hidden="true"
        className="mx-auto max-w-[var(--marketplace-container,1440px)] px-4 py-8 sm:px-6 lg:px-8"
      >
        <div className="grid gap-6 rounded-lg bg-marketplace-surface-warm p-6 md:grid-cols-2 md:items-center">
          <div className="space-y-4">
            <div className="h-9 w-3/4 rounded-md bg-marketplace-accent" />
            <div className="h-4 w-2/3 rounded bg-marketplace-accent" />
            <div className="h-11 w-32 rounded-md bg-marketplace-accent" />
          </div>
          <div className="aspect-[5/3] rounded-md bg-marketplace-accent max-md:order-first" />
        </div>
        <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="aspect-square rounded-lg bg-marketplace-surface-subtle"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
