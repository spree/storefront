import type { ThemeTemplateDocument } from "@spree/sdk";

const media = "/marketplace/";

export function editorialHomeDocument(basePath: string): ThemeTemplateDocument {
  const sections = {
    editorial_campaign: {
      type: "hero",
      settings: {
        editorial_presentation: true,
        eyebrow: "The Oddkeeps marketplace",
        heading: "Good gifts have a story.",
        subheading:
          "Discover thoughtful gifts and everyday favorites from independent makers.",
        image_url: `${media}artisan-home-hero-v2.png`,
        button_text: "Find a gift",
        button_link: `${basePath}/products?q=gift`,
        background_color: "palette",
        padding_top: 32,
        padding_bottom: 32,
      },
    },
    editorial_categories: {
      type: "category_tiles",
      settings: {
        editorial_presentation: true,
        heading: "Explore the marketplace",
        source: "all",
        limit: 6,
        columns_desktop: 6,
        columns_tablet: 3,
        columns_mobile: 2,
        grid_gap: 20,
        grid_gap_mobile: 14,
        image_ratio: "square",
        image_zoom_on_hover: true,
        padding_top: 40,
        padding_bottom: 56,
        padding_top_mobile: 40,
        padding_bottom_mobile: 42,
      },
    },
    editorial_products: {
      type: "product_rail",
      settings: {
        editorial_presentation: true,
        heading: "The handmade edit",
        subheading: "New and noteworthy from the marketplace",
        source: "all",
        strategy: "newest",
        layout: "grid",
        columns: 4,
        gap: 20,
        limit: 8,
        padding_top: 56,
        padding_bottom: 56,
        background_color: "#f8f5ef",
      },
    },
    editorial_collections: {
      type: "collection_tiles",
      settings: {
        editorial_presentation: true,
        heading: "The curated collections",
        source: "placement",
        layout: "below",
        limit: 3,
        columns_desktop: 3,
        columns_tablet: 3,
        columns_mobile: 1,
        grid_gap: 24,
        grid_gap_mobile: 20,
        image_ratio: "landscape",
        image_zoom_on_hover: true,
        padding_top: 64,
        padding_bottom: 64,
        padding_top_mobile: 42,
        padding_bottom_mobile: 42,
      },
    },
    editorial_gifts: {
      type: "editorial",
      settings: {
        editorial_presentation: true,
        eyebrow: "The gifting edit",
        heading: "Make it personal.",
        body: "Find keepsakes for the big days, small milestones and everyone worth celebrating.",
        image_url: `${media}thoughtful-gift.png`,
        image_position: "right",
        button_text: "Explore personalized gifts",
        button_link: `${basePath}/products?q=personalized`,
        background_color: "palette",
        padding_top: 32,
        padding_bottom: 32,
      },
    },
    editorial_story: {
      type: "editorial",
      settings: {
        editorial_presentation: true,
        eyebrow: "Behind the work",
        heading: "Meet the people who make it.",
        body: "There’s a person behind every piece. Get to know the independent shops bringing their ideas to life, one handmade thing at a time.",
        image_url: `${media}maker-story.png`,
        image_position: "left",
        button_text: "Discover independent shops",
        button_link: `${basePath}/shops`,
        background_color: "#e4e8dd",
        padding_top: 24,
        padding_bottom: 24,
        gap: 0,
      },
    },
    editorial_shops: {
      type: "shop_rail",
      settings: {
        editorial_presentation: true,
        heading: "Explore original items from local shops",
        source: "highest_rated",
        limit: 3,
        columns_desktop: 3,
        columns_tablet: 2,
        columns_mobile: 1,
        show_arrows_mobile: true,
        padding_top: 40,
        padding_bottom: 40,
      },
    },
    editorial_difference: {
      type: "text_with_icons",
      settings: {
        editorial_presentation: true,
        heading: "Shop with confidence",
        alignment: "center",
        columns: 3,
        padding_top: 56,
        padding_bottom: 56,
        background_color: "#f8f5ef",
        items:
          "Made by real shops|Every listing comes from an independent seller with a story behind the work.\n" +
          "Materials you can trust|Thoughtful products with clear maker details, reviews, and shop policies.\n" +
          "Personal, when you need it|Send a message or request a custom order directly from the maker.",
      },
    },
  };

  return { sections, order: Object.keys(sections) };
}
