import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  resetRecommendationAttributionDedupeForTests,
  trackRecommendationDismiss,
  trackRecommendationImpression,
} from "@/lib/analytics/recommendation-attribution";
import * as beacon from "@/lib/analytics/recommendation-metrics-beacon";

vi.mock("@/lib/analytics/recommendation-metrics-beacon", () => ({
  sendRecommendationMetricEvents: vi.fn(),
}));

vi.mock("@/lib/analytics/gtm", () => ({
  trackViewItemList: vi.fn(),
}));

const product = {
  id: "prod_1",
  name: "Vase",
  slug: "vase",
} as import("@spree/sdk").Product;

describe("recommendation attribution separation", () => {
  beforeEach(() => {
    resetRecommendationAttributionDedupeForTests();
    vi.mocked(beacon.sendRecommendationMetricEvents).mockClear();
    window.dataLayer = [];
  });

  it("records impressions for CTR numerator/denominator pairing", () => {
    trackRecommendationImpression({
      products: [product],
      listId: "recommendation-for-you",
      listName: "For you",
      currency: "USD",
      surface: "home_rail",
      personalized: true,
    });
    expect(beacon.sendRecommendationMetricEvents).toHaveBeenCalledWith([
      expect.objectContaining({ kind: "impression", product_id: "prod_1" }),
    ]);
  });

  it("does not send metric events on dismiss", () => {
    trackRecommendationDismiss({
      productId: "prod_1",
      surface: "home_rail:recommended-for-you",
      listId: "recommendation-for-you",
    });
    expect(beacon.sendRecommendationMetricEvents).not.toHaveBeenCalled();
    expect(
      (window.dataLayer as { event?: string }[] | undefined)?.some(
        (e) => e.event === "spree_recommendation_dismiss",
      ),
    ).toBe(true);
  });
});
