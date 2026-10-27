import { ProductListingSkeleton } from "@/components/products/ProductListingSkeleton";

export default function ProductsLoading(): React.JSX.Element {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="h-9 w-64 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
      </div>
      <ProductListingSkeleton />
    </div>
  );
}
