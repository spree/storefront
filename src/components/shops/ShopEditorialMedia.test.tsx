import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ShopEditorialMedia } from "./ShopEditorialMedia";
import { StarSellerAvatar } from "./StarSellerAvatar";

describe("ShopEditorialMedia", () => {
  it("uses readable seller initials for both fallbacks, including non-ASCII names", () => {
    const name = "[studio] Étoile Céramique";
    render(
      <>
        <ShopEditorialMedia
          name={name}
          shopHref="/sellers/etoile"
          images={[]}
        />
        <StarSellerAvatar
          seller={{
            id: "sel_etoile",
            name,
            slug: "etoile",
            badges: null,
            logo_url: null,
            square_logo_url: null,
          }}
          sizeClassName="size-16"
        />
      </>,
    );
    expect(screen.getByRole("link", { name })).toHaveAttribute(
      "href",
      "/sellers/etoile",
    );
    expect(screen.getByText("ÉC")).toBeVisible();
    expect(screen.getByText("É")).toBeVisible();
  });

  it("uses the shop cover, then a monogram if the product photograph and cover fail", () => {
    const { container } = render(
      <ShopEditorialMedia
        name="Blue Kiln"
        shopHref="/sellers/blue-kiln"
        images={[
          {
            src: "/mug.jpg",
            kind: "product",
            label: "Stoneware mug",
            href: "/products/mug",
            price: "$24.00",
          },
          {
            src: "/kiln.jpg",
            kind: "cover",
            label: "Blue Kiln",
            href: "/sellers/blue-kiln",
          },
        ]}
      />,
    );

    expect(
      screen.getByRole("link", { name: "Stoneware mug, $24.00" }),
    ).toHaveAttribute("href", "/products/mug");
    fireEvent.error(container.querySelector("img")!);
    expect(screen.getByRole("link", { name: "Blue Kiln" })).toHaveAttribute(
      "data-shop-editorial-media",
      "cover",
    );
    expect(screen.queryByText("$24.00")).not.toBeInTheDocument();

    fireEvent.error(container.querySelector("img")!);
    expect(screen.getByRole("link", { name: "Blue Kiln" })).toHaveAttribute(
      "data-shop-editorial-media",
      "monogram",
    );
    expect(screen.getByText("BK")).toBeVisible();
  });
});
