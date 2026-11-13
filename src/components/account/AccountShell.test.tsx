import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ThemeSettingsProvider } from "@/contexts/ThemeSettingsContext";

vi.mock("next/navigation", () => ({
  usePathname: () => "/us/en/account/messages",
  useRouter: () => ({ replace: vi.fn() }),
}));
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { first_name: "Ada", last_name: "Buyer", email: "ada@example.com" },
    logout: vi.fn(),
  }),
}));
vi.mock("@/components/account/MessagesNavBadge", () => ({
  MessagesNavBadge: () => <span>3</span>,
}));

import { AccountShell } from "./AccountShell";

describe("AccountShell", () => {
  it("groups every existing account destination under Settings", () => {
    render(<AccountShell>Account content</AccountShell>);

    for (const group of ["shoppingGroup", "accountGroup"]) {
      expect(screen.getAllByText(group).length).toBeGreaterThan(0);
    }
    expect(
      screen.getAllByRole("navigation", { name: "communicationGroup" }).length,
    ).toBeGreaterThan(0);

    const expectedPaths = [
      "/account",
      "/account/orders",
      "/account/favorites",
      "/account/followed-shops",
      "/account/saved-searches",
      "/account/messages",
      "/account/offers",
      "/account/custom-orders",
      "/account/reviews",
      "/account/settings/account",
      "/account/gift-cards",
    ];

    for (const path of expectedPaths) {
      expect(
        document.querySelector(`a[href="/us/en${path}"]`),
      ).toBeInTheDocument();
    }
    expect(
      document.querySelector('a[href="/us/en/account/profile"]'),
    ).not.toBeInTheDocument();
    expect(
      document.querySelector('a[href="/us/en/account/addresses"]'),
    ).not.toBeInTheDocument();
    expect(
      document.querySelector('a[href="/us/en/account/credit-cards"]'),
    ).not.toBeInTheDocument();
    expect(
      document.querySelector('a[href="/us/en/account/blocked-shops"]'),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Account content")).toBeInTheDocument();
  });

  it("removes the favorites destination when the wishlist is disabled", () => {
    render(
      <ThemeSettingsProvider settings={{ general: { enable_wishlist: false } }}>
        <AccountShell>Account content</AccountShell>
      </ThemeSettingsProvider>,
    );

    expect(
      document.querySelector('a[href="/us/en/account/favorites"]'),
    ).not.toBeInTheDocument();
    expect(
      document.querySelector('a[href="/us/en/account/orders"]'),
    ).toBeInTheDocument();
  });
});
