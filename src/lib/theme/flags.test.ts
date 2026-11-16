import { afterEach, describe, expect, it, vi } from "vitest";
import { editorialStorefrontEnabled } from "./flags";

describe("editorialStorefrontEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is off by default", () => {
    expect(editorialStorefrontEnabled()).toBe(false);
  });

  it("accepts editorial and minted aliases", () => {
    vi.stubEnv("STOREFRONT_PRESENTATION", "editorial");
    expect(editorialStorefrontEnabled()).toBe(true);
    vi.stubEnv("STOREFRONT_PRESENTATION", "minted");
    expect(editorialStorefrontEnabled()).toBe(true);
  });

  it("classic restores the prior presentation", () => {
    vi.stubEnv("STOREFRONT_PRESENTATION", "classic");
    expect(editorialStorefrontEnabled()).toBe(false);
  });
});
