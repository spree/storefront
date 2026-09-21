import type { Wishlist } from "@spree/sdk";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockClient = {
  wishlists: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    items: {
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
};

const mockWithAuthRefresh = vi.fn();

vi.mock("@/lib/spree", () => ({
  getClient: () => mockClient,
  withAuthRefresh: (fn: (options: { token?: string }) => Promise<unknown>) =>
    mockWithAuthRefresh(fn),
  isAuthError: vi.fn(() => false),
}));

vi.mock("next/cache", () => ({
  updateTag: vi.fn(),
}));

import {
  addWishlistItem,
  getWishlist,
  removeWishlistItemByVariant,
} from "@/lib/data/wishlist";

const wishlistFixture = {
  id: "wl_1",
  name: "My Wishlist",
  token: "wl-token",
  is_default: true,
  is_private: false,
  items: [
    {
      id: "wi_1",
      product_id: "prod_1",
      variant_id: "var_1",
      wishlist_id: "wl_1",
      quantity: 1,
      product: {
        id: "prod_1",
        name: "Sample Product",
        slug: "sample-product",
        thumbnail_url: "https://example.com/sample-product.jpg",
      },
      variant: {
        id: "var_1",
        product_id: "prod_1",
        sku: "SKU-1",
        options_text: "Size: M",
        track_inventory: false,
        media_count: 0,
        thumbnail_url: null,
        purchasable: true,
        in_stock: true,
        backorderable: false,
        weight: null,
        height: null,
        width: null,
        depth: null,
        price: { display_amount: "$10.00" },
        original_price: null,
        option_values: [],
      },
    },
  ],
} as unknown as Wishlist;

describe("wishlist server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWithAuthRefresh.mockImplementation(async (fn) => fn({ token: "jwt" }));
  });

  it("returns wishlist for authenticated users", async () => {
    mockClient.wishlists.list.mockResolvedValue({
      data: [{ id: "wl_1", is_default: true }],
    });
    mockClient.wishlists.get.mockResolvedValue(wishlistFixture);

    const result = await getWishlist();

    expect(result).toMatchObject({
      id: wishlistFixture.id,
      is_default: wishlistFixture.is_default,
      items: [
        expect.objectContaining({
          id: "wi_1",
          product_name: "Sample Product",
          product_slug: "sample-product",
          thumbnail_url: "https://example.com/sample-product.jpg",
        }),
      ],
    });
    expect(mockClient.wishlists.get).toHaveBeenCalledWith(
      "wl_1",
      {
        expand: ["items.product"],
      },
      { token: "jwt" },
    );
  });

  it("adds item when variant is not present", async () => {
    mockClient.wishlists.list.mockResolvedValue({
      data: [{ id: "wl_1", is_default: true }],
    });
    mockClient.wishlists.get
      .mockResolvedValueOnce({ ...wishlistFixture, items: [] })
      .mockResolvedValueOnce({
        ...wishlistFixture,
        items: [
          ...(wishlistFixture.items ?? []),
          { id: "wi_2", variant_id: "var_2" },
        ],
      });

    const result = await addWishlistItem("var_2", 1);

    expect(mockClient.wishlists.items.create).toHaveBeenCalledWith(
      "wl_1",
      { variant_id: "var_2", quantity: 1 },
      { token: "jwt" },
    );
    expect(result.success).toBe(true);
  });

  it("removes item by variant id", async () => {
    mockClient.wishlists.list.mockResolvedValue({
      data: [{ id: "wl_1", is_default: true }],
    });
    mockClient.wishlists.get
      .mockResolvedValueOnce(wishlistFixture)
      .mockResolvedValueOnce({ ...wishlistFixture, items: [] });

    const result = await removeWishlistItemByVariant("var_1");

    expect(mockClient.wishlists.items.delete).toHaveBeenCalledWith(
      "wl_1",
      "wi_1",
      { token: "jwt" },
    );
    expect(result.success).toBe(true);
  });
});
