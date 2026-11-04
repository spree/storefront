"use client";

import { Store } from "lucide-react";
import type { ImageProps } from "next/image";
import { ProductImage } from "./product-image";

type SellerImageProps = Omit<ImageProps, "src"> & {
  src: string | null | undefined;
  iconClassName?: string;
};

/**
 * `ProductImage` with a storefront icon placeholder, for seller logos and
 * cover photos. Lives in a `"use client"` module because Lucide components
 * cannot be passed as props from Server Components.
 */
export function SellerImage({
  iconClassName,
  ...rest
}: SellerImageProps): React.JSX.Element {
  return <ProductImage icon={Store} iconClassName={iconClassName} {...rest} />;
}
