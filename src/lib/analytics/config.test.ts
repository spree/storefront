import { describe, expect, it } from "vitest";
import { resolveAnalyticsTags } from "./config";

describe("resolveAnalyticsTags", () => {
  it("uses GTM instead of loading direct GA4 alongside it", () => {
    expect(
      resolveAnalyticsTags({
        google_analytics: { measurement_id: "G-EXAMPLE123" },
        google_tag_manager: { container_id: "GTM-EXAMPLE" },
      }),
    ).toEqual({ gtmId: "GTM-EXAMPLE", gaId: null });
  });

  it("uses direct GA4 if GTM is absent", () => {
    expect(
      resolveAnalyticsTags({
        google_analytics: { measurement_id: "G-EXAMPLE123" },
      }),
    ).toEqual({ gtmId: null, gaId: "G-EXAMPLE123" });
  });
});
