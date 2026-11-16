import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ProductDescriptionTabsInteractive } from "./resource/ProductDescriptionTabsInteractive";
import { VideoPopup } from "./VideoPopup";

describe("Theme media and product accessibility", () => {
  it("moves between the product tabs with arrow keys", async () => {
    const user = userEvent.setup();
    render(
      <ProductDescriptionTabsInteractive
        descriptionLabel="Description"
        detailsLabel="Details"
        reviewsLabel="Reviews"
        descriptionHtml="<p>Hand-thrown stoneware</p>"
        details={["Dishwasher safe"]}
        reviewCount={2}
      />,
    );
    expect(
      screen.getByRole("tabpanel", { name: "Description" }),
    ).toHaveTextContent("Hand-thrown stoneware");

    await user.tab();
    expect(screen.getByRole("tab", { name: "Description" })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    await waitFor(() =>
      expect(screen.getByRole("tab", { name: "Details" })).toHaveFocus(),
    );
    expect(screen.getByRole("tabpanel", { name: "Details" })).toHaveTextContent(
      "Dishwasher safe",
    );
    await user.keyboard("{End}");
    expect(
      await screen.findByRole("link", { name: "Read customer reviews" }),
    ).toHaveAttribute("href", "#reviews");
  });

  it("opens a captioned media dialog and restores keyboard focus on Escape", async () => {
    const user = userEvent.setup();
    render(
      <VideoPopup
        src="/workshop.mp4"
        captionsUrl="/workshop.vtt"
        title="In the workshop"
      />,
    );
    const trigger = screen.getByRole("button", {
      name: "Play In the workshop",
    });
    await user.tab();
    expect(trigger).toHaveFocus();
    await user.keyboard("{Enter}");
    const dialog = screen.getByRole("dialog", { name: "In the workshop" });
    expect(dialog.querySelector('track[kind="captions"]')).toHaveAttribute(
      "src",
      "/workshop.vtt",
    );
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("offers the original media link when the shop has not added captions", async () => {
    const user = userEvent.setup();
    render(<VideoPopup src="/workshop.mp4" title="Workshop" />);
    await user.click(screen.getByRole("button", { name: "Play Workshop" }));
    expect(
      screen.getByRole("link", { name: "Open video in a new tab" }),
    ).toHaveAttribute("href", "/workshop.mp4");
    expect(
      screen.getByText("Captions are unavailable for this video."),
    ).toBeVisible();
  });
});
