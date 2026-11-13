import type { Product } from "@spree/sdk";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PRODUCT_PAGE_EXPAND } from "@/lib/data/cached";
import { ProductDetails } from "./ProductDetails";

const { addItem, routerPush, authState } = vi.hoisted(() => ({
  addItem: vi.fn(),
  routerPush: vi.fn(),
  authState: { isAuthenticated: true },
}));

vi.mock("next-intl", () => ({
  useLocale: () => "en-US",
  useTranslations: () => {
    const t = (key: string) => key;
    t.rich = (key: string) => key;
    return t;
  },
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/us/en/products/test-product",
  useRouter: () => ({ push: routerPush }),
}));

vi.mock("@/components/products/MediaGallery", () => ({
  MediaGallery: ({ overlayTopLeft }: { overlayTopLeft?: React.ReactNode }) => (
    <div data-testid="media-gallery">
      {overlayTopLeft ? (
        <div className="md:hidden">{overlayTopLeft}</div>
      ) : null}
    </div>
  ),
}));
vi.mock("@/components/products/useProductStickyPurchaseBar", () => ({
  useProductStickyPurchaseBar: () => ({
    purchaseRef: { current: null },
    showSticky: false,
  }),
}));
vi.mock("@/components/products/ProductMobileStickyPurchaseBar", () => ({
  ProductMobileStickyPurchaseBar: () => null,
}));

vi.mock("@/components/products/FavoriteButton", () => ({
  FavoriteButton: () => null,
}));

vi.mock("@/components/layout/RegionPreferences", () => ({
  RegionPreferences: () => null,
}));

vi.mock("@/components/products/ProductCustomFields", () => ({
  ProductCustomFields: () => null,
}));

vi.mock("@/components/cart/QuantityPickerField", () => ({
  QuantityPickerField: ({
    quantity,
    onQuantityChange,
  }: {
    quantity: number;
    onQuantityChange: (value: number) => void;
  }) => (
    <select
      aria-label="quantity"
      data-testid="quantity-picker"
      value={quantity}
      onChange={(event) => onQuantityChange(Number(event.target.value))}
    >
      <option value={1}>1</option>
      <option value={2}>2</option>
    </select>
  ),
}));

vi.mock("@/components/products/ProductShippingCost", () => ({
  ProductShippingCost: () => null,
}));
vi.mock("@/lib/data/made-together", () => ({
  loadMadeTogetherPresentation: vi.fn(async () => null),
}));

vi.mock("@/contexts/CartContext", () => ({
  useCart: () => ({ addItem, updating: false, isOpen: false }),
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState,
}));

vi.mock("@/contexts/HiddenPricingContext", () => ({
  useHiddenPricing: () => null,
}));

vi.mock("@/contexts/StoreContext", () => ({
  useStore: () => ({ currency: "USD" }),
}));

vi.mock("@/lib/analytics/gtm", () => ({
  trackAddToCart: vi.fn(),
  trackViewItem: vi.fn(),
}));

const productWithoutCustomVariants = {
  id: "product-1",
  name: "Single Variant Product",
  slug: "single-variant-product",
  default_variant_id: "variant-master",
  default_variant: {
    id: "variant-master",
    product_id: "product-1",
    sku: "MASTER-SKU-001",
    options_text: "",
    purchasable: true,
    in_stock: true,
    price: {
      display_amount: "$25.00",
      amount_in_cents: 2500,
      compare_at_amount_in_cents: null,
      display_compare_at_amount: null,
    },
    original_price: null,
  },
  variants: [],
  option_types: [],
  media: [],
  purchasable: true,
  in_stock: true,
  price: {
    display_amount: "$25.00",
    amount_in_cents: 2500,
    compare_at_amount_in_cents: null,
    display_compare_at_amount: null,
  },
  original_price: null,
  description_html: null,
  custom_fields: [],
  reviews_count: 0,
  average_rating: null,
} as unknown as Product;

const productWithPersonalization = {
  ...productWithoutCustomVariants,
  personalization_fields: [
    {
      id: "engraving",
      name: "Name to engrave",
      field_type: "short_text",
      required: true,
      position: 1,
      conditions: [],
    },
  ],
} as unknown as Product;

const productWithOptionalFile = {
  ...productWithoutCustomVariants,
  personalization_fields: [
    {
      id: "photo",
      name: "Photo(s)",
      field_type: "file",
      required: false,
      position: 1,
      instructions: null,
      configuration: {},
      choices: [],
    },
  ],
} as unknown as Product;

const productWithBlockedMessaging = {
  ...productWithoutCustomVariants,
  seller: {
    id: "seller_1",
    name: "Dev Seller 01",
    slug: "dev-seller-01",
    reviews_count: 2,
    average_rating: 4.8,
    sales_count: 10,
    badges: [],
  },
  messaging_available: false,
} as unknown as Product;

describe("ProductDetails", () => {
  it("adds the selected quantity to the cart", async () => {
    const user = userEvent.setup();
    addItem.mockClear();
    addItem.mockResolvedValue({ success: true, cart: { id: "cart-123" } });
    render(
      <ProductDetails
        product={productWithoutCustomVariants}
        basePath="/us/en"
      />,
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "quantity" }),
      "2",
    );
    await user.click(screen.getByRole("button", { name: "addToCart" }));
    expect(addItem).toHaveBeenCalledWith(
      "variant-master",
      2,
      undefined,
      undefined,
    );
  });
  it("requests the default variant for the product page", () => {
    expect(PRODUCT_PAGE_EXPAND).toContain("default_variant");
  });

  it("does not show ask-about in the purchase column", () => {
    render(
      <ProductDetails
        product={productWithBlockedMessaging}
        basePath="/us/en"
      />,
    );

    expect(
      screen.queryByRole("button", { name: "askAboutItem" }),
    ).not.toBeInTheDocument();
  });

  it("uses the seller display name for the avatar fallback", () => {
    const product = {
      ...productWithBlockedMessaging,
      seller: {
        ...productWithBlockedMessaging.seller!,
        name: "[dev-dataset] Merch Seller A",
      },
    } as Product;
    render(<ProductDetails product={product} basePath="/us/en" />);

    const sellerLinks = screen.getAllByRole("link", { name: "Merch Seller A" });
    expect(
      sellerLinks.some(
        (link) => link.getAttribute("href") === "/us/en/sellers/dev-seller-01",
      ),
    ).toBe(true);
    expect(screen.getByText("M")).toBeInTheDocument();
  });

  it("shows the master SKU when a product has no custom variants", () => {
    render(
      <ProductDetails
        product={productWithoutCustomVariants}
        basePath="/us/en"
      />,
    );

    expect(screen.getByText("sku")).toBeInTheDocument();
    expect(screen.getByText("MASTER-SKU-001")).toBeInTheDocument();
  });

  it("keeps private custom listings at the server-enforced quantity of one", () => {
    render(
      <ProductDetails
        product={productWithoutCustomVariants}
        basePath="/us/en"
        fixedQuantity
      />,
    );

    expect(screen.queryByTestId("quantity-picker")).not.toBeInTheDocument();
  });

  it("keeps optional personalization collapsed until the buyer expands it", async () => {
    const user = userEvent.setup();
    render(
      <ProductDetails
        product={{
          ...productWithPersonalization,
          personalization_fields:
            productWithPersonalization.personalization_fields!.map((field) => ({
              ...field,
              required: false,
            })),
        }}
        basePath="/us/en"
      />,
    );

    expect(screen.queryByLabelText(/Name to engrave/)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "addPersonalizationOptionalLabel" }),
    ).toBeVisible();

    await user.click(
      screen.getByRole("button", { name: "addPersonalizationOptionalLabel" }),
    );

    expect(screen.getByLabelText(/Name to engrave/)).toBeVisible();
  });

  it("opens a single optional photo upload in the compact product form", async () => {
    const user = userEvent.setup();
    render(
      <ProductDetails product={productWithOptionalFile} basePath="/us/en" />,
    );

    await user.click(
      screen.getByRole("button", { name: "addPersonalizationOptionalLabel" }),
    );
    expect(screen.getByText("uploadFile")).toBeVisible();
    expect(screen.getByText("uploadFileHelp")).toBeVisible();
  });

  it("adds the configured item and routes Buy now to checkout", async () => {
    const user = userEvent.setup();
    addItem.mockResolvedValue({ success: true, cart: { id: "cart-123" } });
    render(
      <ProductDetails
        product={productWithoutCustomVariants}
        basePath="/us/en"
      />,
    );

    await user.click(screen.getByRole("button", { name: "buyItNow" }));

    expect(addItem).toHaveBeenCalledWith(
      "variant-master",
      1,
      undefined,
      undefined,
    );
    expect(routerPush).toHaveBeenCalledWith("/us/en/checkout/cart-123");
  });

  it("provides a personalization fallback when the theme template omits the block", () => {
    render(
      <ProductDetails
        product={productWithPersonalization}
        basePath="/us/en"
        templateBlocks={[<h1 key="title">Configured title</h1>]}
      />,
    );

    expect(screen.getByLabelText(/Name to engrave/)).toBeVisible();
  });

  it("does not duplicate a personalization block configured by the theme", () => {
    render(
      <ProductDetails
        product={productWithPersonalization}
        basePath="/us/en"
        templateBlocks={[<h1 key="title">Configured title</h1>]}
        templatePersonalizationBlockPresent
      />,
    );

    expect(screen.queryByLabelText(/Name to engrave/)).not.toBeInTheDocument();
  });

  it("does not duplicate merchandising badges within the same PDP cluster", () => {
    const product = {
      ...productWithoutCustomVariants,
      merchandising_signals: [
        {
          key: "new",
          label: "New",
          priority: 40,
          source: "listing",
          presentation: "marketplace_badge",
        },
        {
          key: "bestseller",
          label: "Bestseller",
          priority: 80,
          source: "commerce",
          presentation: "marketplace_badge",
        },
      ],
    } as unknown as Product;

    render(<ProductDetails product={product} basePath="/us/en" />);

    const gallery = screen.getByTestId("media-gallery");
    expect(within(gallery).getByText("Bestseller")).toBeVisible();
    expect(screen.queryByText("New")).not.toBeInTheDocument();
  });

  it("shows only one title-zone marketplace badge and hides the sale badge when the discount line is visible", () => {
    const salePrice = {
      amount_in_cents: 4200,
      compare_at_amount_in_cents: 8400,
      display_amount: "$42.00",
      display_compare_at_amount: "$84.00",
      currency: "USD",
    };
    const product = {
      ...productWithoutCustomVariants,
      price: salePrice,
      default_variant: {
        ...productWithoutCustomVariants.default_variant,
        price: salePrice,
      },
      merchandising_signals: [
        {
          key: "popular_now",
          label: "Popular now",
          priority: 70,
          source: "engagement_24h",
          presentation: "marketplace_badge",
        },
        {
          key: "new",
          label: "New",
          priority: 40,
          source: "listing",
          presentation: "marketplace_badge",
        },
        {
          key: "sale",
          label: "50% off",
          priority: 100,
          source: "promotion",
          presentation: "commerce_badge",
        },
        {
          key: "low_stock",
          label: "Only 3 left",
          priority: 90,
          source: "inventory",
          presentation: "availability_badge",
        },
      ],
    } as unknown as Product;

    render(<ProductDetails product={product} basePath="/us/en" />);

    const gallery = screen.getByTestId("media-gallery");
    expect(within(gallery).getByText("Popular now")).toBeVisible();
    expect(screen.queryByText("New")).not.toBeInTheDocument();
    expect(screen.getByText("limitedTimeSale")).toBeVisible();
    expect(
      document.querySelectorAll('[data-merchandising-pdp-signal="sale"]'),
    ).toHaveLength(1);
    expect(
      document.querySelector('p[data-merchandising-pdp-signal="low_stock"]'),
    ).toHaveTextContent("Only 3 left");
  });

  it("places the product badge before the product title", () => {
    const product = {
      ...productWithoutCustomVariants,
      merchandising_signals: [
        {
          key: "popular_now",
          label: "Popular now",
          priority: 70,
          source: "engagement_24h",
          presentation: "marketplace_badge",
        },
      ],
    } as unknown as Product;

    render(<ProductDetails product={product} basePath="/us/en" />);

    const gallery = screen.getByTestId("media-gallery");
    const badge = gallery.querySelector(
      '[data-merchandising-pdp-signal="popular_now"]',
    );
    const title = screen.getByRole("heading", {
      name: "Single Variant Product",
    });
    expect(
      badge!.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("uses product-page wording for followed-shop reasons only for signed-in buyers", () => {
    const product = {
      ...productWithoutCustomVariants,
      merchandising_signals: [
        {
          key: "new_from_followed_shop",
          label: "New from a shop you follow",
          priority: 65,
          source: "buyer_interest",
          presentation: "relevance_reason",
        },
      ],
    } as unknown as Product;

    authState.isAuthenticated = true;
    const signedIn = render(
      <ProductDetails product={product} basePath="/us/en" />,
    );
    expect(screen.getByText("youFollowThisShop")).toBeVisible();
    expect(
      screen.queryByText("New from a shop you follow"),
    ).not.toBeInTheDocument();

    signedIn.unmount();
    authState.isAuthenticated = false;
    render(<ProductDetails product={product} basePath="/us/en" />);
    expect(screen.getByText("New from a shop you follow")).toBeVisible();
    authState.isAuthenticated = true;
  });

  it("uses the configured product block order instead of the built-in detail column", () => {
    const product = {
      ...productWithoutCustomVariants,
      seller: { name: "Maker Shop", slug: "maker-shop" },
      description_html: "<p>Made by hand.</p>",
    } as Product;
    render(
      <ProductDetails
        product={product}
        basePath="/us/en"
        templateBlocks={[
          <p key="price" data-testid="configured-price">
            Configured price
          </p>,
          <h1 key="title">Configured title</h1>,
        ]}
        templateDescriptionBlockPresent
        templateMediaSettings={{ aspect_ratio: "square" }}
      />,
    );

    const content = screen.getByTestId("configured-price").parentElement;
    expect(content).toHaveAttribute("data-theme-product-block-layout");
    expect(content?.textContent?.indexOf("Configured price")).toBeLessThan(
      content?.textContent?.indexOf("Configured title") ?? -1,
    );
    expect(
      screen.getByRole("heading", { name: "Configured title" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "Single Variant Product" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Maker Shop/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Made by hand.")).not.toBeInTheDocument();
  });

  it("does not duplicate description when description tabs are configured as a block", () => {
    const product = {
      ...productWithoutCustomVariants,
      description_html: "<p>Made by hand.</p>",
    } as Product;
    render(
      <ProductDetails
        product={product}
        basePath="/us/en"
        templateBlocks={[
          <div key="description-tabs">Configured description tabs</div>,
        ]}
        templateDescriptionBlockPresent
      />,
    );
    expect(screen.getByText("Configured description tabs")).toBeVisible();
    expect(screen.queryByText("Made by hand.")).not.toBeInTheDocument();
  });

  it("renders previous and next products when product navigation is enabled", () => {
    render(
      <ProductDetails
        product={productWithoutCustomVariants}
        basePath="/us/en"
        appearance={{ product_navigation: true }}
        productNavigation={{
          previous: { name: "Earlier item", slug: "earlier-item" },
          next: { name: "Later item", slug: "later-item" },
        }}
      />,
    );

    expect(
      screen.getByRole("navigation", { name: "Product navigation" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Earlier item/ })).toHaveAttribute(
      "href",
      "/us/en/products/earlier-item",
    );
    expect(screen.getByRole("link", { name: /Later item/ })).toHaveAttribute(
      "href",
      "/us/en/products/later-item",
    );
  });

  it("honors serialized false values for product page controls", () => {
    const product = {
      ...productWithoutCustomVariants,
      seller: { name: "Maker Shop", slug: "maker-shop", reviews_count: 0 },
      reviews_count: 5,
      average_rating: 4.8,
    } as Product;

    render(
      <ProductDetails
        product={product}
        basePath="/us/en"
        appearance={{ show_vendor: "false" }}
        globalSettings={{ show_reviews: "false" }}
      />,
    );

    expect(screen.queryByText("bySeller")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /reviewCount/ }),
    ).not.toBeInTheDocument();
  });

  it("renders the classic buy column with title, price, and add to cart", () => {
    render(
      <ProductDetails
        product={productWithoutCustomVariants}
        basePath="/us/en"
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Single Variant Product" }),
    ).toBeVisible();
    expect(screen.getByText("$25.00")).toBeVisible();
    expect(screen.getByRole("button", { name: "addToCart" })).toBeVisible();
    expect(screen.getByRole("button", { name: "addToCart" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "buyItNow" })).toBeVisible();
    expect(screen.getAllByText("deliveryBody")[0]).toBeVisible();
  });

  it("keeps add to cart inactive in the server markup until the client can handle the click", () => {
    const html = renderToString(
      <ProductDetails
        product={productWithoutCustomVariants}
        basePath="/us/en"
      />,
    );
    const addToCart = html.match(
      /<button\b(?=[^>]*\bdisabled\b)[^>]*>[\s\S]*?addToCart[\s\S]*?<\/button>/,
    );

    expect(addToCart).not.toBeNull();
  });

  it("does not show a custom-order action on the product page", () => {
    render(
      <ProductDetails
        product={
          {
            ...productWithoutCustomVariants,
            seller_id: "sel_1",
            custom_order_seller_note: "Made to order by hand.",
            custom_order_processing_weeks_min: 2,
            custom_order_processing_weeks_max: 3,
            seller: {
              id: "sel_1",
              name: "Maker Shop",
              accepts_custom_orders: true,
            },
          } as Product
        }
        basePath="/us/en"
      />,
    );

    expect(screen.queryByText("requestCustomVersion")).not.toBeInTheDocument();
    expect(screen.getByText("Made to order by hand.")).toBeVisible();
    expect(screen.getByText("processingTime")).toBeVisible();
  });

  it("shows a configured estimated delivery range", () => {
    render(
      <ProductDetails
        product={{
          ...productWithoutCustomVariants,
          estimated_delivery_date_min: "2026-10-09",
          estimated_delivery_date_max: "2026-10-15",
        }}
        basePath="/us/en"
      />,
    );

    expect(screen.getAllByText("orderTodayGetBy").length).toBeGreaterThan(0);
    expect(screen.queryByText("deliveryBody")).not.toBeInTheDocument();
  });
});
