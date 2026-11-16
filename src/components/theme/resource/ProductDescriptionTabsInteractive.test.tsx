import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ProductDescriptionTabsInteractive } from "./ProductDescriptionTabsInteractive";

describe("product description tabs", () => {
  it("switches between the configured description, details, and reviews panels", async () => {
    const user = userEvent.setup();
    render(
      <ProductDescriptionTabsInteractive
        descriptionLabel="About this product"
        detailsLabel="Specifications"
        reviewsLabel="Customer reviews"
        descriptionHtml="<p>Handmade ceramic mug</p>"
        details={["SKU: MUG-1"]}
        reviewCount={3}
      />,
    );

    expect(
      screen.getByRole("tabpanel", { name: "About this product" }),
    ).toBeVisible();
    await user.click(screen.getByRole("tab", { name: "Specifications" }));
    expect(
      screen.getByRole("tabpanel", { name: "Specifications" }),
    ).toBeVisible();
    expect(screen.getByText("SKU: MUG-1")).toBeVisible();
    await user.click(screen.getByRole("tab", { name: "Customer reviews (3)" }));
    expect(
      screen.getByRole("tabpanel", { name: "Customer reviews (3)" }),
    ).toBeVisible();
  });
});
