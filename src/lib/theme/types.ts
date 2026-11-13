import type {
  CmsTheme,
  Collection,
  Product,
  StoreMerchandisingPlacement,
  ThemeTemplateDocument,
  ThemeTemplatePayload,
} from "@spree/sdk";
import type { CmsPage } from "@/components/cms/types";
import type { SellerStorefrontPayload } from "@/lib/data/seller-storefront-types";
import type { HomePersonalizationComposition } from "@/lib/data/storefront-personalization-types";
import type { CartDiscoveryInput } from "@/lib/discovery-context";
import type { MadeTogetherPresentation } from "@/lib/made-together/types";

export type ThemeRenderContext =
  | HomeThemeContext
  | ProductThemeContext
  | CategoryThemeContext
  | CollectionThemeContext
  | SellerThemeContext
  | PageThemeContext;

export type BaseThemeContext = {
  basePath: string;
  locale: string;
  country: string;
  currency?: string;
};

export type HomeThemeContext = BaseThemeContext & {
  kind: "home";
  placements?: StoreMerchandisingPlacement[];
  homeComposition?: HomePersonalizationComposition;
  compositionVersion?: string;
};

export type ProductThemeContext = BaseThemeContext & {
  kind: "product";
  product: Product;
  reviewSort?: "newest" | "highest" | "lowest" | "most_helpful";
  reviewFilters?: {
    rating?: number;
    withMedia?: boolean;
    keyword?: string;
    page?: number;
  };
  categoryId?: string;
  cartDiscovery?: CartDiscoveryInput;
  madeTogether?: MadeTogetherPresentation | null;
};

export type CategoryThemeContext = BaseThemeContext & {
  kind: "category";
  categoryId: string;
  categoryName?: string;
  categorySlug?: string;
  listingSearchParams?: ListingSearchParams;
};

export type ListingSearchParams = Record<string, string | string[] | undefined>;

export type CollectionThemeContext = BaseThemeContext & {
  kind: "collection";
  collectionId: string;
  collectionName?: string;
  collectionSlug?: string;
  collection?: Collection;
  listingSearchParams?: ListingSearchParams;
};

export type SellerThemeContext = BaseThemeContext & {
  kind: "seller";
  sellerSlug: string;
  seller: SellerStorefrontPayload;
  editorPreview?: boolean;
  aboutEditMode?: boolean;
  marketplaceName?: string;
  featuredLayout?: SellerStorefrontPayload["featured_layout"];
  catalogPage?: number;
  catalogSection?: string;
  catalogQuery?: string;
  catalogSort?: string;
  catalogOnSale?: string;
  catalogMinPrice?: string;
  catalogMaxPrice?: string;
  catalogMinRating?: string;
  catalogPersonalizable?: string;
  productCount?: number;
  followersCount?: number;
  salesCount?: number | null;
  reviewsCount?: number;
  customOrderHref?: string;
};

export type PageThemeContext = BaseThemeContext & {
  kind: "page";
  pageId: string;
  pageSlug: string;
  pageName?: string;
  page: CmsPage;
};

export type ThemeRuntimeState = {
  theme: CmsTheme;
  template: ThemeTemplatePayload;
};

export type ThemeSectionInstance = {
  section_id: string;
  section_type: string;
  settings: Record<string, unknown>;
  blocks: Record<string, ThemeBlockInstance>;
  block_order: string[];
  disabled?: boolean;
};

export type ThemeBlockInstance = {
  type: string;
  disabled?: boolean;
  parent_id?: string;
  settings: Record<string, unknown>;
};

export type { ThemeTemplateDocument };
