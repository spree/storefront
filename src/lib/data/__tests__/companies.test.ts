import { beforeEach, describe, expect, it, vi } from "vitest";

const mockClient = {
  account: {
    companies: vi.fn(),
  },
  carts: {
    update: vi.fn(),
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

const COMPANY_SITE = {
  id: "addr_dock",
  address1: "14 Dock Road",
  owner: { id: "comp_hq", type: "company", name: "Acme Logistics" },
};
const PERSONAL = {
  id: "addr_home",
  address1: "3 Laburnum Grove",
  owner: { id: "cust_1", type: "customer", name: null },
};

import { adoptSoleStandingCompany, getCartAddresses } from "../companies";

describe("getCartAddresses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClient.carts.addresses.list.mockResolvedValue({
      data: [COMPANY_SITE, PERSONAL],
    });
  });

  // Both books come from the cart in one call: it is the only party that
  // knows which company the purchase is for, including the one a buyer with
  // a single membership never had to state.
  it("asks the cart for both books at once", async () => {
    const addresses = await getCartAddresses("cart_1");

    expect(mockClient.carts.addresses.list).toHaveBeenCalledWith(
      "cart_1",
      undefined,
      expect.anything(),
    );
    expect(addresses).toEqual([COMPANY_SITE, PERSONAL]);
  });

  // Checkout has to render with whatever it has; an unreachable book means
  // the buyer types an address rather than seeing an error page.
  it("offers nothing when the call fails", async () => {
    mockClient.carts.addresses.list.mockRejectedValue(new Error("boom"));

    expect(await getCartAddresses("cart_1")).toEqual([]);
  });
});

const COMPANY = { id: "comp_hq", name: "Acme Logistics" };
const CART = { id: "cart_1", company_id: null } as never;

describe("adoptSoleStandingCompany", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClient.carts.update.mockResolvedValue({
      id: "cart_1",
      company_id: "comp_hq",
    });
  });

  // The server offers a company's sites only once the cart names it, so a
  // buyer who was never asked to choose would otherwise lose their employer's
  // addresses at the address step.
  it("names the company when the buyer belongs to exactly one", async () => {
    mockClient.account.companies.mockResolvedValue({
      data: [{ company: COMPANY }],
    });

    const cart = await adoptSoleStandingCompany(CART);

    expect(mockClient.carts.update).toHaveBeenCalledWith(
      "cart_1",
      { company_id: "comp_hq" },
      expect.anything(),
    );
    expect(cart?.company_id).toBe("comp_hq");
  });

  // Picking one would be guessing which business is being bought for, and the
  // wrong guess invoices the wrong one.
  it("leaves the cart alone when several companies could apply", async () => {
    mockClient.account.companies.mockResolvedValue({
      data: [
        { company: COMPANY },
        { company: { id: "comp_other", name: "B" } },
      ],
    });

    expect(await adoptSoleStandingCompany(CART)).toBeNull();
    expect(mockClient.carts.update).not.toHaveBeenCalled();
  });

  it("leaves a personal purchase alone", async () => {
    mockClient.account.companies.mockResolvedValue({ data: [] });

    expect(await adoptSoleStandingCompany(CART)).toBeNull();
    expect(mockClient.carts.update).not.toHaveBeenCalled();
  });

  // The buyer's own choice, or one made on an earlier load, is not re-decided.
  it("does not overwrite a company the cart already names", async () => {
    const named = { id: "cart_1", company_id: "comp_chosen" } as never;

    expect(await adoptSoleStandingCompany(named)).toBeNull();
    expect(mockClient.account.companies).not.toHaveBeenCalled();
  });
});
