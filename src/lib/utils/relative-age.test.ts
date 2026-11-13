import { describe, expect, it } from "vitest";
import { formatRelativeAge } from "./relative-age";

describe("formatRelativeAge", () => {
  const now = Date.parse("2026-11-11T12:00:00Z");

  it("formats weeks and days", () => {
    expect(formatRelativeAge("2026-10-28T12:00:00Z", now)).toBe("2w");
    expect(formatRelativeAge("2026-11-08T12:00:00Z", now)).toBe("3d");
  });

  it("returns empty for invalid values", () => {
    expect(formatRelativeAge(null, now)).toBe("");
    expect(formatRelativeAge("not-a-date", now)).toBe("");
  });
});
