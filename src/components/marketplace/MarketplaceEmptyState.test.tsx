import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MarketplaceEmptyState } from "./MarketplaceEmptyState";

describe("MarketplaceEmptyState", () => {
  it("preserves the default presentation", () => {
    render(
      <MarketplaceEmptyState
        title="No products"
        description="Check back soon."
        illustration="no-listings-yet"
      />,
    );

    expect(screen.getByText("No products")).toBeInTheDocument();
    expect(screen.getByText("Check back soon.")).toBeInTheDocument();
    expect(screen.getByText("No products").parentElement).not.toHaveAttribute(
      "data-marketplace-empty-state-appearance",
    );
  });

  it("applies the editorial presentation when selected", () => {
    render(
      <MarketplaceEmptyState
        title="This shop is getting ready"
        description="Check back soon for new listings from this seller."
        illustration="no-listings-yet"
        appearance="editorial"
      />,
    );

    expect(
      screen
        .getByText("This shop is getting ready")
        .closest("[data-marketplace-empty-state-appearance]"),
    ).toHaveAttribute("data-marketplace-empty-state-appearance", "editorial");
    expect(
      screen.getByText("Check back soon for new listings from this seller."),
    ).toBeInTheDocument();
  });
});
