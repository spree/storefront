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

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}"));
    await options.fetch("https://api.example/store", { method: "GET" });
    expect(fetchSpy.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
    fetchSpy.mockRestore();
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
