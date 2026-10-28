export default function ProductLoading(): React.JSX.Element {
  return (
    <div
      aria-hidden="true"
      className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse motion-reduce:animate-none"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="aspect-square rounded-lg bg-gray-200" />
        <div className="space-y-4">
          <div className="h-9 w-3/4 rounded bg-gray-200" />
          <div className="h-6 w-1/4 rounded bg-gray-200" />
          <div className="h-24 rounded bg-gray-100" />
          <div className="h-12 rounded bg-gray-200" />
        </div>
      </div>
    </div>
  );
}
