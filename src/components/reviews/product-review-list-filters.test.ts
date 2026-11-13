import { describe, expect, it } from "vitest";
import { resolveProductReviewCount } from "./product-review-list-filters";

describe("resolveProductReviewCount", () => {
  it("never reports fewer reviews than the page actually contains", () => {
    expect(resolveProductReviewCount(0, 0, 5)).toBe(5);
  });

  it("uses filtered API counts instead of the unfiltered aggregate", () => {
    expect(resolveProductReviewCount(2, 16, 2)).toBe(2);
  });

  it("falls back to the aggregate count when pagination metadata is absent", () => {
    expect(resolveProductReviewCount(undefined, 16, 5)).toBe(16);
  });
});
