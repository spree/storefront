import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CategoryImage } from "./category-image";
import { ProductImage } from "./product-image";

describe("marketplace image fallback", () => {
  it("keeps a missing navigation thumbnail within its 48px box", () => {
    const { container } = render(
      <CategoryImage src={null} alt="" width={48} height={48} />,
    );

    const fallback = container.firstElementChild;
    expect(fallback).toHaveStyle({ width: "48px", height: "48px" });
    expect(fallback).toHaveClass("pointer-events-none");
    expect(fallback).not.toHaveClass("absolute");
  });

  it("fills the existing media frame when a fill image fails", () => {
    const { container } = render(
      <ProductImage src="/product.jpg" alt="Ceramic mug" fill />,
    );

    fireEvent.error(container.querySelector("img")!);
    expect(container.firstElementChild).toHaveClass(
      "absolute",
      "inset-0",
      "pointer-events-none",
    );
  });
});
