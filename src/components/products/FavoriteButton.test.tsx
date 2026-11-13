import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ThemeSettingsProvider } from "@/contexts/ThemeSettingsContext";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));
vi.mock("@/lib/data/favorites", () => ({
  addFavorite: vi.fn(),
  removeFavorite: vi.fn(),
  isFavorited: vi.fn().mockResolvedValue({ success: true, favorited: true }),
}));

import { isFavorited } from "@/lib/data/favorites";
import { FavoriteButton } from "./FavoriteButton";

describe("FavoriteButton global wishlist setting", () => {
  it("hides product favorite controls when the wishlist is disabled", () => {
    render(
      <ThemeSettingsProvider settings={{ general: { enable_wishlist: false } }}>
        <FavoriteButton productId="prod_1" />
      </ThemeSettingsProvider>,
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("keeps product favorite controls visible by default", () => {
    render(<FavoriteButton productId="prod_1" favorited={false} />);

    expect(screen.getByRole("button", { name: "addFavorite" })).toBeVisible();
  });

  it("hydrates saved state from favorites when favorited is omitted", async () => {
    render(<FavoriteButton productId="prod_1" />);

    await waitFor(() => {
      expect(isFavorited).toHaveBeenCalledWith({
        productId: "prod_1",
        variantId: undefined,
      });
      expect(
        screen.getByRole("button", { name: "removeFavorite" }),
      ).toBeVisible();
    });
  });
});
