import { ProductListingSkeleton } from "@/components/products/ProductListingSkeleton";

export default function CollectionLoading(): React.JSX.Element {
  return (
    <div className="pb-8">
      <div
        aria-hidden="true"
        className="flex min-h-[350px] flex-col justify-end bg-gray-50 animate-pulse motion-reduce:animate-none"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-4 h-4 w-40 rounded bg-gray-200" />
          <div className="mb-4 h-10 w-72 rounded bg-gray-200" />
          <div className="mb-4 h-4 w-96 max-w-full rounded bg-gray-100" />
        </div>
      </div>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <ProductListingSkeleton />
      </div>
    </div>
  );
}
