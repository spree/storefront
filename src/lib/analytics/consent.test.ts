import { afterEach, describe, expect, it, vi } from "vitest";
import {
  analyticsConsentChoice,
  analyticsConsentGranted,
  setAnalyticsConsent,
} from "./consent";

describe("analyticsConsentGranted", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    window.localStorage.clear();
  });

  it("allows events by default when consent banner is disabled", () => {
    expect(analyticsConsentGranted()).toBe(true);
  });

  it("withholds events until a choice is saved when consent is required", () => {
    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_REQUIRE_CONSENT", "true");
    expect(analyticsConsentGranted()).toBe(false);
    expect(analyticsConsentChoice()).toBeNull();
  });

  it("allows events only after analytics is granted when consent is required", () => {
    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_REQUIRE_CONSENT", "true");
    expect(analyticsConsentGranted()).toBe(false);
    setAnalyticsConsent("granted");
    expect(analyticsConsentGranted()).toBe(true);
    setAnalyticsConsent("denied");
    expect(analyticsConsentGranted()).toBe(false);
  });
});
