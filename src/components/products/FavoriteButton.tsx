"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { Heart } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useStoreThemeSettings } from "@/contexts/ThemeSettingsContext";
import { addFavorite, isFavorited, removeFavorite } from "@/lib/data/favorites";
import { themeSettingEnabled } from "@/lib/theme/setting-value";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  productId: string;
  variantId?: string | null;
  /** When omitted, signed-in buyers hydrate from their Favorites list. */
  favorited?: boolean;
  onChange?: (productId: string, favorited: boolean) => void;
  className?: string;
  /** Floating control over product media (white circle, larger hit target). */
  overlay?: boolean;
  /** Etsy-style text link under the buy buttons. */
  layout?: "icon" | "collection";
}

export function FavoriteButton({
  productId,
  variantId,
  favorited,
  onChange,
  className,
  overlay = false,
  layout = "icon",
}: FavoriteButtonProps) {
  const t = useTranslations("products");
  const { isAuthenticated } = useAuth();
  const { general } = useStoreThemeSettings();
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(Boolean(favorited));

  useEffect(() => {
    if (favorited !== undefined) {
      setSaved(favorited);
    }
  }, [favorited]);

  useEffect(() => {
    if (favorited !== undefined || !isAuthenticated) return;

    let cancelled = false;
    void isFavorited({
      productId,
      variantId: variantId ?? undefined,
    }).then((result) => {
      if (cancelled || !result.success) return;
      setSaved(result.favorited);
    });

    return () => {
      cancelled = true;
    };
  }, [favorited, isAuthenticated, productId, variantId]);

  if (!themeSettingEnabled(general?.enable_wishlist, true)) return null;

  const label = saved ? t("removeFavorite") : t("addFavorite");

  const toggle = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (!isAuthenticated) {
      // Guests: leave as a no-op visual prompt via aria; account gate is sign-in.
      return;
    }

    const next = !saved;
    setSaved(next);
    onChange?.(productId, next);

    startTransition(async () => {
      try {
        const result = next
          ? await addFavorite({ productId, variantId: variantId ?? undefined })
          : await removeFavorite({
              productId,
              variantId: variantId ?? undefined,
            });
        if (!result.success) {
          setSaved(!next);
          onChange?.(productId, !next);
        }
      } catch {
        setSaved(!next);
        onChange?.(productId, !next);
      }
    });
  };

  if (overlay) {
    return (
      <button
        type="button"
        className={cn(
          "pointer-events-auto absolute top-3 right-3 z-20 grid size-10 place-items-center rounded-full border border-black/10 bg-white text-marketplace-foreground shadow-sm transition-transform hover:bg-white active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#222] focus-visible:ring-offset-2 disabled:pointer-events-auto disabled:opacity-100 sm:top-4 sm:right-4 sm:size-11",
          className,
        )}
        aria-label={label}
        aria-pressed={saved}
        aria-disabled={!isAuthenticated}
        disabled={pending}
        title={!isAuthenticated ? t("favoriteSignIn") : label}
        onClick={toggle}
      >
        <Heart
          className={cn(
            "size-5",
            saved
              ? "fill-marketplace-brand text-marketplace-brand"
              : "fill-none text-marketplace-foreground",
          )}
          aria-hidden
        />
      </button>
    );
  }

  if (layout === "collection") {
    const collectionLabel = saved ? t("removeFavorite") : t("addToCollection");
    return (
      <button
        type="button"
        className={cn(
          "mx-auto flex items-center justify-center gap-2 text-[15px] font-semibold text-[#222] hover:underline disabled:opacity-60",
          className,
        )}
        aria-pressed={saved}
        aria-disabled={!isAuthenticated}
        disabled={pending}
        title={!isAuthenticated ? t("favoriteSignIn") : collectionLabel}
        onClick={toggle}
      >
        <Heart
          className={cn(
            "size-[18px]",
            saved
              ? "fill-marketplace-brand-accent text-marketplace-brand-accent"
              : "fill-none text-marketplace-brand-accent",
          )}
          aria-hidden
        />
        {collectionLabel}
      </button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon-xs"
      className={cn(
        "relative z-[2] rounded-full border-0 bg-white shadow-sm hover:bg-marketplace-accent disabled:pointer-events-auto disabled:opacity-100",
        className,
      )}
      aria-label={label}
      aria-pressed={saved}
      aria-disabled={!isAuthenticated}
      disabled={pending}
      title={!isAuthenticated ? t("favoriteSignIn") : label}
      onClick={toggle}
    >
      <Heart
        className={cn(
          "size-4",
          saved
            ? "fill-marketplace-brand text-marketplace-brand"
            : "text-marketplace-foreground",
        )}
        aria-hidden
      />
    </Button>
  );
}
