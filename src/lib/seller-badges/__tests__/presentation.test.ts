import { describe, expect, it } from "vitest";
import type { MerchandisingSignal } from "@/components/products/MerchandisingBadges";
import {
  filterMerchandisingSignalsForSellerBadges,
  selectVisibleSellerBadges,
  shouldSuppressMerchandisingTopShop,
} from "../presentation";

const topShopSignal: MerchandisingSignal = {
  key: "top_shop",
  label: "Top shop",
  presentation: "seller_trust",
  priority: 10,
  source: "seller",
};

describe("seller badge presentation", () => {
  it("preserves API order and applies allow-list + max", () => {
    const badges = [
      {
        id: "b1",
        key: "verified_seller",
        label: "Verified",
        description: "",
        awarded_at: "2026-10-01T00:00:00Z",
      },
      {
        id: "b2",
        key: "highly_rated",
        label: "Highly rated",
        description: "",
        awarded_at: "2026-10-01T00:00:00Z",
      },
      {
        id: "b3",
        key: "fast_responder",
        label: "Fast",
        description: "",
        awarded_at: "2026-10-01T00:00:00Z",
      },
    ];
    const visible = selectVisibleSellerBadges(badges, {
      showSellerBadges: true,
      allowedSellerBadges: ["highly_rated", "verified_seller"],
      maxSellerBadges: 2,
    });
    expect(visible.map((b) => b.key)).toEqual([
      "verified_seller",
      "highly_rated",
    ]);
  });

  it("suppresses merchandising top_shop when recognition badge is shown", () => {
    expect(
      shouldSuppressMerchandisingTopShop([
        {
          id: "1",
          key: "top_shop",
          label: "Top shop",
          description: "",
          awarded_at: null,
        },
      ]),
    ).toBe(true);
    const filtered = filterMerchandisingSignalsForSellerBadges(
      [topShopSignal],
      [
        {
          id: "1",
          key: "top_shop",
          label: "Top shop",
          description: "",
          awarded_at: null,
        },
      ],
    );
    expect(filtered).toHaveLength(0);
  });

  it("suppresses merchandising Top Shop for the canonical Star Seller key", () => {
    expect(
      shouldSuppressMerchandisingTopShop([
        {
          id: "2",
          key: "star_seller",
          label: "Star Seller",
          description: "Recognized for excellent service",
          awarded_at: null,
        },
      ]),
    ).toBe(true);
    expect(
      filterMerchandisingSignalsForSellerBadges(
        [topShopSignal],
        [
          {
            id: "2",
            key: "star_seller",
            label: "Star Seller",
            description: "Recognized for excellent service",
            awarded_at: null,
          },
        ],
      ),
    ).toHaveLength(0);
  });

  it("keeps merchandising Top Shop when the recognition badge is not visible", () => {
    expect(
      filterMerchandisingSignalsForSellerBadges(
        [topShopSignal],
        [
          {
            id: "1",
            key: "verified_seller",
            label: "Verified",
            description: "",
            awarded_at: null,
          },
        ],
      ),
    ).toEqual([topShopSignal]);
  });

  it("returns no badges when theme disables seller badges", () => {
    expect(
      selectVisibleSellerBadges(
        [
          {
            id: "b1",
            key: "verified_seller",
            label: "V",
            description: "",
            awarded_at: null,
          },
        ],
        {
          showSellerBadges: false,
          allowedSellerBadges: null,
          maxSellerBadges: 3,
        },
      ),
    ).toEqual([]);
  });
});
