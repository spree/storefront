import type { Store } from "@spree/sdk";
import { describe, expect, it } from "vitest";
import {
  buildOrganizationJsonLd,
  socialProfileUrl,
  twitterHandle,
} from "@/lib/seo";

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

describe("socialProfileUrl", () => {
  it.each([
    ["acme", "https://facebook.com/acme"],
    ["@acme", "https://facebook.com/acme"],
    ["  acme.store  ", "https://facebook.com/acme.store"],
    ["facebook.com/acme", "https://facebook.com/acme"],
    ["www.facebook.com/acme/", "https://www.facebook.com/acme/"],
    ["https://facebook.com/acme", "https://facebook.com/acme"],
    ["http://facebook.com/acme", "http://facebook.com/acme"],
  ])("turns %j into %s", (value, expected) => {
    expect(socialProfileUrl(value, "facebook.com")).toBe(expected);
  });

  it.each([
    null,
    undefined,
    "",
    "   ",
    "Acme Store",
    "https://facebook.com/",
    "javascript:alert(1)//",
  ])("drops %j", (value) => {
    expect(socialProfileUrl(value, "facebook.com")).toBeNull();
  });
});

describe("twitterHandle", () => {
  it.each([
    ["acme", "@acme"],
    ["@acme", "@acme"],
    [" acme_shop ", "@acme_shop"],
    ["x.com/acme", "@acme"],
    ["https://twitter.com/acme", "@acme"],
    ["https://x.com/acme/", "@acme"],
    ["https://x.com/acme?lang=en", "@acme"],
    ["https://x.com/acme/status/123", "@acme"],
    ["https://x.com/@acme", "@acme"],
  ])("turns %j into %s", (value, expected) => {
    expect(twitterHandle(value)).toBe(expected);
  });

  it.each([
    null,
    undefined,
    "",
    "   ",
    "@",
    "acme store",
    "acme.store",
    "a_username_too_long",
    "https://x.com/",
  ])("drops %j", (value) => {
    expect(twitterHandle(value)).toBeNull();
  });
});

describe("buildOrganizationJsonLd", () => {
  it("omits optional fields the store does not set", () => {
    const schema = buildOrganizationJsonLd(baseStore);

    expect(schema.name).toBe("Acme");
    expect(schema).not.toHaveProperty("logo");
    expect(schema).not.toHaveProperty("sameAs");
    expect(schema).not.toHaveProperty("contactPoint");
  });

  it("builds profile URLs from handles and keeps full URLs", () => {
    const schema = buildOrganizationJsonLd({
      ...baseStore,
      facebook: "acme",
      twitter: "@acme",
      instagram: "https://instagram.com/acme.store",
    });

    expect(schema.sameAs).toEqual([
      "https://facebook.com/acme",
      "https://x.com/acme",
      "https://instagram.com/acme.store",
    ]);
  });

  it("adds a protocol to a profile URL typed without one", () => {
    const schema = buildOrganizationJsonLd({
      ...baseStore,
      facebook: "facebook.com/acme",
      instagram: "instagram.com/acme",
    });

    expect(schema.sameAs).toEqual([
      "https://facebook.com/acme",
      "https://instagram.com/acme",
    ]);
  });

  it("leaves out social values that are not a handle or profile URL", () => {
    const schema = buildOrganizationJsonLd({
      ...baseStore,
      facebook: "Acme Store",
      twitter: "  ",
    });

    expect(schema).not.toHaveProperty("sameAs");
  });

  it("includes the logo and support email", () => {
    const schema = buildOrganizationJsonLd({
      ...baseStore,
      logo_url: "https://cdn.example.com/logo.png",
      customer_support_email: "help@example.com",
    });

    expect(schema.logo).toBe("https://cdn.example.com/logo.png");
    expect(schema.contactPoint).toEqual({
      "@type": "ContactPoint",
      email: "help@example.com",
      contactType: "customer service",
    });
  });
});
