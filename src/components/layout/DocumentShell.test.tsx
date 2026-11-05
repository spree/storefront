import type { ReactElement, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DocumentShell, KlaviyoScript } from "./DocumentShell";

vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "--font-geist" }),
}));

vi.mock("@next/third-parties/google", () => ({
  GoogleTagManager: () => null,
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

  describe("Klaviyo", () => {
    afterEach(() => {
      vi.unstubAllEnvs();
    });

    function scripts() {
      const fragment = KlaviyoScript() as ReactElement<{
        children: ReactElement<{ id: string; src?: string }>[];
      }> | null;
      return fragment ? fragment.props.children : [];
    }

    it("is part of every document", () => {
      const document = DocumentShell({
        children: <main>Storefront</main>,
        locale: "en",
      }) as ReactElement<{ children: ReactNode }>;
      const children = [document.props.children].flat() as ReactElement[];

      expect(children.some((child) => child?.type === KlaviyoScript)).toBe(
        true,
      );
    });

    it("loads Klaviyo's script when KLAVIYO_COMPANY_ID is set", () => {
      vi.stubEnv("KLAVIYO_COMPANY_ID", "AbC123");

      const loaded = scripts();

      expect(loaded.map((script) => script.props.id)).toEqual([
        "klaviyo-init",
        "klaviyo-onsite",
      ]);
      expect(loaded[1].props.src).toBe(
        "https://static.klaviyo.com/onsite/js/AbC123/klaviyo.js?company_id=AbC123",
      );
    });

    it("loads nothing when KLAVIYO_COMPANY_ID is empty", () => {
      vi.stubEnv("KLAVIYO_COMPANY_ID", "");

      expect(KlaviyoScript()).toBeNull();
    });
  });
});
