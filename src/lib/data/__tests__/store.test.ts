import { beforeEach, describe, expect, it, vi } from "vitest";

const { getStoreApi, createClient } = vi.hoisted(() => ({
  getStoreApi: vi.fn(),
  createClient: vi.fn(),
}));

vi.mock("@spree/sdk", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@spree/sdk")>()),
  createClient,
}));

vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}));

vi.mock("@/lib/spree", () => ({
  getConfig: () => ({
    baseUrl: "https://api.example",
    publishableKey: "pk_test",
  }),
}));

createClient.mockReturnValue({ store: { get: getStoreApi } });

import { getStore } from "@/lib/data/store";
import { FALLBACK_STORE_NAME } from "@/lib/store";

describe("getStore", () => {
  beforeEach(() => {
    getStoreApi.mockReset();
  });

  it("uses a client that does not retry and cancels a stalled request", async () => {
    getStoreApi.mockResolvedValue({ id: "store_1", name: "Acme" });

    await expect(getStore("en")).resolves.toMatchObject({ name: "Acme" });

    expect(createClient).toHaveBeenCalledTimes(1);
    const options = createClient.mock.calls[0][0];
    expect(options).toMatchObject({
      baseUrl: "https://api.example",
      publishableKey: "pk_test",
      retry: false,
    });
  });

  it("cancels a stalled request at 3 seconds and falls back", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const deadline = new AbortController();
    const timeoutSpy = vi
      .spyOn(AbortSignal, "timeout")
      .mockReturnValue(deadline.signal);
    // A Store API that never answers: the request settles only when aborted.
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(init.signal?.reason),
          );
        }),
    );
    const { fetch: boundedFetch } = createClient.mock.calls[0][0];
    getStoreApi.mockImplementation(() =>
      boundedFetch("https://api.example/store", { method: "GET" }),
    );

    const result = getStore("fr");
    await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    expect(timeoutSpy).toHaveBeenCalledWith(3000);
    expect(fetchSpy.mock.calls[0][1]?.signal).toBe(deadline.signal);

    deadline.abort(
      new DOMException("The operation timed out.", "TimeoutError"),
    );
    await expect(result).resolves.toMatchObject({ name: FALLBACK_STORE_NAME });

    fetchSpy.mockRestore();
    timeoutSpy.mockRestore();
    consoleError.mockRestore();
  });

  it("falls back to the default store name when the lookup fails", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    getStoreApi.mockRejectedValue(
      new DOMException("The operation timed out.", "TimeoutError"),
    );

    await expect(getStore("de")).resolves.toMatchObject({
      name: FALLBACK_STORE_NAME,
      seo_title: null,
      meta_description: null,
    });
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
