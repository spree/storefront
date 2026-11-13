"use client";

import { useTranslations } from "next-intl";

interface SellerShopReviewSortFormProps {
  action: string;
  sort?: string;
  tab?: "home" | "reviews";
  sortParam?: string;
}

export function SellerShopReviewSortForm({
  action,
  sort,
  tab = "reviews",
  sortParam = "sort",
}: SellerShopReviewSortFormProps) {
  const tReviews = useTranslations("reviews");
  const t = useTranslations("sellers");

  const value =
    sort === "newest" || sort === "highest" || sort === "lowest" ? sort : "";

  return (
    <form
      method="get"
      action={action}
      className="flex items-center gap-2 self-start rounded-md border border-[#ded8d2] bg-white px-3 py-2 text-sm text-[#625b55] shadow-sm sm:self-auto"
    >
      <input type="hidden" name="tab" value={tab} />
      <label htmlFor="shop-review-sort">{tReviews("sortBy")}:</label>
      <select
        id="shop-review-sort"
        name={sortParam}
        defaultValue={value}
        className="cursor-pointer border-0 bg-transparent py-0 pl-0 pr-5 text-sm font-semibold text-[#26221f] focus:outline-none focus:ring-0"
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      >
        <option value="">{t("sort_reviews_suggested")}</option>
        <option value="newest">{tReviews("sort_newest")}</option>
        <option value="highest">{tReviews("sort_highest")}</option>
        <option value="lowest">{tReviews("sort_lowest")}</option>
      </select>
    </form>
  );
}
