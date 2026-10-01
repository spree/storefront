import type { Policy } from "@spree/sdk";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getPolicy } from "@/lib/data/policies";
import { buildLocalizedAlternates } from "@/lib/metadata/alternates";
import { generateMetadata } from "./page";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(),
}));

vi.mock("@/lib/data/policies", () => ({
  cachedGetPolicy: vi.fn(),
  getPolicy: vi.fn(),
}));

vi.mock("@/lib/metadata/alternates", () => ({
  buildLocalizedAlternates: vi.fn(),
  translationFingerprint: (...fields: unknown[]) => JSON.stringify(fields),
}));

const policy = {
  id: "policy-1",
  name: "Privacy Policy",
  slug: "privacy-policy",
  body: null,
  body_html: null,
  updated_at: "2026-01-01T00:00:00Z",
} satisfies Policy;

describe("policy metadata", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://store.example/");
    vi.stubEnv("NEXT_PUBLIC_STORE_NAME", "Example Store");
    vi.mocked(getPolicy).mockResolvedValue(policy);
    vi.mocked(buildLocalizedAlternates).mockResolvedValue({
      canonical: "https://store.example/us/en/policies/privacy-policy",
      languages: {
        en: "https://store.example/us/en/policies/privacy-policy",
        de: "https://store.example/us/de/policies/datenschutz",
        "x-default": "https://store.example/us/en/policies/privacy-policy",
      },
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("sets the localized policy URL as canonical", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({
        country: "us",
        locale: "en",
        slug: "privacy-policy",
      }),
    });

    const canonicalUrl = "https://store.example/us/en/policies/privacy-policy";

    expect(metadata).toMatchObject({
      title: "Privacy Policy",
      description: "Privacy Policy — Example Store",
      alternates: {
        canonical: canonicalUrl,
        languages: {
          en: canonicalUrl,
          de: "https://store.example/us/de/policies/datenschutz",
          "x-default": canonicalUrl,
        },
      },
      openGraph: {
        title: "Privacy Policy",
        description: "Privacy Policy — Example Store",
        url: canonicalUrl,
      },
    });
    expect(getPolicy).toHaveBeenCalledWith("privacy-policy", {
      country: "us",
      locale: "en",
    });
  });
});
