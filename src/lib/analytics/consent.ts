const CONSENT_STORAGE_KEY = "spree_analytics_consent";
export type AnalyticsConsentChoice = "granted" | "denied";

export function analyticsConsentChoice(): AnalyticsConsentChoice | null {
  if (typeof window === "undefined") return null;
  try {
    const choice = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    return choice === "granted" || choice === "denied" ? choice : null;
  } catch {
    return null;
  }
}

/**
 * When NEXT_PUBLIC_ANALYTICS_REQUIRE_CONSENT=true, ecommerce events are withheld
 * until the buyer grants analytics in local storage (`granted`).
 */
export function analyticsConsentGranted(): boolean {
  return analyticsConsentChoice() === "granted";
}

export function setAnalyticsConsent(choice: AnalyticsConsentChoice): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, choice);
    window.dispatchEvent(
      new CustomEvent("spree-analytics-consent", { detail: choice }),
    );
  } catch {
    // ignore quota / private mode
  }
}
