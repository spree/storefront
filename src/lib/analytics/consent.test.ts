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

  it("withholds events until a choice is saved", () => {
    expect(analyticsConsentGranted()).toBe(false);
    expect(analyticsConsentChoice()).toBeNull();
  });

  it("allows events only after analytics is granted", () => {
    expect(analyticsConsentGranted()).toBe(false);
    setAnalyticsConsent("granted");
    expect(analyticsConsentGranted()).toBe(true);
    setAnalyticsConsent("denied");
    expect(analyticsConsentGranted()).toBe(false);
  });
});
