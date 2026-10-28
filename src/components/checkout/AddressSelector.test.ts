import type { Address } from "@spree/sdk";
import { describe, expect, it } from "vitest";
import { groupByBook } from "./AddressSelector";

function address(id: string, owner: Address["owner"]): Address {
  return { id, owner } as Address;
}

const HEADQUARTERS = { id: "comp_hq", type: "company", name: "Acme" } as const;
const DIVISION = {
  id: "comp_north",
  type: "company",
  name: "Acme North",
} as const;
const BUYER = { id: "cust_1", type: "customer", name: null } as const;

describe("groupByBook", () => {
  it("puts the company's sites ahead of the buyer's own", () => {
    const groups = groupByBook(
      [address("addr_home", BUYER), address("addr_dock", HEADQUARTERS)],
      "Your addresses",
    );

    expect(groups.map((group) => group.key)).toEqual(["comp_hq", "personal"]);
    expect(groups[0]?.heading).toBe("Acme");
    expect(groups[1]?.heading).toBe("Your addresses");
  });

  // An inherited site belongs to the node above the one the cart is for.
  // Filing it under the division would tell the buyer it is somewhere it
  // is not.
  it("keeps an inherited site under the node that owns it", () => {
    const groups = groupByBook(
      [address("addr_hq", HEADQUARTERS), address("addr_north", DIVISION)],
      "Your addresses",
    );

    expect(groups.map((group) => group.heading)).toEqual([
      "Acme",
      "Acme North",
      "Your addresses",
    ]);
  });

  // The company's book is the organization's; the customer address endpoint
  // would refuse a write to it, so the picker must not offer one.
  it("marks only the buyer's own book editable", () => {
    const groups = groupByBook(
      [address("addr_home", BUYER), address("addr_dock", HEADQUARTERS)],
      "Your addresses",
    );

    expect(groups.map((group) => group.editable)).toEqual([false, true]);
  });
});
