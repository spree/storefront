import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl/server", () => ({
  getTranslations:
    async () =>
    (key: string, values?: { name?: string; marketplace?: string }) =>
      key === "aboutShopHeading"
        ? `About ${values?.name}`
        : key === "aboutOnMarketplaceLabel"
          ? `On ${values?.marketplace} since`
          : key,
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

import { SellerStorefrontAbout } from "./SellerStorefrontAbout";

describe("SellerStorefrontAbout", () => {
  it("shows editable empty sections in the shop editor preview", async () => {
    const html = renderToStaticMarkup(
      await SellerStorefrontAbout({
        shopName: "Test shop",
        marketplaceName: "Spree",
        editorPreview: true,
        shopPage: {
          story_headline: null,
          video_url: null,
          video_captions_url: null,
          photos: [],
          links: [],
          member_bios: [],
          faqs: [],
          seller_details_public: false,
          seller_details: {},
        },
      }),
    );

    expect(html).toContain("data-shop-inline-editor");
    expect(html).toContain("addHeadline");
    expect(html).toContain("mediaTitle");
    expect(html).toContain("shopLinksTitle");
    expect(html).toContain("membersTitle");
    expect(html).toContain("faqsTitle");
    expect(html).toContain("sellerDetailsTitle");
  });

  it("keeps empty optional sections hidden from public shop pages", async () => {
    const html = renderToStaticMarkup(
      await SellerStorefrontAbout({
        shopName: "Test shop",
        marketplaceName: "Spree",
        shopPage: {
          story_headline: null,
          video_url: null,
          video_captions_url: null,
          photos: [],
          links: [],
          member_bios: [],
          faqs: [],
          seller_details_public: false,
          seller_details: {},
        },
      }),
    );

    expect(html).not.toContain("Shop photos and video");
    expect(html).not.toContain("Shop members");
    expect(html).not.toContain("Frequently asked questions");
    expect(html).not.toContain("Seller details");
  });

  it("shows shop member portraits and roles when the seller provides them", async () => {
    const html = renderToStaticMarkup(
      await SellerStorefrontAbout({
        shopName: "Test shop",
        marketplaceName: "Spree",
        shopPage: {
          story_headline: null,
          video_url: null,
          video_captions_url: null,
          photos: [],
          links: [],
          member_bios: [
            {
              name: "Jamie",
              role: "Maker",
              bio: "Made by hand.",
              photo_url: "https://cdn.example/jamie.jpg",
            },
          ],
          faqs: [],
          seller_details_public: false,
          seller_details: {},
        },
      }),
    );

    expect(html).toContain('src="https://cdn.example/jamie.jpg"');
    expect(html).toContain("Maker");
    expect(html).toContain("Made by hand.");
  });

  it("uses a readable accent text color for the shop tagline on dark accents", async () => {
    const html = renderToStaticMarkup(
      await SellerStorefrontAbout({
        shopName: "Test shop",
        marketplaceName: "Spree",
        tagline: "Welcome to our shop.",
        accentColor: "#661a35",
        shopPage: {
          story_headline: null,
          video_url: null,
          video_captions_url: null,
          photos: [],
          links: [],
          member_bios: [],
          faqs: [],
          seller_details_public: false,
          seller_details: {},
        },
      }),
    );

    expect(html).toContain("--marketplace-seller-accent-text:#ffffff");
    expect(html).toContain('data-seller-accent-story-tagline="true"');
    expect(html).toMatch(/style="color:#ffffff"[^>]*>Welcome to our shop\./);
    expect(html).toContain("Welcome to our shop.");
  });

  it("puts the shop video and photos into one buyer-facing carousel", async () => {
    const html = renderToStaticMarkup(
      await SellerStorefrontAbout({
        shopName: "Test shop",
        marketplaceName: "Spree",
        shopPage: {
          story_headline: null,
          video_url: "https://cdn.example/shop.mp4",
          video_caption: "A look inside our workshop.",
          video_captions_url: "https://cdn.example/shop.vtt",
          photos: [
            {
              id: 1,
              url: "https://cdn.example/photo-1.jpg",
              caption: "Handmade detail.",
            },
            {
              id: 2,
              url: "https://cdn.example/photo-2.jpg",
              caption: "Packed with care.",
            },
          ],
          links: [],
          member_bios: [],
          faqs: [],
          seller_details_public: false,
          seller_details: {},
        },
      }),
    );

    expect(html).toContain('data-shop-story-carousel="true"');
    expect(html).toContain('src="https://cdn.example/shop.mp4"');
    expect(html).toContain('src="https://cdn.example/shop.vtt"');
    expect(html).toContain("A look inside our workshop.");
    expect(html).toContain('aria-label="Next shop photo or video"');
    expect(html).toContain('aria-label="Previous shop photo or video"');
    expect(html).not.toContain('src="https://cdn.example/photo-1.jpg"');
  });
});
