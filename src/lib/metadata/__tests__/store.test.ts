import type { Store } from "@spree/sdk";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getStore } = vi.hoisted(() => ({ getStore: vi.fn() }));

vi.mock("@/lib/data/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/data/store")>()),
  getStore,
}));

vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => `footer.${key}`,
}));

import { generateStoreMetadata } from "@/lib/metadata/store";

const baseStore: Store = {
  id: "store_1",
  name: "Acme",
  seo_title: null,
  meta_description: null,
  meta_keywords: null,
  facebook: null,
  twitter: null,
  instagram: null,
  customer_support_email: null,
  logo_url: null,
};

describe("generateStoreMetadata", () => {
  beforeEach(() => {
    getStore.mockReset();
  });

  it("reads keywords and the X account from the store", async () => {
    getStore.mockResolvedValue({
      ...baseStore,
      meta_keywords: "shoes, boots",
      twitter: "https://x.com/acme",
    });

    const metadata = await generateStoreMetadata({ locale: "en" });

    expect(metadata.keywords).toBe("shoes, boots");
    expect(metadata.twitter).toEqual({
      card: "summary_large_image",
      site: "@acme",
    });
  });

  it("leaves keywords and twitter:site out when the store has none", async () => {
    getStore.mockResolvedValue(baseStore);

    const metadata = await generateStoreMetadata({ locale: "en" });

    expect(metadata).not.toHaveProperty("keywords");
    expect(metadata.twitter).toEqual({ card: "summary_large_image" });
    expect(metadata.description).toBe("footer.description");
  });
});
