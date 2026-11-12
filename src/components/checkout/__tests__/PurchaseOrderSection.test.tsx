import type { Cart } from "@spree/sdk";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}:${Object.values(values).join(",")}` : key,
}));

import {
  PurchaseOrderSection,
  type PurchaseOrderSectionHandle,
} from "@/components/checkout/PurchaseOrderSection";

function cartWith(overrides: Partial<Cart>): Cart {
  return {
    id: "cart_1",
    company_id: "company_1",
    company_name: "Acme Supplies",
    po_number: null,
    po_number_required: true,
    ...overrides,
  } as Cart;
}

describe("PurchaseOrderSection", () => {
  it("names the company that requires the number", () => {
    render(<PurchaseOrderSection cart={cartWith({})} onSave={vi.fn()} />);

    expect(
      screen.getByText("poNumberRequiredByCompany:Acme Supplies"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("poNumberRequiredLabel")).toBeRequired();
  });

  it("marks the field optional for a company that does not require one", () => {
    render(
      <PurchaseOrderSection
        cart={cartWith({ po_number_required: false })}
        onSave={vi.fn()}
      />,
    );

    const input = screen.getByLabelText("poNumberOptionalLabel");
    expect(input).not.toBeRequired();
    expect(screen.getByText("poNumberOptionalHint")).toBeInTheDocument();
  });

  it("saves the trimmed number on blur, and only once per change", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(true);
    render(<PurchaseOrderSection cart={cartWith({})} onSave={onSave} />);

    const input = screen.getByLabelText("poNumberRequiredLabel");
    await user.type(input, "  PO-2026-0418  ");
    await user.tab();
    expect(onSave).toHaveBeenCalledExactlyOnceWith("PO-2026-0418");

    // A blur that changed nothing costs no round-trip.
    await user.click(input);
    await user.tab();
    expect(onSave).toHaveBeenCalledOnce();
  });

  it("leaves the number for the next attempt when the write fails", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(false);
    render(<PurchaseOrderSection cart={cartWith({})} onSave={onSave} />);

    const input = screen.getByLabelText("poNumberRequiredLabel");
    await user.type(input, "PO-1");
    await user.tab();
    await user.click(input);
    await user.tab();

    expect(onSave).toHaveBeenCalledTimes(2);
    expect(onSave).toHaveBeenLastCalledWith("PO-1");
  });

  it("flushes a number that was typed but never blurred", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(true);
    const ref = createRef<PurchaseOrderSectionHandle>();
    render(
      <PurchaseOrderSection ref={ref} cart={cartWith({})} onSave={onSave} />,
    );

    await user.type(screen.getByLabelText("poNumberRequiredLabel"), "PO-2");

    await expect(ref.current?.flush()).resolves.toBe(true);
    expect(onSave).toHaveBeenCalledExactlyOnceWith("PO-2");

    // Already on the cart — Place Order flushing again writes nothing.
    await expect(ref.current?.flush()).resolves.toBe(true);
    expect(onSave).toHaveBeenCalledOnce();
  });

  it("reports a failed flush so the order is not placed on the old reference", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(false);
    const ref = createRef<PurchaseOrderSectionHandle>();
    render(
      <PurchaseOrderSection
        ref={ref}
        cart={cartWith({ po_number: "PO-OLD" })}
        onSave={onSave}
      />,
    );

    const input = screen.getByLabelText("poNumberRequiredLabel");
    await user.clear(input);
    await user.type(input, "PO-NEW");

    await expect(ref.current?.flush()).resolves.toBe(false);
    expect(onSave).toHaveBeenCalledExactlyOnceWith("PO-NEW");
    // Still in the field, so the buyer can try again.
    expect(input).toHaveValue("PO-NEW");
  });

  it("starts from the number the cart already carries", () => {
    render(
      <PurchaseOrderSection
        cart={cartWith({ po_number: "PO-EXISTING" })}
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("poNumberRequiredLabel")).toHaveValue(
      "PO-EXISTING",
    );
  });
});
