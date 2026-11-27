import { describe, expect, it } from "vitest";
import { queryString } from "../query-string";

describe("queryString", () => {
  it("is empty without params", () => {
    expect(queryString({})).toBe("");
    expect(queryString({ sort: undefined })).toBe("");
  });

  it("keeps repeated keys and encodes values", () => {
    expect(queryString({ sort: "-price", color: ["red", "dark blue"] })).toBe(
      "?sort=-price&color=red&color=dark+blue",
    );
  });
});
