import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeSlideshow } from "./ThemeSlideshow";

describe("ThemeSlideshow", () => {
  afterEach(() => vi.useRealTimers());

  it("shows one slide at a time and navigates between slides", () => {
    render(
      <ThemeSlideshow
        slides={[
          <div key="one">First slide content</div>,
          <div key="two">Second slide content</div>,
        ]}
        controls={{ style: "arrows", background: "circle" }}
      />,
    );

    expect(
      screen
        .getByText("First slide content")
        .closest("[aria-roledescription='slide']"),
    ).toHaveAttribute("aria-hidden", "false");
    expect(
      screen
        .getByText("Second slide content")
        .closest("[aria-roledescription='slide']"),
    ).toHaveAttribute("aria-hidden", "true");
    expect(
      screen.getByText("Second slide content").closest("fieldset"),
    ).toHaveAttribute("inert");

    fireEvent.click(screen.getByRole("button", { name: "Next slide" }));
    expect(
      screen
        .getByText("Second slide content")
        .closest("[aria-roledescription='slide']"),
    ).toHaveAttribute("aria-hidden", "false");
    fireEvent.click(screen.getByRole("button", { name: "Previous slide" }));
    expect(
      screen
        .getByText("First slide content")
        .closest("[aria-roledescription='slide']"),
    ).toHaveAttribute("aria-hidden", "false");
  });

  it("supports dot navigation and hides controls for a single slide", () => {
    const { rerender } = render(
      <ThemeSlideshow
        slides={[
          <div key="one">First slide content</div>,
          <div key="two">Second slide content</div>,
        ]}
        controls={{ style: "dots", background: "square" }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Go to slide 2" }));
    expect(
      screen
        .getByText("Second slide content")
        .closest("[aria-roledescription='slide']"),
    ).toHaveAttribute("aria-hidden", "false");

    rerender(
      <ThemeSlideshow
        slides={[<div key="one">Only slide</div>]}
        controls={{ style: "arrows" }}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "Next slide" }),
    ).not.toBeInTheDocument();
  });

  it("applies fade, autoplay, and finite navigation settings", () => {
    vi.useFakeTimers();
    render(
      <ThemeSlideshow
        slides={[
          <div key="one">Slide one</div>,
          <div key="two">Slide two</div>,
        ]}
        controls={{ style: "arrows" }}
        settings={{
          fade_effect: true,
          infinite_loop: false,
          auto_rotate: true,
          autoplay_speed: 3,
          show_arrows_desktop: true,
          show_arrows_mobile: false,
          show_pagination_desktop: true,
          show_pagination_mobile: false,
        }}
      />,
    );

    expect(screen.getByRole("button", { name: "Next slide" })).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Go to slide 1" }),
    ).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(3000));
    expect(
      screen.getByText("Slide two").closest("[aria-roledescription='slide']"),
    ).toHaveAttribute("aria-hidden", "false");
    expect(screen.getByRole("button", { name: "Next slide" })).toBeDisabled();
  });
});
