import type { Policy, Seller } from "@spree/sdk";

export type SellerShopSection = {
  id: string;
  name: string;
  slug: string;
  position: number;
  active: boolean;
  products_count?: number;
};

export type SellerShopBannerSlide = {
  id: string;
  image_url: string | null;
  link_type: "none" | "product" | "shop_section";
  link_product_id: string | null;
  link_shop_section_id: string | null;
  link_label: string | null;
  link_href: string | null;
  focal_point_x: number;
  focal_point_y: number;
  position: number;
};

export type SellerShopBannerPayload = {
  id: string | null;
  layout:
    | "none"
    | "single_mini"
    | "single_standard"
    | "carousel"
    | "collage"
    | "collage_2"
    | "collage_3"
    | "collage_4";
  slides: SellerShopBannerSlide[];
  advanced_customization_allowed?: boolean;
  displayable?: boolean;
};

export type SellerShopPagePayload = {
  story_headline: string | null;
  links: Array<{ label: string; url: string }>;
  member_bios: Array<{
    name: string;
    role?: string;
    bio: string;
    photo_url?: string | null;
  }>;
  faqs: Array<{ question: string; answer: string }>;
  photos: Array<{ id: number; url: string; caption: string }>;
  video_url: string | null;
  video_caption?: string | null;
  video_captions_url: string | null;
  seller_details_public: boolean;
  seller_details: Record<string, string>;
};

export type SellerStorefrontPayload = {
  seller: Seller & {
    policies?: Policy[];
    rating_distribution?: Record<string, number> | null;
    tagline?: string | null;
    on_vacation?: boolean;
    sellable?: boolean;
    sales_count?: number;
  };
  sections: SellerShopSection[];
  featured_product_ids: string[];
  featured_layout: "standard" | "mixed_grid" | "none";
  banner: SellerShopBannerPayload | null;
  shop_page: SellerShopPagePayload | null;
  stats: {
    reviews_count: number;
    average_rating: number | null;
    followers_count: number;
    sales_count: number;
  };
  following: boolean | null;
  messaging_available: boolean | null;
};

export type SellerStorefrontTab =
  | "home"
  | "reviews"
  | "about"
  | "policies"
  | "custom-orders";
