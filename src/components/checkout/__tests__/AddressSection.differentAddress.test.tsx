import type { Address, Cart, Country } from "@spree/sdk";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  email: "ana@example.com",
  first_name: "Ana",
  last_name: "Buyer",
};

// The customer's only saved address: no company, no apartment line.
const savedAddress = {
  id: "addr_home",
  owner: { id: "cus_1", type: "customer", name: null },
  first_name: "Ana",
  last_name: "Buyer",
  full_name: "Ana Buyer",
  company: null,
  address1: "10 High Street",
  address2: null,
  city: "Springfield",
  postal_code: "62701",
  phone: "555-0100",
  country_code: "US",
  country_name: "United States",
  state_code: "IL",
  state_name: null,
  state_text: "IL",
  label: null,
  is_default_shipping: true,
} as unknown as Address;

function renderSection() {
  const onAutoSave = vi.fn().mockResolvedValue(undefined);
  render(
    <AddressSection
      cart={{ id: "cart_1", email: null, shipping_address: null } as Cart}
      countries={countries}
      selectableAddresses={[savedAddress]}
      isAuthenticated
      signInUrl="/us/en/account"
      fetchStates={vi.fn().mockResolvedValue([])}
      onEmailBlur={vi.fn().mockResolvedValue(undefined)}
      onAutoSave={onAutoSave}
      user={user}
    />,
  );
  return { onAutoSave };
}

function field(id: string): HTMLElement {
  const element = document.getElementById(`ship-${id}`);
  if (!element) throw new Error(`ship-${id} is not on the page`);
  return element;
}

function type(id: string, value: string): void {
  fireEvent.change(field(id), { target: { value } });
}

// Types the saved address back in, plus `extra`, with the ZIP last: the
// keystroke that used to make the form snap shut onto the saved entry.
function typeSavedAddressWith(extra: Partial<Record<string, string>>): void {
  type("country", "US");
  type("first_name", "Ana");
  type("last_name", "Buyer");
  for (const [id, value] of Object.entries(extra)) {
    type(id, value as string);
  }
  type("address1", "10 High Street");
  type("city", "Springfield");
  type("postal_code", "62701");
}

describe("AddressSection with a different address that resembles a saved one", () => {
  it.each([
    ["an apartment line", { address2: "Flat 2" }],
    ["a company", { company: "Acme Ltd" }],
  ])(
    "keeps the address typed with %s instead of reusing the saved one",
    async (_case, extra) => {
      const { onAutoSave } = renderSection();
      // Mount pre-selects the saved address.
      await waitFor(() =>
        expect(onAutoSave).toHaveBeenCalledWith({
          email: "ana@example.com",
          shipping_address_id: "addr_home",
        }),
      );

      await userEvent.click(screen.getByText("useDifferentAddress"));
      typeSavedAddressWith(extra);

      // The form stays open with what was typed, on "Use a different address".
      const [fieldId, value] = Object.entries(extra)[0] as [string, string];
      expect(field(fieldId)).toHaveValue(value);
      expect(screen.getAllByRole("radio")[1]).toBeChecked();

      // Leaving the form saves the address as typed, not the saved entry.
      fireEvent.blur(field("postal_code"));

      await waitFor(() =>
        expect(onAutoSave).toHaveBeenLastCalledWith({
          email: "ana@example.com",
          shipping_address: expect.objectContaining({
            address1: "10 High Street",
            postal_code: "62701",
            [fieldId]: value,
          }),
        }),
      );
    },
  );

  it("does not close the form while the buyer is still typing an address", async () => {
    renderSection();

    await userEvent.click(screen.getByText("useDifferentAddress"));
    typeSavedAddressWith({ phone: "555-0100" });

    // Every field now equals the saved entry, but the buyer chose to type a
    // different address and may not be done (a company, an apartment line).
    expect(field("postal_code")).toHaveValue("62701");
    type("company", "Acme Ltd");
    expect(field("company")).toHaveValue("Acme Ltd");
  });
});
