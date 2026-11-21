import { afterEach, describe, expect, it, vi } from "vitest";
import { withTimeout } from "@/lib/utils/with-timeout";

describe("withTimeout", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves with the promise when it settles in time", async () => {
    await expect(
      withTimeout(Promise.resolve("value"), 50, "fallback"),
    ).resolves.toBe("value");
  });

  it("resolves with the fallback when the promise is too slow", async () => {
    vi.useFakeTimers();
    const pending = new Promise<string>(() => {});
    const result = withTimeout(pending, 1000, "fallback");
    await vi.advanceTimersByTimeAsync(1000);
    await expect(result).resolves.toBe("fallback");
  });

  it("passes a rejection through", async () => {
    await expect(
      withTimeout(Promise.reject(new Error("boom")), 50, "fallback"),
    ).rejects.toThrow("boom");
  });
});
