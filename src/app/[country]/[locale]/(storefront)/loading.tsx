export default function StorefrontLoading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading"
      className="mx-auto w-full max-w-[var(--marketplace-container,1440px)] px-4 py-10 sm:px-6 lg:px-8"
    >
      <div className="h-8 w-2/3 max-w-md animate-pulse rounded-md bg-marketplace-muted" />
      <div className="mt-4 h-4 w-full max-w-lg animate-pulse rounded bg-marketplace-muted/80" />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="aspect-[4/5] animate-pulse rounded-lg bg-marketplace-muted"
          />
        ))}
      </div>
    </div>
  );
}
