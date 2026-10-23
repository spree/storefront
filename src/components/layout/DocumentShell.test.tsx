import { describe, expect, it, vi } from "vitest";
import { DocumentShell } from "./DocumentShell";

vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "--font-geist" }),
  Playfair_Display: () => ({ variable: "--font-playfair" }),
}));

vi.mock("@next/third-parties/google", () => ({
  GoogleTagManager: () => null,
  GoogleAnalytics: () => null,
}));

vi.mock("@/components/layout/StorefrontAnalyticsConsent", () => ({
  StorefrontAnalyticsConsent: () => null,
}));

vi.mock("@vercel/analytics/next", () => ({
  Analytics: () => null,
}));

vi.mock("@vercel/speed-insights/next", () => ({
  SpeedInsights: () => null,
}));

describe("DocumentShell", () => {
  it("renders the route locale and tolerates extension root mutations", () => {
    const document = DocumentShell({
      children: <main>Storefront</main>,
      locale: "de",
    });

    expect(document.type).toBe("html");
    expect(document.props.lang).toBe("de");
    expect(document.props.dir).toBe("ltr");
    expect(document.props.suppressHydrationWarning).toBe(true);
  });

  it("sets the document direction for RTL language tags", () => {
    const document = DocumentShell({
      children: <main>Storefront</main>,
      locale: "ar",
    });

    expect(document.props.dir).toBe("rtl");
  });
});
