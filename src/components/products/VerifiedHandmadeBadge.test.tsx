import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { VerifiedHandmadeBadge } from "./VerifiedHandmadeBadge";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) =>
    ({
      badge: "Verified handmade",
      explanation: "Oddkeeps reviewed this listing.",
      standards: "Handmade standards",
    })[key] ?? key,
}));

const verified = {
  name: "Studio bowl",
  handmade_verified: true,
  authenticity_explanation: "Oddkeeps reviewed the maker declaration.",
  authenticity_classification_label: "Handcrafted by the maker",
  authenticity_disclosure: "Thrown on a wheel in the maker studio.",
};

describe("VerifiedHandmadeBadge", () => {
  it("shows the badge only when the store says the product is verified", () => {
    const { rerender } = render(<VerifiedHandmadeBadge product={verified} />);

    expect(screen.getByText("Verified handmade")).toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent(
      "Oddkeeps reviewed the maker declaration.",
    );
    expect(screen.getByRole("note")).toHaveTextContent(
      "Handcrafted by the maker",
    );

    for (const product of [
      { name: "Studio bowl", handmade_verified: false },
      { name: "Studio bowl" },
      {
        name: "Studio bowl",
        handmade_verified: false,
        authenticity_production_classification: "handcrafted",
      },
    ]) {
      rerender(<VerifiedHandmadeBadge product={product} />);
      expect(screen.queryByText("Verified handmade")).not.toBeInTheDocument();
    }
  });
});
