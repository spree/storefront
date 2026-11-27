import { afterEach, describe, expect, it, vi } from "vitest";
import {
  decodeJwtExp,
  decodeJwtSub,
  isJwtExpired,
  liveAccessToken,
} from "@/lib/spree/jwt";

/** Build a JWT-shaped string (header.payload.signature) with the given payload. */
function makeToken(payload: Record<string, unknown>): string {
  const b64 = (obj: Record<string, unknown>) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_");
  return `${b64({ alg: "HS256", typ: "JWT" })}.${b64(payload)}.sig`;
}

describe("decodeJwtExp", () => {
  it("extracts a numeric exp claim", () => {
    expect(decodeJwtExp(makeToken({ exp: 1_700_000_000 }))).toBe(1_700_000_000);
  });

  it("returns null for a token without exp", () => {
    expect(decodeJwtExp(makeToken({ sub: "user" }))).toBeNull();
  });

  it("returns null for a malformed token", () => {
    expect(decodeJwtExp("not-a-jwt")).toBeNull();
    expect(decodeJwtExp("")).toBeNull();
  });
});

describe("isJwtExpired", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("treats a future-dated token as live", () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    expect(isJwtExpired(makeToken({ exp }))).toBe(false);
  });

  it("treats a past-dated token as expired", () => {
    const exp = Math.floor(Date.now() / 1000) - 10;
    expect(isJwtExpired(makeToken({ exp }))).toBe(true);
  });

  it("treats a token inside the skew window as expired", () => {
    const exp = Math.floor(Date.now() / 1000) + 60;
    expect(isJwtExpired(makeToken({ exp }), 300)).toBe(true);
    expect(isJwtExpired(makeToken({ exp }), 30)).toBe(false);
  });

  it("treats an undecodable token as not expired (server decides)", () => {
    expect(isJwtExpired("garbage")).toBe(false);
  });
});

describe("decodeJwtSub", () => {
  it("extracts the sub claim as a string", () => {
    expect(decodeJwtSub(makeToken({ sub: "cus_1" }))).toBe("cus_1");
    expect(decodeJwtSub(makeToken({ sub: 42 }))).toBe("42");
  });

  it("returns null without a sub claim or for a malformed token", () => {
    expect(decodeJwtSub(makeToken({ exp: 1 }))).toBeNull();
    expect(decodeJwtSub("not-a-jwt")).toBeNull();
  });
});

describe("liveAccessToken", () => {
  it("keeps a live token and drops an expired or missing one", () => {
    const now = Math.floor(Date.now() / 1000);
    const live = makeToken({ exp: now + 3600 });
    expect(liveAccessToken(live)).toBe(live);
    expect(liveAccessToken(makeToken({ exp: now - 60 }))).toBeUndefined();
    expect(liveAccessToken(undefined)).toBeUndefined();
  });
});
