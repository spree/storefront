import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WishlistButton } from "@/components/wishlist/WishlistButton";

const mockPush = vi.fn();
const mockAddItem = vi.fn();
const mockRemoveItemByVariant = vi.fn();
const mockHasVariant = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/us/en/products/classic-tee",
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      outlineHeart: "♡",
      filledHeart: "♥",
      addToWishlist: "Add to wishlist",
      addedToWishlist: "Added to wishlist",
      removeFromWishlist: "Remove from wishlist",
    };
    return map[key] ?? key;
  },
}));

let authenticated = true;

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ isAuthenticated: authenticated, loading: false }),
}));

vi.mock("@/contexts/WishlistContext", () => ({
  useWishlist: () => ({
    hasVariant: mockHasVariant,
    addItem: mockAddItem,
    removeItemByVariant: mockRemoveItemByVariant,
    updating: false,
  }),
}));

describe("WishlistButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authenticated = true;
    mockHasVariant.mockReturnValue(false);
    mockAddItem.mockResolvedValue(true);
    mockRemoveItemByVariant.mockResolvedValue(true);
  });

  it("shows add state for new variants", () => {
    render(<WishlistButton variantId="var_1" />);
    expect(
      screen.getByRole("button", { name: "Add to wishlist" }),
    ).toBeInTheDocument();
  });

  it("shows remove state for variants already in wishlist", () => {
    mockHasVariant.mockReturnValue(true);
    render(<WishlistButton variantId="var_1" />);
    expect(
      screen.getByRole("button", { name: "Remove from wishlist" }),
    ).toBeInTheDocument();
  });

  it("redirects guests to account login with redirect param", () => {
    authenticated = false;
    render(<WishlistButton variantId="var_1" />);

    fireEvent.click(screen.getByRole("button", { name: "Add to wishlist" }));

    expect(mockPush).toHaveBeenCalledWith(
      "/us/en/account?redirect=%2Fus%2Fen%2Fproducts%2Fclassic-tee",
    );
  });

  it("adds variant when authenticated and not in wishlist", async () => {
    render(<WishlistButton variantId="var_2" />);

    fireEvent.click(screen.getByRole("button", { name: "Add to wishlist" }));

    expect(mockAddItem).toHaveBeenCalledWith("var_2", 1);
  });
});
