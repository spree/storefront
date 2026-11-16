"use client";

import { FollowShopButton } from "@/components/shops/FollowShopButton";

interface FeaturedShopFavoriteButtonProps {
  sellerId: string;
  shopPath: string;
}

export function FeaturedShopFavoriteButton({
  sellerId,
  shopPath,
}: FeaturedShopFavoriteButtonProps) {
  return (
    <div
      className="absolute right-3 top-3 z-10"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <FollowShopButton
        sellerId={sellerId}
        returnTo={shopPath}
        iconOnly
        className="size-11"
      />
    </div>
  );
}
