import type { Wishlist } from "@spree/sdk";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/data/wishlist", () => ({
  getWishlist: vi.fn(),
  addWishlistItem: vi.fn(),
  removeWishlistItemByVariant: vi.fn(),
}));

let authenticated = true;

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ isAuthenticated: authenticated, loading: false }),
}));

const translate = (key: string) => key;

vi.mock("next-intl", () => ({
  useTranslations: () => translate,
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}));

import { useWishlist, WishlistProvider } from "@/contexts/WishlistContext";
import {
  addWishlistItem,
  getWishlist,
  removeWishlistItemByVariant,
} from "@/lib/data/wishlist";

const mockGetWishlist = vi.mocked(getWishlist);
const mockAddWishlistItem = vi.mocked(addWishlistItem);
const mockRemoveWishlistItemByVariant = vi.mocked(removeWishlistItemByVariant);

const wishlistFixture = {
  id: "wl_1",
  name: "My Wishlist",
  token: "wl-token",
  is_default: true,
  is_private: false,
  items: [
    {
      id: "wi_1",
      variant_id: "var_1",
      wishlist_id: "wl_1",
      quantity: 1,
      variant: { id: "var_1", price: { display_amount: "$10.00" } },
    },
  ],
} as unknown as Wishlist;

function wrapper({ children }: { children: ReactNode }) {
  return <WishlistProvider>{children}</WishlistProvider>;
}

describe("WishlistContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authenticated = true;
    mockGetWishlist.mockResolvedValue(wishlistFixture);
  });

  it("loads wishlist on mount", async () => {
    const { result } = renderHook(() => useWishlist(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.wishlist).toEqual(wishlistFixture);
    expect(result.current.itemCount).toBe(1);
  });

  it("adds an item and updates state", async () => {
    const updatedWishlist = {
      ...wishlistFixture,
      items: [
        ...(wishlistFixture.items ?? []),
        { id: "wi_2", variant_id: "var_2" },
      ],
    } as unknown as Wishlist;

    mockAddWishlistItem.mockResolvedValue({
      success: true,
      wishlist: updatedWishlist,
    });

    const { result } = renderHook(() => useWishlist(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.addItem("var_2");
    });

    expect(result.current.wishlist?.items?.length).toBe(2);
    expect(result.current.hasVariant("var_2")).toBe(true);
  });

  it("removes an item by variant and updates state", async () => {
    mockRemoveWishlistItemByVariant.mockResolvedValue({
      success: true,
      wishlist: { ...wishlistFixture, items: [] },
    });

    const { result } = renderHook(() => useWishlist(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.removeItemByVariant("var_1");
    });

    expect(result.current.wishlist?.items).toHaveLength(0);
    expect(result.current.hasVariant("var_1")).toBe(false);
  });

  it("stays empty and skips fetch when user is not authenticated", async () => {
    authenticated = false;

    const { result } = renderHook(() => useWishlist(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockGetWishlist).not.toHaveBeenCalled();
    expect(result.current.wishlist).toBeNull();
    expect(result.current.itemCount).toBe(0);
  });
});
