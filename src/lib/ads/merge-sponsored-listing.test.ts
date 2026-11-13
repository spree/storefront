import { describe, expect, it } from "vitest";
import { mergeOrganicWithSponsored } from "@/lib/ads/merge-sponsored-listing";

describe("mergeOrganicWithSponsored", () => {
  it("inserts sponsored rows at slot positions and skips organic duplicates", () => {
    const organic = [
      { id: "prod_1", name: "A", slug: "a" },
      { id: "prod_2", name: "B", slug: "b" },
    ] as const;

    const sponsored = [
      {
        product: { id: "prod_3", name: "C", slug: "c" },
        ad: {
          sponsored: true as const,
          placement: "search_results",
          disclosure_label: "Sponsored",
          campaign_id: "camp_1",
          ad_listing_id: "adl_1",
          slot_position: 1,
          impression_token: "tok1",
          click_token: "clk1",
        },
      },
      {
        product: { id: "prod_1", name: "A", slug: "a" },
        ad: {
          sponsored: true as const,
          placement: "search_results",
          disclosure_label: "Sponsored",
          campaign_id: "camp_2",
          ad_listing_id: "adl_2",
          slot_position: 2,
          impression_token: "tok2",
          click_token: "clk2",
        },
      },
    ];

    const cells = mergeOrganicWithSponsored(
      [...organic] as unknown as import("@spree/sdk").Product[],
      sponsored as import("@spree/sdk").SponsoredSearchResult[],
    );

    expect(cells.filter((c) => c.kind === "sponsored")).toHaveLength(1);
    expect(cells[0].kind).toBe("sponsored");
    expect(cells[1].kind).toBe("organic");
  });
});
