import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DocumentShell } from "./DocumentShell";

vi.mock("next/font/local", () => ({
  default: () => ({ variable: "--font-local-mock" }),
}));

vi.mock("@next/third-parties/google", () => ({
  GoogleTagManager: () => null,
  GoogleAnalytics: () => null,
}));

vi.mock("@/components/layout/StorefrontAnalyticsConsent", () => ({
  StorefrontAnalyticsConsent: () => null,
}));

vi.mock("@vercel/analytics/next", () => ({
  Analytics: () => <span data-hosted-analytics />,
}));

vi.mock("@vercel/speed-insights/next", () => ({
  SpeedInsights: () => <span data-hosted-speed-insights />,
}));

describe("DocumentShell", () => {
  afterEach(() => vi.unstubAllEnvs());

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

  it("loads platform telemetry only where its script routes are available", () => {
    const renderDocument = () =>
      renderToStaticMarkup(
        DocumentShell({ children: <main>Storefront</main>, locale: "en" }),
      );

    vi.stubEnv("VERCEL", undefined);
    expect(renderDocument()).not.toContain("data-hosted-analytics");
    expect(renderDocument()).not.toContain("data-hosted-speed-insights");

    vi.stubEnv("VERCEL", "1");
    expect(renderDocument()).toContain("data-hosted-analytics");
    expect(renderDocument()).toContain("data-hosted-speed-insights");
  });
});
