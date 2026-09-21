"use client";

import type { Wishlist, WishlistItem } from "@spree/sdk";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  addWishlistItem as addWishlistItemAction,
  getWishlist as getWishlistAction,
  removeWishlistItemByVariant as removeWishlistItemByVariantAction,
} from "@/lib/data/wishlist";

interface WishlistContextType {
  wishlist: Wishlist | null;
  loading: boolean;
  updating: boolean;
  error: string | null;
  itemCount: number;
  refreshWishlist: () => Promise<void>;
  addItem: (variantId: string, quantity?: number) => Promise<boolean>;
  removeItemByVariant: (variantId: string) => Promise<boolean>;
  hasVariant: (variantId: string) => boolean;
  findItemByVariant: (variantId: string) => WishlistItem | undefined;
}

const WishlistContext = createContext<WishlistContextType | undefined>(
  undefined,
);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [wishlist, setWishlist] = useState<Wishlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const t = useTranslations("wishlist");
  const failedToLoadMessageRef = useRef("Could not load your wishlist.");

  useEffect(() => {
    failedToLoadMessageRef.current = t("failedToLoad");
  }, [t]);

  const refreshWishlist = useCallback(async () => {
    if (!isAuthenticated) {
      setWishlist(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const nextWishlist = await getWishlistAction();
      setWishlist(nextWishlist);
    } catch {
      setError(failedToLoadMessageRef.current);
      setWishlist(null);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (authLoading) return;
    refreshWishlist();
  }, [authLoading, refreshWishlist]);

  const mutateWishlist = useCallback(
    async (
      action: () => Promise<{
        success: boolean;
        wishlist?: Wishlist;
        error?: string;
      }>,
      fallbackMessage: string,
    ): Promise<boolean> => {
      setUpdating(true);
      setError(null);
      try {
        const result = await action();
        if (!result.success) {
          const message = result.error || fallbackMessage;
          setError(message);
          toast.error(message);
          return false;
        }

        setWishlist(result.wishlist ?? null);
        router.refresh();
        return true;
      } catch (cause) {
        const message =
          cause instanceof Error ? cause.message : fallbackMessage;
        setError(message);
        toast.error(message);
        return false;
      } finally {
        setUpdating(false);
      }
    },
    [router],
  );

  const addItem = useCallback(
    async (variantId: string, quantity = 1) => {
      return mutateWishlist(
        () => addWishlistItemAction(variantId, quantity),
        t("failedToAdd"),
      );
    },
    [mutateWishlist, t],
  );

  const removeItemByVariant = useCallback(
    async (variantId: string) => {
      return mutateWishlist(
        () => removeWishlistItemByVariantAction(variantId),
        t("failedToRemove"),
      );
    },
    [mutateWishlist, t],
  );

  const hasVariant = useCallback(
    (variantId: string) =>
      !!wishlist?.items?.some((item) => item.variant_id === variantId),
    [wishlist],
  );

  const findItemByVariant = useCallback(
    (variantId: string) =>
      wishlist?.items?.find((item) => item.variant_id === variantId),
    [wishlist],
  );

  const itemCount = wishlist?.items?.length ?? 0;

  const value = useMemo<WishlistContextType>(
    () => ({
      wishlist,
      loading,
      updating,
      error,
      itemCount,
      refreshWishlist,
      addItem,
      removeItemByVariant,
      hasVariant,
      findItemByVariant,
    }),
    [
      wishlist,
      loading,
      updating,
      error,
      itemCount,
      refreshWishlist,
      addItem,
      removeItemByVariant,
      hasVariant,
      findItemByVariant,
    ],
  );

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
}
