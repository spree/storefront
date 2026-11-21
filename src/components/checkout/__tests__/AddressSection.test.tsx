import type { Cart, Country } from "@spree/sdk";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key: string) => key,
}));

import { AddressSection } from "@/components/checkout/AddressSection";
import type { User } from "@/contexts/AuthContext";

const countries = [{ iso: "US", name: "United States" }] as Country[];

const user: User = {
  id: "cus_1",
  email: "buyer@example.com",
  first_name: "Ada",
  last_name: "Lovelace",
};

function cartWith(overrides: Partial<Cart> = {}): Cart {
  return {
    id: "cart_1",
    email: null,
    shipping_address: null,
    ...overrides,
  } as unknown as Cart;
}

function renderSection(
  props: Partial<React.ComponentProps<typeof AddressSection>> = {},
) {
  const onAutoSave = vi.fn().mockResolvedValue(undefined);
  const onEmailBlur = vi.fn().mockResolvedValue(undefined);
  const defaults: React.ComponentProps<typeof AddressSection> = {
    cart: cartWith(),
    countries,
    selectableAddresses: [],
    isAuthenticated: true,
    signInUrl: "/us/en/account",
    fetchStates: vi.fn().mockResolvedValue([]),
    onEmailBlur,
    onAutoSave,
    user: null,
  };
  const view = render(<AddressSection {...defaults} {...props} />);
  return {
    ...view,
    onAutoSave,
    rerenderWith: (
      next: Partial<React.ComponentProps<typeof AddressSection>>,
    ) => view.rerender(<AddressSection {...defaults} {...props} {...next} />),
  };
}

function fillAddress() {
  fireEvent.change(document.getElementById("ship-last_name") as HTMLElement, {
    target: { value: "Lovelace" },
  });
  fireEvent.change(document.getElementById("ship-address1") as HTMLElement, {
    target: { value: "1 Main St" },
  });
  fireEvent.change(document.getElementById("ship-city") as HTMLElement, {
    target: { value: "New York" },
  });
  fireEvent.change(document.getElementById("ship-postal_code") as HTMLElement, {
    target: { value: "10001" },
  });
}

describe("AddressSection email for a signed-in customer", () => {
  it("shows the account email once it loads on a fresh render of checkout", () => {
    // Reload: the cart has no email yet and the account arrives after mount.
    const { rerenderWith } = renderSection({ user: null });
    const input = screen.getByPlaceholderText("emailAddress");
    expect(input).toHaveValue("");
    expect(input).not.toBeDisabled();

    rerenderWith({ user });

    expect(input).toHaveValue("buyer@example.com");
    expect(input).toBeDisabled();
    expect(screen.getByText("usingAccountEmail")).toBeInTheDocument();
  });

  it("saves the typed address with the account email", async () => {
    const { rerenderWith, onAutoSave } = renderSection({ user: null });
    rerenderWith({ user });

    fillAddress();
    fireEvent.focusOut(
      document.getElementById("ship-postal_code") as HTMLElement,
    );

    await waitFor(() => expect(onAutoSave).toHaveBeenCalledTimes(1));
    expect(onAutoSave.mock.calls[0][0]).toMatchObject({
      email: "buyer@example.com",
      shipping_address: expect.objectContaining({ address1: "1 Main St" }),
    });
  });

  it("saves the saved address the buyer picked before the account email loaded", async () => {
    const addressA = {
      id: "addr_a",
      first_name: "Ada",
      last_name: "Lovelace",
      address1: "1 Main St",
      city: "New York",
      postal_code: "10001",
      country_iso: "US",
      is_default_shipping: true,
    };
    const addressB = {
      ...addressA,
      id: "addr_b",
      address1: "2 Side St",
      postal_code: "10002",
      is_default_shipping: false,
    };
    const { rerenderWith, onAutoSave } = renderSection({
      user: null,
      selectableAddresses: [
        addressA,
        addressB,
      ] as unknown as React.ComponentProps<
        typeof AddressSection
      >["selectableAddresses"],
    });

    // Nothing is saved while there is no email to send.
    fireEvent.click(screen.getAllByRole("radio")[1]);
    expect(onAutoSave).not.toHaveBeenCalled();

    rerenderWith({ user });

    await waitFor(() => expect(onAutoSave).toHaveBeenCalledTimes(1));
    expect(onAutoSave.mock.calls[0][0]).toEqual({
      email: "buyer@example.com",
      shipping_address_id: "addr_b",
    });
  });

  it("lets a guest type their own email", () => {
    renderSection({ isAuthenticated: false });
    const input = screen.getByPlaceholderText("emailAddress");
    fireEvent.change(input, { target: { value: "guest@example.com" } });

    expect(input).toHaveValue("guest@example.com");
    expect(input).not.toBeDisabled();
    expect(screen.queryByText("usingAccountEmail")).not.toBeInTheDocument();
  });
});
