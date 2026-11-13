import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SellerBadgeChip } from "../SellerBadgeChip";
import { SellerBadgeIcon, sellerBadgeAssetPath } from "../SellerBadgeIcon";

describe("SellerBadgeChip", () => {
  it("renders label and icon for a known badge key", () => {
    const { getByText } = render(
      <SellerBadgeChip
        badge={{
          id: "badge_1",
          key: "verified_seller",
          label: "Verified seller",
          description: "Identity confirmed",
          awarded_at: null,
        }}
      />,
    );
    expect(getByText("Verified seller")).toBeInTheDocument();
  });

  it("renders accessible icon-only variant", () => {
    const { getByText } = render(
      <SellerBadgeChip
        variant="iconOnly"
        badge={{
          id: "badge_2",
          key: "marketplace_pick",
          label: "Marketplace pick",
          description: "Chosen by staff",
          awarded_at: null,
        }}
      />,
    );
    expect(getByText("Marketplace pick")).toHaveClass("sr-only");
  });
});

describe("SellerBadgeIcon", () => {
  it("renders canonical badge glyphs and the legacy Top Shop alias", () => {
    const keys = [
      "verified_seller",
      "star_seller",
      "highly_rated",
      "fast_responder",
      "on_time_shipping",
      "established_seller",
      "marketplace_pick",
      "top_shop",
    ] as const;
    const assets: Record<(typeof keys)[number], string> = {
      verified_seller: "verified-seller",
      star_seller: "top-shop",
      top_shop: "top-shop",
      highly_rated: "highly-rated",
      fast_responder: "fast-responder",
      on_time_shipping: "on-time-shipping",
      established_seller: "established-seller",
      marketplace_pick: "marketplace-pick",
    };
    for (const key of keys) {
      const { getByRole, unmount } = render(
        <SellerBadgeIcon badgeKey={key} title={key} data-testid={key} />,
      );
      expect(getByRole("img", { name: key })).toBeInTheDocument();
      expect(sellerBadgeAssetPath(key)).toBe(
        `/assets/seller-badges/${assets[key]}.svg`,
      );
      unmount();
    }
  });
});
