import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCookieValues = new Map<string, string>();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = mockCookieValues.get(name);
      return value === undefined ? undefined : { name, value };
    },
  }),
}));

vi.mock("../config", () => ({
  getConfig: () => ({}),
}));

import { getCatalogAccessToken } from "../cookies";

function jwtExpiringIn(seconds: number): string {
  const exp = Math.floor(Date.now() / 1000) + seconds;
  const payload = btoa(JSON.stringify({ exp }))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `header.${payload}.signature`;
}

describe("getCatalogAccessToken", () => {
  beforeEach(() => {
    mockCookieValues.clear();
  });

  it("returns the customer's live JWT", async () => {
    const token = jwtExpiringIn(3600);
    mockCookieValues.set("_spree_jwt", token);

    await expect(getCatalogAccessToken()).resolves.toBe(token);
  });

  it("reads an expired JWT as a guest instead of sending it", async () => {
    mockCookieValues.set("_spree_jwt", jwtExpiringIn(-60));

    await expect(getCatalogAccessToken()).resolves.toBeUndefined();
  });

  it("returns undefined for a guest", async () => {
    await expect(getCatalogAccessToken()).resolves.toBeUndefined();
  });
});
