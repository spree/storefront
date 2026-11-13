import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ShopStoryMediaCarousel } from "./ShopStoryMediaCarousel";

describe("ShopStoryMediaCarousel", () => {
  it("keeps the reference carousel arrows visible for a single uploaded video", () => {
    render(
      <ShopStoryMediaCarousel
        videoUrl="https://cdn.example/shop.mp4"
        photos={[]}
        shopName="Test shop"
      />,
    );

    expect(
      screen.getByRole("button", { name: "Previous shop photo or video" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Next shop photo or video" }),
    ).toBeDisabled();
  });

  it("navigates between the uploaded video and shop photos", () => {
    render(
      <ShopStoryMediaCarousel
        videoUrl="https://cdn.example/shop.mp4"
        videoCaption="Inside the workshop."
        videoCaptionsUrl="https://cdn.example/shop.vtt"
        photos={[
          {
            id: 1,
            url: "https://cdn.example/photo-1.jpg",
            caption: "Handmade detail.",
          },
          {
            id: 2,
            url: "https://cdn.example/photo-2.jpg",
            caption: "Packed with care.",
          },
        ]}
        shopName="Test shop"
      />,
    );

    expect(screen.getByText("Inside the workshop.")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Play shop video for Test shop"),
    ).toBeInTheDocument();
    expect(screen.queryByAltText("Handmade detail.")).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Next shop photo or video" }),
    );

    expect(screen.getByAltText("Handmade detail.")).toBeInTheDocument();
    expect(screen.getByText("Handmade detail.")).toBeInTheDocument();
    expect(screen.queryByText("Inside the workshop.")).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Previous shop photo or video" }),
    );

    expect(
      screen.getByLabelText("Play shop video for Test shop"),
    ).toBeInTheDocument();
    expect(screen.getByText("Inside the workshop.")).toBeInTheDocument();
  });
});
