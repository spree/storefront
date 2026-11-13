import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MerchandisingBadges } from "../MerchandisingBadges";
import { MerchandisingReason } from "../MerchandisingReason";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

describe("merchandising presentation visuals", () => {
  it("renders commerce and marketplace badges with distinct presentation markers", () => {
    render(
      <MerchandisingBadges
        inline
        signals={[
          {
            key: "sale",
            label: "50% off",
            priority: 100,
            source: "promotion",
            presentation: "commerce_badge",
          },
          {
            key: "bestseller",
            label: "Bestseller",
            priority: 80,
            source: "commerce",
            presentation: "marketplace_badge",
          },
        ]}
        maxBadges={2}
      />,
    );

    expect(screen.getByText("50% off")).toHaveAttribute(
      "data-merchandising-presentation",
      "commerce_badge",
    );
    expect(screen.getByText("Bestseller")).toHaveAttribute(
      "data-merchandising-presentation",
      "marketplace_badge",
    );
  });

  it("renders relevance reasons as inline text with icon", () => {
    render(
      <MerchandisingReason
        signals={[
          {
            key: "followed_shop",
            label: "From a shop you follow",
            priority: 65,
            source: "buyer_interest",
            presentation: "relevance_reason",
          },
        ]}
      />,
    );

    expect(screen.getByText("From a shop you follow")).toBeInTheDocument();
    expect(
      screen.getByText("From a shop you follow").closest("p"),
    ).toHaveAttribute("data-merchandising-presentation", "relevance_reason");
  });

  it("uses a search icon for recent search reasons", () => {
    const { container } = render(
      <MerchandisingReason
        signals={[
          {
            key: "recent_search_match",
            label: "Based on your recent searches",
            priority: 70,
            source: "buyer_interest",
            presentation: "relevance_reason",
          },
        ]}
      />,
    );

    const reason = container.querySelector(
      '[data-merchandising-reason="recent_search_match"]',
    );
    expect(reason).toBeTruthy();
    expect(reason?.querySelector('svg[data-icon="search"]')).toBeTruthy();
  });
});
