import { describe, expect, it } from "vitest";
import { applyHomePersonalization } from "@/lib/theme/apply-home-composition";

describe("applyHomePersonalization", () => {
  const template = {
    id: "tpl_1",
    key: "default",
    full_key: "home.default",
    name: "Home",
    template_type: "home",
    template_key: "default",
    data: {
      order: ["hero", "rail_a"],
      sections: {
        hero: { type: "hero", settings: { title: "Welcome" } },
        rail_a: {
          type: "product_rail",
          settings: { source: "trending", title: "Picks" },
        },
      },
    },
  };

  it("returns template unchanged when composition is static", () => {
    const result = applyHomePersonalization({
      template,
      composition: {
        section_order: ["hero", "rail_a"],
        sections: {},
        composition_version: "static",
        expires_at: null,
        interest_version: null,
      },
    });
    expect(result.contextExtras).toEqual({});
    expect(result.template.data?.order).toEqual(["hero", "rail_a"]);
  });

  it("reorders sections and fills product rails", () => {
    const result = applyHomePersonalization({
      template,
      composition: {
        section_order: ["rail_a", "hero"],
        sections: {
          rail_a: {
            type: "product_rail",
            product_ids: ["prod_a", "prod_b"],
            reason_codes: ["recommended_for_you"],
          },
          hero: { type: "hero", hero_variant: "slider" },
        },
        composition_version: "cmp_123",
        expires_at: null,
        interest_version: "int_1",
      },
    });
    expect(result.template.data?.order).toEqual(["rail_a", "hero"]);
    const rail = result.template.data?.sections?.rail_a;
    expect(rail?.settings?.source).toBe("manual");
    expect(rail?.settings?.manual_product_ids).toEqual(["prod_a", "prod_b"]);
    expect(rail?.settings?.personalization_reason_codes).toEqual([
      "recommended_for_you",
    ]);
    expect(result.template.data?.sections?.hero?.settings?.hero_variant).toBe(
      "slider",
    );
    expect(result.contextExtras.compositionVersion).toBe("cmp_123");
  });
});
