import { beforeEach, describe, expect, it, vi } from "vitest";

const mockClient = {
  account: {
    companies: vi.fn(),
  },
  companies: {
    get: vi.fn(),
    addresses: {
      list: vi.fn(),
    },
  },
  customer: {
    addresses: {
      list: vi.fn(),
    },
  },
};

vi.mock("@/lib/spree", () => ({
  getClient: () => mockClient,
  withAuthRefresh: (fn: (options: unknown) => unknown) => fn({}),
}));

vi.mock("next/cache", () => ({ updateTag: vi.fn() }));

const COMPANY = { id: "comp_hq", name: "Acme Logistics" };
const COMPANY_SITE = { id: "addr_dock", address1: "14 Dock Road" };
const PERSONAL = { id: "addr_home", address1: "3 Laburnum Grove" };

import { getCheckoutAddressBook } from "../companies";

describe("getCheckoutAddressBook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClient.companies.get.mockResolvedValue(COMPANY);
    mockClient.companies.addresses.list.mockResolvedValue({
      data: [COMPANY_SITE],
    });
    mockClient.customer.addresses.list.mockResolvedValue({ data: [PERSONAL] });
    mockClient.account.companies.mockResolvedValue({ data: [] });
  });

  it("offers the company's sites when the cart names one", async () => {
    const book = await getCheckoutAddressBook("comp_hq");

    expect(mockClient.companies.addresses.list).toHaveBeenCalledWith(
      "comp_hq",
      undefined,
      expect.anything(),
    );
    expect(book.company).toEqual(COMPANY);
    expect(book.addresses).toEqual([COMPANY_SITE]);
  });

  // The buyer never typed these addresses, so the organization has to be
  // named beside them.
  it("leaves the buyer's own book out of a company purchase", async () => {
    const book = await getCheckoutAddressBook("comp_hq");

    expect(book.addresses).not.toContainEqual(PERSONAL);
    expect(mockClient.customer.addresses.list).not.toHaveBeenCalled();
  });

  // The server resolves a sole membership silently, so a cart that never
  // named a company still accepts that company's sites.
  it("resolves a sole membership when the cart named nothing", async () => {
    mockClient.account.companies.mockResolvedValue({
      data: [{ company: COMPANY }],
    });

    const book = await getCheckoutAddressBook(null);

    expect(book.company).toEqual(COMPANY);
    expect(book.addresses).toEqual([COMPANY_SITE]);
  });

  // Refusing to guess, exactly as the server does — picking wrong would
  // deliver one business's goods to another's dock.
  it("falls back to the personal book when several memberships could apply", async () => {
    mockClient.account.companies.mockResolvedValue({
      data: [
        { company: COMPANY },
        { company: { id: "comp_other", name: "B" } },
      ],
    });

    const book = await getCheckoutAddressBook(null);

    expect(book.company).toBeNull();
    expect(book.addresses).toEqual([PERSONAL]);
  });

  it("gives a buyer with no memberships their own book", async () => {
    const book = await getCheckoutAddressBook(null);

    expect(book.company).toBeNull();
    expect(book.addresses).toEqual([PERSONAL]);
  });

  // Standing is the server's to judge: a node it refuses to read is one this
  // buyer may not act for, and offering nothing is safer than guessing.
  it("falls back to the personal book when the named node cannot be read", async () => {
    mockClient.companies.get.mockRejectedValue(new Error("not found"));

    const book = await getCheckoutAddressBook("comp_gone");

    expect(book.company).toBeNull();
    expect(book.addresses).toEqual([PERSONAL]);
  });
});
