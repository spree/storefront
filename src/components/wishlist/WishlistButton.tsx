"use client";

import { Heart } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { extractBasePath } from "@/lib/utils/path";

interface WishlistButtonProps {
  variantId: string;
  size?: "default" | "sm" | "lg" | "icon" | "icon-sm" | "icon-lg";
  className?: string;
  showLabel?: boolean;
}

export function WishlistButton({
  variantId,
  size = "sm",
  className,
  showLabel = true,
}: WishlistButtonProps) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("wishlist");
  const basePath = extractBasePath(pathname);
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { hasVariant, addItem, removeItemByVariant, updating } = useWishlist();
  const [justAdded, setJustAdded] = useState(false);

  useEffect(() => {
    if (!justAdded) return;
    const timeout = setTimeout(() => setJustAdded(false), 1600);
    return () => clearTimeout(timeout);
  }, [justAdded]);

  const isInWishlist = hasVariant(variantId);

  const handleClick = async () => {
    if (authLoading) return;

    if (!isAuthenticated) {
      const signInUrl = `${basePath}/account?redirect=${encodeURIComponent(pathname)}`;
      router.push(signInUrl);
      return;
    }

    if (isInWishlist) {
      const removed = await removeItemByVariant(variantId);
      if (removed) {
        setJustAdded(false);
      }
      return;
    }

    const added = await addItem(variantId, 1);
    if (added) {
      setJustAdded(true);
    }
  };

  const label = !isAuthenticated
    ? t("addToWishlist")
    : isInWishlist
      ? justAdded
        ? t("addedToWishlist")
        : t("removeFromWishlist")
      : t("addToWishlist");

  const active = isAuthenticated && isInWishlist;

  return (
    <Button
      type="button"
      variant={active ? "secondary" : "outline"}
      size={size}
      className={className}
      disabled={authLoading || updating}
      onClick={handleClick}
      aria-label={label}
    >
      <Heart
        className="h-4 w-4"
        fill={active ? "currentColor" : "none"}
        strokeWidth={1.8}
      />
      {showLabel && <span>{label}</span>}
    </Button>
  );
}
