import { beforeEach, describe, expect, it, vi } from "vitest";

const mockClient = {
  carts: {
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

import { getCartAddresses } from "../companies";

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
