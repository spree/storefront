import Image from "next/image";
import type { ImgHTMLAttributes } from "react";
import type { SellerBadgeKey } from "@/lib/seller-badges/keys";

export type SellerBadgeIconSize = 14 | 16 | 20 | 24 | 32 | 48;

export type SellerBadgeIconProps = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "alt" | "children" | "height" | "src" | "width"
> & {
  badgeKey: SellerBadgeKey;
  size?: SellerBadgeIconSize;
  title?: string;
};

const KEY_TO_ASSET: Record<SellerBadgeKey, string> = {
  verified_seller: "verified-seller",
  star_seller: "top-shop",
  top_shop: "top-shop",
  highly_rated: "highly-rated",
  fast_responder: "fast-responder",
  on_time_shipping: "on-time-shipping",
  established_seller: "established-seller",
  marketplace_pick: "marketplace-pick",
};

export function sellerBadgeAssetPath(badgeKey: SellerBadgeKey): string {
  return `/assets/seller-badges/${KEY_TO_ASSET[badgeKey]}.svg`;
}

export function SellerBadgeIcon({
  badgeKey,
  size = 24,
  title,
  className,
  ...props
}: SellerBadgeIconProps) {
  return (
    <Image
      src={sellerBadgeAssetPath(badgeKey)}
      width={size}
      height={size}
      alt={title ?? ""}
      title={title}
      aria-hidden={title ? undefined : true}
      className={className}
      draggable={false}
      {...props}
    />
  );
}
