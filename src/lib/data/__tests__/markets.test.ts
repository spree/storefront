import { beforeEach, describe, expect, it, vi } from "vitest";

const { listMarkets, getLocaleOptions } = vi.hoisted(() => ({
  listMarkets: vi.fn(),
  getLocaleOptions: vi.fn(),
}));

vi.mock("@/lib/spree", () => ({
  getClient: () => ({ markets: { list: listMarkets } }),
  getLocaleOptions,
}));

vi.mock("@/lib/store", () => ({
  getDefaultCountry: () => "us",
  getDefaultLocale: () => "pt-BR",
}));

vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}));

import { getStorefrontMarkets, resolveCurrency } from "@/lib/data/markets";

describe("getStorefrontMarkets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listMarkets.mockResolvedValue({
      data: [
        { currency: "USD", countries: [{ iso: "US" }] },
        { currency: "EUR", countries: [{ iso: "DE" }, { iso: "PL" }] },
      ],
    });
  });

  it("looks Markets up through the configured defaults, never the request", async () => {
    await getStorefrontMarkets();

    // pt-BR has no message bundle, so the lookup falls back to a supported locale.
    expect(listMarkets).toHaveBeenCalledWith({ country: "us", locale: "en" });
    expect(getLocaleOptions).not.toHaveBeenCalled();
  });

  it("resolves the currency of the Market serving a country", async () => {
    await expect(resolveCurrency("pl")).resolves.toBe("EUR");
    await expect(resolveCurrency("jp")).resolves.toBeUndefined();
    expect(getLocaleOptions).not.toHaveBeenCalled();
  });
});
