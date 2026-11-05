const SKELETON_CARDS = Array.from({ length: 6 }, (_, i) => i);

export default function CollectionsLoading(): React.JSX.Element {
  return (
    <div
      aria-hidden="true"
      className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse motion-reduce:animate-none"
    >
      <div className="mb-8">
        <div className="h-9 w-48 rounded bg-gray-200" />
        <div className="mt-3 h-4 w-80 max-w-full rounded bg-gray-100" />
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {SKELETON_CARDS.map((i) => (
          <div
            key={i}
            className="overflow-hidden rounded-lg border border-gray-200"
          >
            <div className="aspect-[4/3] bg-gray-100" />
            <div className="p-5">
              <div className="h-5 w-40 rounded bg-gray-200" />
              <div className="mt-2 h-4 w-24 rounded bg-gray-100" />
              <div className="mt-3 h-4 rounded bg-gray-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
