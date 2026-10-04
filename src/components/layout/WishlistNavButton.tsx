"use client";

import { Heart } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useWishlist } from "@/contexts/WishlistContext";
import { extractBasePath } from "@/lib/utils/path";

export function WishlistNavButton() {
  const pathname = usePathname();
  const basePath = extractBasePath(pathname);
  const t = useTranslations("header");
  const { itemCount } = useWishlist();
  const ariaLabel =
    itemCount > 0 ? `${t("wishlist")} (${itemCount})` : t("wishlist");

  return (
    <Button variant="ghost" size="icon-lg" asChild className="relative">
      <Link href={`${basePath}/account/wishlist`} aria-label={ariaLabel}>
        <Heart className="size-5" />
        {itemCount > 0 && (
          <span className="absolute top-0 right-0 bg-primary text-white text-xs font-medium rounded-full h-5 w-5 flex items-center justify-center">
            {itemCount}
          </span>
        )}
      </Link>
    </Button>
  );
}
