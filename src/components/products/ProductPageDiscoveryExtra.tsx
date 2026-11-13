import type { Product } from "@spree/sdk";
import { Suspense } from "react";
import {
  PdpRelatedDiscoveryChipsAsync,
  PdpRelatedDiscoveryExploreAsync,
} from "@/components/products/PdpRelatedDiscoveryAsync";
import { ProductPageDiscoveryRails } from "@/components/products/ProductPageDiscoveryRails";
import { ProductPageSellerShowcase } from "@/components/products/ProductPageSellerShowcase";
import { ReportListingButton } from "@/components/products/ReportListingButton";
import type { ProductPageDiscoverySkip } from "@/lib/theme/product-discovery-skip";

type ProductPageDiscoveryExtraProps = {
  product: Product;
  basePath: string;
  locale: string;
  currency?: string;
  skip?: ProductPageDiscoverySkip;
  productCount?: number;
  messagingAvailable?: boolean;
  reserveMobileStickyPurchaseSpace?: boolean;
};

export function ProductPageDiscoveryExtra(
  props: ProductPageDiscoveryExtraProps,
) {
  const { product, basePath, locale } = props;
  const messagingAvailable =
    props.messagingAvailable ?? product.messaging_available !== false;

  return (
    <div
      className={`${props.reserveMobileStickyPurchaseSpace ? "pb-28 md:pb-10" : "pb-10"} pt-2`}
      data-pdp-discovery
    >
      {product.seller ? (
        <ProductPageSellerShowcase
          seller={product.seller}
          products={[]}
          basePath={basePath}
          currency={props.currency}
          excludeProductId={product.id}
          messagingAvailable={messagingAvailable}
        />
      ) : null}

      <Suspense fallback={null}>
        <PdpRelatedDiscoveryChipsAsync product={product} basePath={basePath} />
      </Suspense>

      <Suspense fallback={null}>
        <ProductPageDiscoveryRails {...props} />
      </Suspense>

      <Suspense fallback={null}>
        <PdpRelatedDiscoveryExploreAsync
          product={product}
          basePath={basePath}
          locale={locale}
        />
      </Suspense>

      <div className="mx-auto max-w-[1400px] px-4 pt-5 md:hidden sm:px-6">
        <div className="border-t border-marketplace-border-subtle pt-4">
          <ReportListingButton productId={product.id} />
        </div>
      </div>
    </div>
  );
}
