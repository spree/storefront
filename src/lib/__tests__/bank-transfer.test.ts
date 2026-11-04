import type { Order, PaymentMethod } from "@spree/sdk";
import { describe, expect, it } from "vitest";
import {
  bankTransferMethodInfo,
  bankTransferQuote,
  hasBankTransferDiscount,
  pendingBankTransfers,
} from "@/lib/bank-transfer";

const UK_FIELDS = [
  { label: "Sort code", value: "04-00-75" },
  { label: "Account number", value: "12345678" },
];

function payload(overrides: Record<string, unknown> = {}) {
  return {
    reference: "ACME-7Q4X2",
    amount: "75.66",
    currency: "GBP",
    expires_at: "2026-11-11T12:00:00Z",
    discount_percent: "3",
    bank_details: [
      {
        label: "UK payments",
        schemes: ["faster_payments"],
        beneficiary_name: "Example Store Ltd",
        beneficiary_address: "1 Example Street\nLondon",
        fields: UK_FIELDS,
      },
    ],
    ...overrides,
  };
}

function method(bankTransfer: unknown): PaymentMethod {
  return {
    id: "pm_1",
    name: "Bank transfer",
    type: "bank_transfer",
    session_required: true,
    bank_transfer: bankTransfer,
  } as unknown as PaymentMethod;
}

describe("bankTransferMethodInfo", () => {
  it("reads the discount and window off a bank transfer method", () => {
    expect(
      bankTransferMethodInfo(method({ discount_percent: "3", expiry_days: 7 })),
    ).toEqual({ discountPercent: "3", expiryDays: 7 });
  });

  it("reads nothing off another method", () => {
    expect(bankTransferMethodInfo(method(null))).toBeNull();
  });
});

describe("bankTransferQuote", () => {
  it("reads a quote", () => {
    expect(bankTransferQuote(payload())).toEqual({
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
          fields: UK_FIELDS,
        },
      ],
    });
  });

  it("keeps a detail set that has only fields", () => {
    const quote = bankTransferQuote(
      payload({
        bank_details: [
          { fields: [{ label: "IBAN", value: "GB00 EXMP 0000" }] },
        ],
      }),
    );

    expect(quote?.bankDetails).toEqual([
      {
        label: undefined,
        beneficiaryName: undefined,
        beneficiaryAddress: undefined,
        fields: [{ label: "IBAN", value: "GB00 EXMP 0000" }],
      },
    ]);
  });

  it("drops detail sets and fields with nothing to pay into", () => {
    const quote = bankTransferQuote(
      payload({
        bank_details: [
          { label: "Empty", fields: [{ label: "IBAN", value: "  " }] },
          {
            label: "UK payments",
            fields: [...UK_FIELDS, { label: "Broken", value: 12 }, "junk"],
          },
          "junk",
        ],
      }),
    );

    expect(quote?.bankDetails.map((set) => [set.label, set.fields])).toEqual([
      ["UK payments", UK_FIELDS],
    ]);
  });

  it("reads no quote from null, a string or a quote without a reference", () => {
    expect(bankTransferQuote(null)).toBeNull();
    expect(bankTransferQuote("ACME-7Q4X2")).toBeNull();
    expect(bankTransferQuote(payload({ reference: null }))).toBeNull();
  });
});

describe("pendingBankTransfers", () => {
  it("lists the quotes of unpaid bank transfer payments", () => {
    const order = {
      payments: [
        { id: "py_1", status: "pending", bank_transfer: payload() },
        {
          id: "py_2",
          status: "completed",
          bank_transfer: payload({ reference: "ACME-PAID1" }),
        },
        { id: "py_3", status: "completed", bank_transfer: null },
      ],
    } as unknown as Order;

    expect(pendingBankTransfers(order).map((q) => q.reference)).toEqual([
      "ACME-7Q4X2",
    ]);
  });
});

describe("hasBankTransferDiscount", () => {
  it("sees a discount only above zero", () => {
    expect(hasBankTransferDiscount("3")).toBe(true);
    expect(hasBankTransferDiscount("2.5")).toBe(true);
    for (const none of ["0", "0.0", "", null, undefined]) {
      expect(hasBankTransferDiscount(none)).toBe(false);
    }
  });
});
