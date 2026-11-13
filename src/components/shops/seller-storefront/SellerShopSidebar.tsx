import {
  WandSparkles as CustomOrder,
  ShoppingBag as Sales,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { ReportShopButton } from "@/components/shops/ReportShopButton";
import { ShopFollowersButton } from "@/components/shops/ShopFollowersButton";
import type { SellerShopSection } from "@/lib/data/seller-storefront-types";
import {
  sellerShopCatalogPath,
  sellerShopPath,
} from "@/lib/utils/seller-storefront";
import { SellerShopStat } from "./SellerShopStat";

interface SellerShopSidebarProps {
  slug: string;
  basePath: string;
  sections: SellerShopSection[];
  activeSection?: string;
  totalItemCount: number;
  salesCount?: number;
  followersCount?: number;
  customOrderHref?: string;
  shopPath: string;
  sellerId: string;
  sellerSlug: string;
  marketplaceName: string;
}

export async function SellerShopSidebar({
  slug,
  basePath,
  sections,
  activeSection,
  totalItemCount,
  salesCount = 0,
  followersCount = 0,
  customOrderHref,
  shopPath,
  sellerId,
  sellerSlug,
  marketplaceName,
}: SellerShopSidebarProps) {
  const t = await getTranslations("sellers");
  const productsPath = sellerShopCatalogPath(basePath, slug);

  const linkClass = (active: boolean) =>
    `flex min-h-8 items-center justify-between gap-2 border-l-2 py-1 pl-2.5 text-[13px] transition-colors ${
      active
        ? "border-[#222] font-semibold text-[#222]"
        : "border-transparent text-[#595959] hover:border-[#b9aaa1] hover:text-[#222]"
    }`;

  const categoryLinks = (
    <ul className="space-y-0.5">
      <li>
        <a
          href={productsPath}
          className={linkClass(!activeSection)}
          aria-current={!activeSection ? "page" : undefined}
        >
          <span>{t("allSections")}</span>
          <span className="tabular-nums text-[#757575]">
            {totalItemCount.toLocaleString()}
          </span>
        </a>
      </li>
      <li>
        <a
          href={sellerShopCatalogPath(basePath, slug, { sale: "1" })}
          className={linkClass(false)}
        >
          <span>{t("onSaleTitle")}</span>
        </a>
      </li>
      <li>
        <a
          href={sellerShopCatalogPath(basePath, slug, { sort: "best_selling" })}
          className={linkClass(false)}
        >
          <span>{t("bestSellersTitle")}</span>
        </a>
      </li>
      <li>
        <a
          href={sellerShopCatalogPath(basePath, slug, { personalizable: "1" })}
          className={linkClass(false)}
        >
          <span>{t("personalizedTitle")}</span>
        </a>
      </li>
      {sections.map((item) => {
        const href = sellerShopCatalogPath(basePath, slug, {
          section: item.slug,
        });
        const active = activeSection === item.slug;
        return (
          <li key={item.id}>
            <a
              href={href}
              className={linkClass(active)}
              aria-current={active ? "page" : undefined}
            >
              <span className="min-w-0 truncate pr-2">{item.name}</span>
              {item.products_count != null ? (
                <span className="shrink-0 tabular-nums text-[#757575]">
                  {item.products_count.toLocaleString()}
                </span>
              ) : null}
            </a>
          </li>
        );
      })}
    </ul>
  );

  return (
    <aside className="border-b border-[#e8e3df] pb-6 md:sticky md:top-4 md:self-start md:border-b-0 md:border-r md:pr-6">
      <nav aria-label={t("shopCategoriesLabel")} className="mb-4">
        <details className="group md:hidden">
          <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between border-y border-[#e8e3df] py-2 text-sm font-semibold text-[#222] [&::-webkit-details-marker]:hidden">
            {t("shopCategoriesLabel")}
            <span aria-hidden className="text-[#757575] group-open:rotate-180">
              ⌄
            </span>
          </summary>
          <div className="max-h-64 overflow-y-auto py-2">{categoryLinks}</div>
        </details>
        <div className="hidden md:block">
          <h2 className="mb-2 font-sans text-xs font-semibold uppercase tracking-wide text-[#757575]">
            {t("shopCategoriesLabel")}
          </h2>
          {categoryLinks}
        </div>
      </nav>

      {customOrderHref ? (
        <div className="hidden border-t border-[#e8e3df] pt-4 md:block">
          <a
            href={customOrderHref}
            className="flex min-h-9 w-full min-w-0 items-center justify-center gap-1.5 overflow-hidden rounded-md border border-[#222] bg-white px-2.5 py-2 text-center text-xs font-medium leading-tight text-[#222] transition-colors hover:bg-[#f7f5f4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
          >
            <CustomOrder className="size-3.5 flex-shrink-0" aria-hidden />
            <span className="min-w-0 whitespace-normal break-words">
              {t("requestCustomOrder")}
            </span>
          </a>
        </div>
      ) : null}

      <dl className="hidden mt-4 space-y-2 border-t border-[#e8e3df] pt-4 text-sm text-[#595959] md:block">
        <div className="flex justify-between gap-2">
          <dt>
            <SellerShopStat icon={Sales}>{t("sidebarSales")}</SellerShopStat>
          </dt>
          <dd className="font-medium tabular-nums text-[#222]">
            {salesCount.toLocaleString()}
          </dd>
        </div>
        <div>
          <dt className="sr-only">{t("sidebarFollowers")}</dt>
          <dd>
            <ShopFollowersButton
              sellerIdOrSlug={sellerSlug}
              followersCount={followersCount}
              label={t("sidebarFollowers")}
              variant="sidebar"
            />
          </dd>
        </div>
      </dl>

      <div className="hidden mt-5 border-t border-[#e8e3df] pt-3 md:block">
        <ReportShopButton
          sellerId={sellerId}
          marketplaceName={marketplaceName}
          variant="sidebar"
        />
      </div>

      <nav
        aria-label={t("shopNavLabel")}
        className="hidden mt-4 border-t border-[#e8e3df] pt-3 md:block"
      >
        <ul className="space-y-1">
          <li>
            <a href={`${shopPath}#shop-reviews`} className={linkClass(false)}>
              {t("tab_reviews")}
            </a>
          </li>
          <li>
            <a
              href={sellerShopPath(basePath, slug, "about")}
              className={linkClass(false)}
            >
              {t("tab_about")}
            </a>
          </li>
          <li>
            <a href={`${shopPath}#shop-policies`} className={linkClass(false)}>
              {t("tab_policies")}
            </a>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
