import { describe, expect, it } from "vitest";
import type { MerchandisingSignal } from "@/components/products/MerchandisingBadges";
import {
  filterSignalsForSurface,
  normalizePresentation,
  PRESENTATION,
  selectPdpSignals,
  selectProductCardImageBadges,
  selectRelevanceReason,
  sellerTrustMerchandisingSignals,
} from "../presentation";

const commerce = (key: string, priority: number): MerchandisingSignal => ({
  key,
  label: key,
  priority,
  source: "test",
  presentation: "commerce_badge",
});

const marketplace = (key: string, priority: number): MerchandisingSignal => ({
  key,
  label: key,
  priority,
  source: "test",
  presentation: "marketplace_badge",
});

describe("normalizePresentation", () => {
  it("maps legacy hard_badge keys to presentation classes", () => {
    expect(
      normalizePresentation({
        key: "sale",
        label: "Sale",
        priority: 100,
        source: "promotion",
        presentation: "hard_badge",
      }),
    ).toBe(PRESENTATION.COMMERCE_BADGE);
    expect(
      normalizePresentation({
        key: "followed_shop",
        label: "Followed",
        priority: 65,
        source: "buyer_interest",
        presentation: "soft_label",
      }),
    ).toBe(PRESENTATION.RELEVANCE_REASON);
  });
});

describe("selectProductCardImageBadges", () => {
  it("prioritizes commerce badges and allows one marketplace badge when one commerce shows", () => {
    const selected = selectProductCardImageBadges({
      signals: [
        commerce("sale", 100),
        commerce("low_stock", 90),
        marketplace("bestseller", 80),
        marketplace("new", 40),
      ],
      maxBadges: 2,
    });
    expect(selected.map((signal) => signal.key)).toEqual(["sale", "low_stock"]);
  });

  it("adds a marketplace badge when only one commerce badge is visible", () => {
    const selected = selectProductCardImageBadges({
      signals: [commerce("low_stock", 90), marketplace("bestseller", 80)],
      maxBadges: 2,
    });
    expect(selected.map((signal) => signal.key)).toEqual([
      "low_stock",
      "bestseller",
    ]);
  });
});

describe("filterSignalsForSurface", () => {
  it("suppresses followed-shop reasons on seller shop pages", () => {
    const signals: MerchandisingSignal[] = [
      {
        key: "followed_shop",
        label: "From a shop you follow",
        priority: 65,
        source: "buyer_interest",
        presentation: "relevance_reason",
      },
      {
        key: "new_from_followed_shop",
        label: "New from a shop you follow",
        priority: 65,
        source: "buyer_interest",
        presentation: "relevance_reason",
      },
    ];
    expect(
      filterSignalsForSurface(signals, "seller_shop", {
        sellerSlug: "dev-merch-seller-a",
      }),
    ).toEqual([]);
  });

  it("limits cart surfaces to transactional badges", () => {
    const signals: MerchandisingSignal[] = [
      commerce("sale", 100),
      marketplace("bestseller", 80),
      {
        key: "followed_shop",
        label: "Followed",
        priority: 65,
        source: "buyer_interest",
        presentation: "relevance_reason",
      },
    ];
    expect(
      filterSignalsForSurface(signals, "cart").map((signal) => signal.key),
    ).toEqual(["sale"]);
  });

  it("suppresses relevance reasons on homepage rails when requested", () => {
    const signals: MerchandisingSignal[] = [
      {
        key: "recommended_for_you",
        label: "Recommended",
        priority: 40,
        source: "buyer_interest",
        presentation: "relevance_reason",
      },
    ];
    expect(
      filterSignalsForSurface(signals, "homepage_rail", {
        suppressRelevanceReason: true,
      }),
    ).toEqual([]);
  });

  it("suppresses relevance reasons on seller discovery cards when requested", () => {
    const signals: MerchandisingSignal[] = [
      {
        key: "new_from_followed_shop",
        label: "New from a shop you follow",
        priority: 65,
        source: "buyer_interest",
        presentation: "relevance_reason",
      },
      marketplace("bestseller", 80),
    ];

    expect(
      filterSignalsForSurface(signals, "product_card", {
        suppressRelevanceReason: true,
      }).map((signal) => signal.key),
    ).toEqual(["bestseller"]);
  });
});

describe("sellerTrustMerchandisingSignals", () => {
  it("never surfaces Top Shop / Star Seller as a text trust chip", () => {
    const signals = [
      {
        key: "top_shop",
        label: "Top Shop",
        priority: 80,
        source: "seller",
        presentation: "seller_trust",
      },
      marketplace("new", 40),
    ];
    expect(
      sellerTrustMerchandisingSignals(signals, null).map((s) => s.key),
    ).toEqual(["new"]);
    expect(
      sellerTrustMerchandisingSignals(signals, [{ key: "star_seller" }]).map(
        (signal) => signal.key,
      ),
    ).toEqual(["new"]);
  });
});

describe("selectPdpSignals", () => {
  it("shows only the strongest marketplace badge in the title zone", () => {
    const selected = selectPdpSignals({
      signals: [marketplace("new", 40), marketplace("popular_now", 70)],
      zone: "title",
    });
    expect(selected.map((signal) => signal.key)).toEqual(["popular_now"]);
  });

  it("suppresses the sale badge when the PDP price line already shows the discount", () => {
    const selected = selectPdpSignals({
      signals: [
        commerce("sale", 100),
        {
          key: "price_drop_for_you",
          label: "Price dropped",
          priority: 90,
          source: "buyer_interest",
          presentation: "commerce_badge",
        },
      ],
      zone: "price",
      suppressSaleBadge: true,
    });
    expect(selected.map((signal) => signal.key)).toEqual([
      "price_drop_for_you",
    ]);
  });
});

describe("selectRelevanceReason", () => {
  it("returns one relevance reason", () => {
    const reason = selectRelevanceReason({
      signals: [
        {
          key: "similar_to_favorites",
          label: "Similar to saved items",
          priority: 60,
          source: "buyer_interest",
          presentation: "relevance_reason",
        },
      ],
    });
    expect(reason?.key).toBe("similar_to_favorites");
  });
});
