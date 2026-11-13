import { SpreeError } from "@spree/sdk";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { SellerShopHeader } from "@/components/shops/seller-storefront/SellerShopHeader";
import { SellerShopNav } from "@/components/shops/seller-storefront/SellerShopNav";
import { SellerShopTrafficBeacon } from "@/components/shops/seller-storefront/SellerShopTrafficBeacon";
import { SellerStorefrontAbout } from "@/components/shops/seller-storefront/SellerStorefrontAbout";
import { SellerStorefrontHome } from "@/components/shops/seller-storefront/SellerStorefrontHome";
import { SellerStorefrontPolicies } from "@/components/shops/seller-storefront/SellerStorefrontPolicies";
import { SellerStorefrontReviews } from "@/components/shops/seller-storefront/SellerStorefrontReviews";
import { ThemePageRenderer } from "@/components/theme/ThemePageRenderer";
import type { SellerStorefrontPayload } from "@/lib/data/seller-storefront-types";
import {
  getSeller,
  getSellerFollowers,
  getSellerProducts,
  getSellerStorefront,
} from "@/lib/data/sellers";
import { getStoreName } from "@/lib/store";
import { themeTemplateSellerEnabled } from "@/lib/theme/flags";
import {
  getActiveTheme,
  getResolvedTemplate,
  themeGroupHasContent,
  themeTemplateHasSellerMain,
} from "@/lib/theme/resolver";
import {
  parseSellerStorefrontTab,
  sellerShopPath,
  sellerShopShellClass,
} from "@/lib/utils/seller-storefront";
import { RequestCustomOrderForm } from "./RequestCustomOrderForm";

interface SellerShopPageProps {
  params: Promise<{
    country: string;
    locale: string;
    slug: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function pickParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

async function loadStorefront(
  slug: string,
  options: { editorPreview?: boolean } = {},
): Promise<SellerStorefrontPayload> {
  try {
    return await getSellerStorefront(slug, options);
  } catch (error) {
    // Prefer a plain seller show over a hard failure when the composed
    // storefront endpoint is unavailable (404 or transient 5xx).
    const recoverable =
      error instanceof SpreeError &&
      (error.status === 404 || error.status >= 500);
    if (!recoverable) throw error;

    const seller = await getSeller(slug);
    return {
      seller,
      sections: [],
      featured_product_ids: [],
      stats: {
        reviews_count: seller.reviews_count,
        average_rating: seller.average_rating,
        followers_count: seller.followers_count,
        sales_count: 0,
      },
      following: null,
      messaging_available: null,
      featured_layout: "standard",
      banner: null,
      shop_page: null,
    };
  }
}

const LEGACY_SELLER_SLUG_ALIASES: Record<string, string> = {
  "bright-spark": "bright-sparks",
};

async function loadStorefrontWithSlugAlias(
  slug: string,
  options: { editorPreview?: boolean } = {},
): Promise<SellerStorefrontPayload> {
  const candidates = [
    slug,
    LEGACY_SELLER_SLUG_ALIASES[slug],
    slug.endsWith("s") ? undefined : `${slug}s`,
  ].filter((value, index, list): value is string => {
    return Boolean(value) && list.indexOf(value) === index;
  });

  let lastError: unknown;
  for (const candidate of candidates) {
    try {
      return await loadStorefront(candidate, options);
    } catch (error) {
      lastError = error;
      if (!(error instanceof SpreeError) || error.status !== 404) {
        throw error;
      }
    }
  }

  throw lastError;
}

export async function generateMetadata({
  params,
}: SellerShopPageProps): Promise<Metadata> {
  const { slug, country, locale } = await params;
  try {
    const { seller } = await loadStorefrontWithSlugAlias(slug);
    const description =
      seller.tagline ||
      seller.about ||
      seller.shop_announcement ||
      `Shop ${seller.name}`;
    const canonical = `/${country}/${locale}/sellers/${seller.slug}`;
    const images = seller.cover_photo_url
      ? [{ url: seller.cover_photo_url }]
      : seller.square_logo_url
        ? [{ url: seller.square_logo_url }]
        : undefined;

    return {
      title: `${seller.name} | Shop`,
      description: description.slice(0, 160),
      alternates: { canonical },
      openGraph: {
        title: seller.name,
        description: description.slice(0, 160),
        url: canonical,
        images,
        type: "website",
      },
      robots: { index: true, follow: true },
    };
  } catch {
    return { title: "Shop", robots: { index: false } };
  }
}

export default async function SellerShopPage({
  params,
  searchParams,
}: SellerShopPageProps) {
  const { country, locale, slug } = await params;
  const raw = await searchParams;
  const editorPreview = pickParam(raw.shop_editor) === "1";
  const aboutEditMode =
    editorPreview && pickParam(raw.shop_editor_about_edit) === "1";
  const basePath = `/${country}/${locale}`;
  const tab = parseSellerStorefrontTab(pickParam(raw.tab));
  const page = Math.max(
    Number.parseInt(pickParam(raw.page) ?? "1", 10) || 1,
    1,
  );
  const reviewPage = Math.max(
    Number.parseInt(pickParam(raw.review_page) ?? "1", 10) || 1,
    1,
  );
  const reviewSort = pickParam(raw.review_sort);
  const section = pickParam(raw.section);
  const query = pickParam(raw.q);
  const sort = pickParam(raw.sort);
  const minPrice = pickParam(raw.min_price);
  const maxPrice = pickParam(raw.max_price);
  const minRating = pickParam(raw.min_rating);
  const personalizable = pickParam(raw.personalizable);
  const onSale = pickParam(raw.sale);

  let payload: SellerStorefrontPayload;
  try {
    payload = await loadStorefrontWithSlugAlias(slug, {
      editorPreview,
    });
  } catch {
    notFound();
  }

  // Shop identity (about, announcement, vacation) must reflect the latest seller
  // profile write; the composed storefront payload is cached for catalog perf.
  const liveSeller = await getSeller(payload.seller.slug).catch(() => null);
  if (liveSeller) {
    payload = {
      ...payload,
      seller: {
        ...payload.seller,
        name: liveSeller.name,
        seller_since: liveSeller.seller_since,
        tagline: liveSeller.tagline,
        about: liveSeller.about,
        about_html: liveSeller.about_html,
        shop_accent_color: liveSeller.shop_accent_color,
        shop_announcement: liveSeller.shop_announcement,
        shop_announcement_html: liveSeller.shop_announcement_html,
        on_vacation: liveSeller.on_vacation,
        accepts_custom_orders: liveSeller.accepts_custom_orders,
      },
    };
  }

  const {
    seller,
    sections,
    featured_product_ids,
    following,
    messaging_available,
  } = payload;
  if (seller.slug !== slug) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(raw)) {
      for (const entry of Array.isArray(value) ? value : [value]) {
        if (entry !== undefined) query.append(key, entry);
      }
    }
    const suffix = query.size ? `?${query.toString()}` : "";
    redirect(`${basePath}/sellers/${seller.slug}${suffix}`);
  }

  const reviewsCount =
    payload.stats?.reviews_count ?? seller.reviews_count ?? 0;
  const shopSeller = {
    ...seller,
    reviews_count: reviewsCount,
    average_rating: payload.stats?.average_rating ?? seller.average_rating,
    sales_count: seller.sales_count ?? payload.stats?.sales_count ?? 0,
  };
  const shopPath = `${basePath}/sellers/${seller.slug}`;

  const [productList, followerList] = await Promise.all([
    getSellerProducts(slug, {
      sellerId: seller.id,
      page: 1,
      limit: 1,
    }).catch(() => ({ data: [], meta: { count: 0, pages: 1 } })),
    getSellerFollowers(slug, 1, 1).catch(() => null),
  ]);
  const productCount = productList.meta.count ?? 0;
  const followersCount =
    followerList?.meta.count ??
    payload.stats?.followers_count ??
    seller.followers_count ??
    0;

  const t = await getTranslations("sellers");
  const marketplaceName = getStoreName();
  const activeTheme =
    tab === "home" && themeTemplateSellerEnabled()
      ? await getActiveTheme()
      : null;
  const resolvedSellerTemplate = activeTheme
    ? await getResolvedTemplate({
        templateType: "seller",
        templateKey: "default",
        resourceType: "Spree::Seller",
        resourceId: seller.id,
      })
    : null;
  // Only use the theme path when it includes seller_main — otherwise featured
  // rails and seller_shop attribution never render.
  const sellerTemplate =
    resolvedSellerTemplate &&
    themeGroupHasContent(resolvedSellerTemplate.data) &&
    themeTemplateHasSellerMain(resolvedSellerTemplate.data)
      ? resolvedSellerTemplate
      : null;
  const customOrderHref = seller.accepts_custom_orders
    ? sellerShopPath(basePath, seller.slug, "custom-orders")
    : undefined;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: seller.name,
    description: seller.tagline || seller.about,
    image: seller.cover_photo_url || seller.logo_url,
    url: shopPath,
    ...(shopSeller.average_rating != null && reviewsCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: shopSeller.average_rating,
            reviewCount: reviewsCount,
          },
        }
      : {}),
  };

  return (
    <div className="min-h-screen bg-marketplace-background">
      <SellerShopTrafficBeacon sellerId={seller.id} path={shopPath} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SellerShopHeader
        seller={shopSeller}
        basePath={basePath}
        following={following === true}
        followersCount={followersCount}
        messagingAvailable={messaging_available !== false}
        shopPath={shopPath}
        shopBanner={payload.banner}
        editorPreview={editorPreview}
      />
      {tab !== "home" ? (
        <SellerShopNav
          slug={seller.slug}
          basePath={basePath}
          activeTab={tab}
          productCount={productCount}
          query={query}
          accentColor={seller.shop_accent_color}
        />
      ) : null}

      {tab === "home" ? (
        activeTheme && sellerTemplate ? (
          <ThemePageRenderer
            theme={activeTheme}
            template={sellerTemplate}
            context={{
              kind: "seller",
              sellerSlug: seller.slug,
              seller: payload,
              editorPreview,
              aboutEditMode,
              basePath,
              locale,
              country,
              marketplaceName,
              featuredLayout: payload.featured_layout,
              catalogPage: page,
              catalogSection: section,
              catalogQuery: query,
              catalogSort: sort,
              catalogOnSale: onSale,
              catalogMinPrice: minPrice,
              catalogMaxPrice: maxPrice,
              catalogMinRating: minRating,
              catalogPersonalizable: personalizable,
              productCount,
              followersCount,
              salesCount: seller.sales_count ?? payload.stats?.sales_count,
              reviewsCount,
              customOrderHref,
            }}
          />
        ) : (
          <SellerStorefrontHome
            slug={seller.slug}
            basePath={basePath}
            locale={locale}
            sellerId={seller.id}
            sections={sections}
            featuredIds={featured_product_ids}
            aboutHtml={seller.about_html}
            about={seller.about}
            featuredLayout={payload.featured_layout}
            productCount={productCount}
            page={page}
            reviewPage={reviewPage}
            reviewSort={reviewSort}
            reviewDistribution={seller.rating_distribution}
            section={section}
            query={query}
            sort={sort}
            onSale={onSale}
            minPrice={minPrice}
            maxPrice={maxPrice}
            minRating={minRating}
            personalizable={personalizable}
            salesCount={seller.sales_count ?? payload.stats.sales_count}
            followersCount={followersCount}
            customOrderHref={customOrderHref}
            shopPath={shopPath}
            shopAnnouncement={seller.shop_announcement}
            shopAnnouncementHtml={seller.shop_announcement_html}
            policies={seller.policies ?? []}
            marketplaceName={marketplaceName}
            seller={shopSeller}
            shopPage={payload.shop_page}
            reviewsCount={reviewsCount}
            sellable={seller.sellable}
            onVacation={seller.on_vacation}
            editorPreview={editorPreview}
          />
        )
      ) : null}

      {tab === "custom-orders" && seller.accepts_custom_orders ? (
        <div className={`${sellerShopShellClass} py-8`}>
          <div className="mx-auto max-w-4xl">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-foreground">
                {t("requestCustomOrder")}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                {t("customOrderHelp")}
              </p>
            </div>
            <RequestCustomOrderForm
              sellerId={seller.id}
              basePath={basePath}
              returnTo={sellerShopPath(basePath, seller.slug, "custom-orders")}
              initialOpen
              messagingAvailable={messaging_available !== false}
            />
          </div>
        </div>
      ) : null}

      {tab === "reviews" ? (
        <SellerStorefrontReviews
          slug={seller.slug}
          basePath={basePath}
          locale={locale}
          page={page}
          sort={sort}
          averageRating={shopSeller.average_rating}
          reviewsCount={reviewsCount}
          distribution={seller.rating_distribution}
        />
      ) : null}

      {tab === "about" ? (
        <>
          <SellerStorefrontAbout
            shopName={seller.name}
            marketplaceName={marketplaceName}
            tagline={seller.tagline}
            aboutHtml={seller.about_html}
            about={seller.about}
            salesCount={seller.sales_count ?? payload.stats.sales_count}
            accentColor={seller.shop_accent_color}
            sellerSince={seller.seller_since}
            shopPage={payload.shop_page}
            editorPreview={editorPreview}
          />
          <SellerStorefrontPolicies
            policies={seller.policies ?? []}
            marketplaceName={marketplaceName}
            seller={seller}
            editorPreview={editorPreview}
          />
        </>
      ) : null}

      {tab === "policies" ? (
        <SellerStorefrontPolicies
          policies={seller.policies ?? []}
          marketplaceName={marketplaceName}
          seller={seller}
        />
      ) : null}
    </div>
  );
}
