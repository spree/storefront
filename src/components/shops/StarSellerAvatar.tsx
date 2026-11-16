import type { Seller } from "@spree/sdk";
import Link from "next/link";
import { ProductImage } from "@/components/ui/product-image";
import { sellerMonogram } from "@/lib/utils/seller-display";

type StarSellerAvatarProps = {
  seller: Pick<
    Seller,
    "id" | "name" | "slug" | "square_logo_url" | "logo_url" | "badges"
  >;
  href?: string;
  sizeClassName: string;
  imageSizes?: string;
  className?: string;
};

const STARBURST_CLIP_PATH =
  "polygon(50% 0%, 61% 6%, 74% 3%, 81% 15%, 94% 21%, 91% 36%, 100% 50%, 91% 64%, 94% 79%, 81% 85%, 74% 97%, 61% 94%, 50% 100%, 39% 94%, 26% 97%, 19% 85%, 6% 79%, 9% 64%, 0% 50%, 9% 36%, 6% 21%, 19% 15%, 26% 3%, 39% 6%)";

export function StarSellerAvatar({
  seller,
  href,
  sizeClassName,
  imageSizes = "96px",
  className = "",
}: StarSellerAvatarProps) {
  const badge = seller.badges?.find((item) => item.key === "star_seller");
  const logo = seller.square_logo_url || seller.logo_url;
  const innerClass = badge
    ? "absolute inset-[13%] overflow-hidden rounded-full bg-[#f5f3ef]"
    : "absolute inset-0 overflow-hidden rounded-full bg-[#f5f3ef]";
  const avatar = (
    <>
      {badge ? (
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-[#f1e9c7]"
          style={{ clipPath: STARBURST_CLIP_PATH }}
        />
      ) : null}
      <span className={innerClass}>
        {logo ? (
          <ProductImage
            src={logo}
            alt=""
            fill
            className="object-cover"
            sizes={imageSizes}
          />
        ) : (
          <span
            className="flex size-full items-center justify-center text-base font-semibold text-[#39343c]"
            aria-hidden="true"
          >
            {sellerMonogram(seller.name)}
          </span>
        )}
      </span>
      {badge ? (
        <span
          role="img"
          aria-label={badge.label}
          title={badge.label}
          className="absolute bottom-0 right-0 z-10 inline-flex aspect-square w-[24%] min-w-4 max-w-6 items-center justify-center rounded-full bg-white p-[1px] shadow-sm"
        >
          {/* biome-ignore lint/performance/noImgElement: Keep the shared badge artwork crisp at small avatar sizes. */}
          <img
            src="/seller-badges/star-seller.svg"
            alt=""
            className="size-full object-contain"
            aria-hidden="true"
          />
        </span>
      ) : null}
    </>
  );

  return (
    <span
      className={`relative isolate inline-flex shrink-0 items-center justify-center overflow-visible ${sizeClassName} ${className}`}
      data-star-seller-avatar={badge ? "true" : undefined}
    >
      {href ? (
        <Link
          href={href}
          className="absolute inset-0 z-[1]"
          aria-label={seller.name}
        >
          {avatar}
        </Link>
      ) : (
        avatar
      )}
    </span>
  );
}
