import type { Seller } from "@spree/sdk";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl/server", () => ({
  getLocale: async () => "en",
  getTranslations: async () => (key: string, values?: { location?: string }) =>
    values?.location ? `${key}:${values.location}` : key,
}));

vi.mock("@/components/shops/ContactShopButton", () => ({
  ContactShopButton: () => null,
}));
vi.mock("@/components/shops/FollowShopButton", () => ({
  FollowShopButton: () => null,
}));
vi.mock("./SellerShopBanner", () => ({ SellerShopBanner: () => null }));
vi.mock("./SellerShopEditorThemeBridge", () => ({
  SellerShopEditorThemeBridge: () => null,
}));
vi.mock("./ShopEditorAction", () => ({ ShopEditorAction: () => null }));
vi.mock("@/components/seller-badges/SellerBadgeRow", () => ({
  SellerBadgeRow: ({ badges }: { badges: Array<{ key: string }> }) => (
    <div data-testid="seller-badge-row">
      {badges.map((badge) => (
        <span key={badge.key} data-seller-badge={badge.key}>
          {badge.key}
        </span>
      ))}
    </div>
  ),
}));

import { SellerShopHeader } from "./SellerShopHeader";

const seller = (badges: Seller["badges"]) =>
  ({
    id: "seller_1",
    name: "Test Maker",
    slug: "test-maker",
    sales_count: 25,
    reviews_count: 0,
    followers_count: 0,
    badges,
  }) as Seller;

describe("SellerShopHeader trust signals", () => {
  it("does not fall back to the seller cover when the banner layout is none", async () => {
    const html = renderToStaticMarkup(
      await SellerShopHeader({
        seller: {
          ...seller([]),
          cover_photo_url: "https://example.test/cover.jpg",
        } as Seller,
        basePath: "/us/en",
        following: false,
        shopPath: "/us/en/sellers/test-maker",
        shopBanner: { layout: "none", slides: [] } as never,
        editorPreview: true,
      }),
    );

    expect(html).not.toContain("https://example.test/cover.jpg");
    expect(html).not.toContain("data-seller-shop-cover-fallback");
  });

  it("shows the seller's public shipping location below shop stats", async () => {
    const html = renderToStaticMarkup(
      await SellerShopHeader({
        seller: { ...seller([]), ships_from: "Wilmington, DE" } as Seller,
        basePath: "/us/en",
        following: false,
        shopPath: "/us/en/sellers/test-maker",
      }),
    );

    expect(html).toContain("shipsFrom");
    expect(html).toContain("shipsFrom:Wilmington, DE");
  });

  it("applies the saved shop accent to the profile band with readable text", async () => {
    const html = renderToStaticMarkup(
      await SellerShopHeader({
        seller: { ...seller([]), shop_accent_color: "#273a35" } as Seller,
        basePath: "/us/en",
        following: false,
        shopPath: "/us/en/sellers/test-maker",
      }),
    );

    expect(html).toContain(
      "background-color:var(--marketplace-seller-accent, #ffffff)",
    );
    expect(html).toContain("--marketplace-seller-accent:#273a35");
    expect(html).toContain("--marketplace-seller-accent-text:#ffffff");
    expect(html).not.toContain("border-y border-[#e3ddd8]");
    expect(html).toContain(
      "text-[var(--marketplace-seller-accent-text,#29252d)]",
    );
  });

  it("shows shipping and reply signals only when their badges are awarded", async () => {
    const html = renderToStaticMarkup(
      await SellerShopHeader({
        seller: seller([
          {
            id: "badge_shipping",
            key: "on_time_shipping",
            label: "Smooth shipping",
            description: "Verified shipping history",
            awarded_at: "2026-10-01T00:00:00Z",
          },
          {
            id: "badge_replies",
            key: "fast_responder",
            label: "Speedy replies",
            description: "Verified response history",
            awarded_at: "2026-10-01T00:00:00Z",
          },
        ]),
        basePath: "/us/en",
        following: false,
        shopPath: "/us/en/sellers/test-maker",
      }),
    );

    expect(html).toContain('data-seller-badge="on_time_shipping"');
    expect(html).toContain('data-seller-badge="fast_responder"');
  });

  it("hides unawarded or missing trust badges", async () => {
    const html = renderToStaticMarkup(
      await SellerShopHeader({
        seller: seller([
          {
            id: "badge_shipping",
            key: "on_time_shipping",
            label: "Smooth shipping",
            description: "Not yet verified",
            awarded_at: null,
          },
        ]),
        basePath: "/us/en",
        following: false,
        shopPath: "/us/en/sellers/test-maker",
      }),
    );

    expect(html).not.toContain("smoothShipping");
    expect(html).not.toContain("speedyReplies");
  });
});
