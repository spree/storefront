import { describe, expect, it } from "vitest";
import { parseSellerBadgeThemeSettings } from "../theme";

describe("seller badge theme settings", () => {
  it("keeps recognition disabled until a theme opts in", () => {
    expect(parseSellerBadgeThemeSettings(undefined)).toEqual({
      showSellerBadges: false,
      allowedSellerBadges: null,
      maxSellerBadges: 2,
    });
  });

  it("parses the theme allow-list, count, and enabled state", () => {
    expect(
      parseSellerBadgeThemeSettings({
        show_seller_badges: "true",
        allowed_seller_badges: "top_shop, verified_seller",
        max_seller_badges: "3",
      }),
    ).toEqual({
      showSellerBadges: true,
      allowedSellerBadges: ["top_shop", "verified_seller"],
      maxSellerBadges: 3,
    });
  });
});
