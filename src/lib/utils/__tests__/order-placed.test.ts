import type { Order, OrderGroup } from "@spree/sdk";
import { describe, expect, it } from "vitest";
import { orderPlacedPath, parseOrderIds } from "@/lib/utils/order-placed";

const order = { id: "or_1", number: "R100" } as Order;

const group = {
  id: "og_1",
  number: "R100",
  orders: [
    { id: "or_1", number: "R100-1" },
    { id: "or_2", number: "R100-2" },
  ],
} as OrderGroup;

describe("orderPlacedPath", () => {
  it("links a single order by cart id", () => {
    expect(orderPlacedPath("/us/en", "cart_1", order)).toBe(
      "/us/en/order-placed/cart_1",
    );
  });

  it("links by cart id when the result is unknown", () => {
    expect(orderPlacedPath("/us/en", "cart_1", null)).toBe(
      "/us/en/order-placed/cart_1",
    );
  });

  it("carries a split checkout's order ids", () => {
    expect(orderPlacedPath("/us/en", "cart_1", group)).toBe(
      "/us/en/order-placed/cart_1?orders=or_1%2Cor_2",
    );
  });
});

describe("parseOrderIds", () => {
  it("returns an empty list for a missing param", () => {
    expect(parseOrderIds(null)).toEqual([]);
    expect(parseOrderIds("")).toEqual([]);
  });

  it("reads comma-separated ids", () => {
    expect(parseOrderIds("or_1,or_2")).toEqual(["or_1", "or_2"]);
  });

  it("drops malformed and duplicate ids", () => {
    expect(parseOrderIds("or_1,,../x,or_1, or_2 ")).toEqual(["or_1", "or_2"]);
  });

  it("caps the number of ids", () => {
    const ids = Array.from({ length: 40 }, (_, i) => `or_${i}`).join(",");
    expect(parseOrderIds(ids)).toHaveLength(25);
  });
});
