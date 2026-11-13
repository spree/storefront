import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

import { SocialLoginButtons } from "./SocialLoginButtons";

describe("SocialLoginButtons", () => {
  it("keeps long provider labels inside responsive buttons", () => {
    render(
      <SocialLoginButtons
        providers={
          [
            "Google",
            "Apple",
            "Facebook",
            "Microsoft",
            "Mock OIDC (tests only)",
          ].map((label) => ({
            key: label.toLowerCase().replaceAll(" ", "-"),
            label,
            kind: "redirect",
            authorization_url: "https://auth.example.test/authorize",
          })) as never
        }
        returnTo="/us/en/account"
      />,
    );

    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(5);
    expect(buttons[0].parentElement).toHaveClass("grid-cols-1");
    for (const button of buttons) {
      expect(button.className).toContain("whitespace-normal");
      expect(button.className).toContain("min-w-0");
    }
    for (const provider of [
      "google",
      "apple",
      "facebook",
      "microsoft",
      "generic",
    ]) {
      expect(
        document.querySelector(`[data-provider-logo="${provider}"]`),
      ).toBeInTheDocument();
    }
  });
});
