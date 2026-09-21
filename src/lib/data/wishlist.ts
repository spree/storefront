"use server";

import type { Wishlist, WishlistItem } from "@spree/sdk";
import { updateTag } from "next/cache";
import { getClient, isAuthError, withAuthRefresh } from "@/lib/spree";
import { actionResult } from "./utils";

type EnrichedWishlistItem = WishlistItem & {
  product_name?: string;
  product_slug?: string;
  thumbnail_url?: string | null;
};

async function enrichWishlistItems(wishlist: Wishlist): Promise<Wishlist> {
  if (!wishlist.items?.length) return wishlist;

  const items = wishlist.items.map((item) => {
    const nextItem = { ...item } as EnrichedWishlistItem;
    const product = nextItem.product;
    if (!product) return nextItem;

    nextItem.product_name = nextItem.product_name || product.name;
    nextItem.product_slug = nextItem.product_slug || product.slug;
    nextItem.thumbnail_url =
      nextItem.thumbnail_url || product.thumbnail_url || null;

    return nextItem;
  });

  return { ...wishlist, items };
}

async function fetchWishlistById(id: string, token: string): Promise<Wishlist> {
  const wishlist = await getClient().wishlists.get(
    id,
    {
      expand: ["items.product"],
    },
    { token },
  );

  return enrichWishlistItems(wishlist);
}

async function getOrCreateDefaultWishlist(token: string): Promise<Wishlist> {
  const response = await getClient().wishlists.list({ limit: 50 }, { token });
  const existing =
    response.data.find((wishlist) => wishlist.is_default) ?? response.data[0];

  if (existing) {
    return fetchWishlistById(existing.id, token);
  }

  const created = await getClient().wishlists.create(
    {
      name: "My Wishlist",
      is_default: true,
    },
    { token },
  );

  return fetchWishlistById(created.id, token);
}

export async function getWishlist(): Promise<Wishlist | null> {
  try {
    return await withAuthRefresh(async (options) => {
      if (!options.token) return null;
      return getOrCreateDefaultWishlist(options.token);
    });
  } catch (error) {
    if (!isAuthError(error)) {
      throw error;
    }
    return null;
  }
}

export async function addWishlistItem(variantId: string, quantity = 1) {
  return actionResult(async () => {
    const wishlist = await withAuthRefresh(async (options) => {
      if (!options.token) {
        throw new Error("Not authenticated");
      }

      const current = await getOrCreateDefaultWishlist(options.token);
      const existingItem = current.items?.find(
        (item) => item.variant_id === variantId,
      );

      if (!existingItem) {
        await getClient().wishlists.items.create(
          current.id,
          { variant_id: variantId, quantity },
          options,
        );
      }

      return fetchWishlistById(current.id, options.token);
    });

    updateTag("wishlist");
    return { wishlist };
  }, "Failed to add item to wishlist");
}

export async function removeWishlistItemByVariant(variantId: string) {
  return actionResult(async () => {
    const wishlist = await withAuthRefresh(async (options) => {
      if (!options.token) {
        throw new Error("Not authenticated");
      }

      const current = await getOrCreateDefaultWishlist(options.token);
      const existingItem = current.items?.find(
        (item) => item.variant_id === variantId,
      );

      if (!existingItem) {
        return current;
      }

      await getClient().wishlists.items.delete(
        current.id,
        existingItem.id,
        options,
      );

      return fetchWishlistById(current.id, options.token);
    });

    updateTag("wishlist");
    return { wishlist };
  }, "Failed to remove item from wishlist");
}
