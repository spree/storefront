import type { Collection } from "@spree/sdk";
import Link from "next/link";
import { ProductImage } from "@/components/ui/product-image";

interface CollectionCardProps {
  collection: Collection;
  basePath: string;
  productCountLabel: string;
  viewLabel: string;
}

export function CollectionCard({
  collection,
  basePath,
  productCountLabel,
  viewLabel,
}: CollectionCardProps): React.JSX.Element {
  const image = collection.image_url || collection.square_image_url;
  const imageAlt = collection.image_url
    ? collection.image_alt
    : collection.square_image_alt;

  return (
    <Link
      href={`${basePath}/collections/${collection.permalink}`}
      className="group flex w-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
    >
      <div className="relative aspect-[4/3] bg-gray-100">
        <ProductImage
          src={image}
          alt={imageAlt ?? ""}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover"
        />
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h2 className="text-lg font-semibold text-gray-900 group-hover:underline">
          {collection.name}
        </h2>
        <p className="mt-1 text-sm text-gray-500">{productCountLabel}</p>
        {collection.description && (
          <p className="mt-2 line-clamp-2 text-sm text-gray-600">
            {collection.description}
          </p>
        )}
        <span className="mt-auto pt-4 text-sm font-medium text-gray-900">
          {viewLabel} &rarr;
        </span>
      </div>
    </Link>
  );
}
