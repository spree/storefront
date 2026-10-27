import { ProductListingSkeleton } from "@/components/products/ProductListingSkeleton";

export default function CategoryLoading(): React.JSX.Element {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-4">
      <ProductListingSkeleton />
    </div>
  );
}
