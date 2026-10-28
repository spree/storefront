export default function PolicyLoading(): React.JSX.Element {
  return (
    <div
      aria-hidden="true"
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-pulse motion-reduce:animate-none"
    >
      <div className="h-9 w-64 rounded bg-gray-200 mb-8" />
      <div className="space-y-3">
        <div className="h-4 rounded bg-gray-100" />
        <div className="h-4 rounded bg-gray-100" />
        <div className="h-4 w-2/3 rounded bg-gray-100" />
      </div>
    </div>
  );
}
