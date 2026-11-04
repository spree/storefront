import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BankTransferQuote } from "@/lib/bank-transfer";
import { BankTransferInstructions } from "../BankTransferInstructions";

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}:${Object.values(values).join(",")}` : key,
}));

function quote(overrides: Partial<BankTransferQuote> = {}): BankTransferQuote {
  return {
    reference: "ACME-7Q4X2",
    amount: "75.66",
    currency: "GBP",
    expiresAt: "2026-11-11T12:00:00Z",
    discountPercent: "3",
    bankDetails: [
      {
        label: "UK payments",
        beneficiaryName: "Example Store Ltd",
        beneficiaryAddress: "1 Example Street\nLondon",
        fields: [
          { label: "Sort code", value: "04-00-75" },
          { label: "Account number", value: "12345678" },
        ],
      },
      {
        label: "International",
        fields: [
          { label: "IBAN", value: "GB00 EXMP 0000 0000 0000 00" },
          { label: "BIC", value: "EXMPGB2L" },
        ],
      },
    ],
    ...overrides,
  };
}

describe("BankTransferInstructions", () => {
  it("shows the reference, the amount and the deadline", () => {
    render(<BankTransferInstructions quote={quote()} locale="en" />);

    expect(screen.getByText("ACME-7Q4X2")).toBeInTheDocument();
    expect(screen.getByText("£75.66")).toBeInTheDocument();
    expect(screen.getByText("payBy:November 11, 2026")).toBeInTheDocument();
  });

  it("shows every detail set with its fields", () => {
    render(<BankTransferInstructions quote={quote()} locale="en" />);

    for (const text of [
      "UK payments",
      "International",
      "04-00-75",
      "12345678",
      "GB00 EXMP 0000 0000 0000 00",
      "EXMPGB2L",
      "accountName:Example Store Ltd",
    ]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
  });

  it("leaves out what a detail set does not have", () => {
    render(
      <BankTransferInstructions
        quote={quote({
          bankDetails: [{ fields: [{ label: "IBAN", value: "GB00 EXMP" }] }],
        })}
        locale="en"
      />,
    );

    // Only the section's own heading: no empty one for the unlabelled set.
    expect(screen.getAllByRole("heading")).toHaveLength(1);
    expect(screen.queryByText(/accountName/)).toBeNull();
    expect(screen.getByText("GB00 EXMP")).toBeInTheDocument();
  });

  it("leaves out the deadline when there is none", () => {
    render(
      <BankTransferInstructions
        quote={quote({ expiresAt: null })}
        locale="en"
      />,
    );

    expect(screen.queryByText(/payBy/)).toBeNull();
  });

  describe("copying", () => {
    const writeText = vi.fn().mockResolvedValue(undefined);

    beforeEach(() => {
      writeText.mockClear();
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText },
        configurable: true,
      });
    });

    it("copies the reference", async () => {
      render(<BankTransferInstructions quote={quote()} locale="en" />);

      fireEvent.click(screen.getByRole("button", { name: "copyReference" }));

      expect(writeText).toHaveBeenCalledWith("ACME-7Q4X2");
      await waitFor(() =>
        expect(screen.getByText("copied")).toBeInTheDocument(),
      );
    });
  });
});
