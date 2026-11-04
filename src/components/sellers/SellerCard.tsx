import type { Seller } from "@spree/sdk";
import Link from "next/link";
import { SellerImage } from "@/components/ui/seller-image";

interface SellerCardProps {
  seller: Seller;
  basePath: string;
  logoAlt: string;
  visitShopLabel: string;
}

export function SellerCard({
  seller,
  basePath,
  logoAlt,
  visitShopLabel,
}: SellerCardProps): React.JSX.Element {
  const logo = seller.square_logo_url || seller.logo_url;

  return (
    <Link
      href={`${basePath}/sellers/${seller.slug}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
    >
      <div className="relative aspect-[3/1] bg-gray-100">
        {seller.cover_photo_url && (
          <SellerImage
            src={seller.cover_photo_url}
            alt=""
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        )}
      </div>

      <div className="flex flex-1 flex-col px-5 pb-5">
        <div className="relative -mt-8 h-16 w-16 overflow-hidden rounded-full border-4 border-white bg-white shadow-sm">
          <SellerImage
            src={logo}
            alt={logoAlt}
            fill
            sizes="64px"
            className="object-cover"
            iconClassName="w-6 h-6"
          />
        </div>

        <h2 className="mt-3 text-lg font-semibold text-gray-900 group-hover:underline">
          {seller.name}
        </h2>
        {seller.about && (
          <p className="mt-1 line-clamp-2 text-sm text-gray-600">
            {seller.about}
          </p>
        )}
        <span className="mt-auto pt-4 text-sm font-medium text-gray-900">
          {visitShopLabel} &rarr;
        </span>
      </div>
    </Link>
  );
}
