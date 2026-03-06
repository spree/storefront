import type { StoreTaxon } from "@spree/sdk";
import Image from "next/image";
import Link from "next/link";
import { GridIcon } from "@/components/icons";
import { taxonHref } from "./helpers";
import type { TaxonWithChildren } from "./types";

interface TaxonImageProps {
  taxon: StoreTaxon;
  size?: number;
  className?: string;
}

function TaxonImage({ taxon, size = 40, className = "" }: TaxonImageProps) {
  const imageSrc = taxon.square_image_url || taxon.image_url || null;

  if (imageSrc) {
    return (
      <Image
        src={imageSrc}
        alt={taxon.name}
        width={size}
        height={size}
        className={`rounded-lg object-cover ${className}`}
      />
    );
  }

  return (
    <div
      className={`flex items-center justify-center bg-gray-50 rounded-lg ${className}`}
      style={{ width: size, height: size }}
    >
      <GridIcon className="w-5 h-5 text-gray-300" />
    </div>
  );
}

interface GridLayoutProps {
  taxons: StoreTaxon[];
  basePath: string;
  showImages: boolean;
}

export function GridLayout({ taxons, basePath, showImages }: GridLayoutProps) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
      {taxons.map((taxon) => (
        <Link
          key={taxon.id}
          href={taxonHref(basePath, taxon)}
          className="group flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
          role="menuitem"
        >
          {showImages && <TaxonImage taxon={taxon} size={40} />}
          <span className="text-sm font-medium text-gray-700 group-hover:text-primary-500 transition-colors">
            {taxon.name}
          </span>
        </Link>
      ))}
    </div>
  );
}

interface ColumnLayoutProps {
  taxonsWithChildren: TaxonWithChildren[];
  basePath: string;
  showCategoryImages: boolean;
  showSubcategoryImages: boolean;
}

export function ColumnLayout({
  taxonsWithChildren,
  basePath,
  showCategoryImages,
  showSubcategoryImages,
}: ColumnLayoutProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-8">
      {taxonsWithChildren.map((parent) => (
        <div key={parent.id} className="space-y-3">
          <Link
            href={taxonHref(basePath, parent)}
            className="flex items-center gap-2 text-sm font-bold text-gray-900 uppercase tracking-wide hover:text-primary-500 transition-colors"
            role="menuitem"
          >
            {showCategoryImages && (
              <TaxonImage taxon={parent} size={24} className="rounded" />
            )}
            {parent.name}
          </Link>

          {parent.subcategories.length > 0 && (
            <ul className="space-y-2">
              {parent.subcategories.map((child) => (
                <li key={child.id}>
                  <Link
                    href={taxonHref(basePath, child)}
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                    role="menuitem"
                  >
                    {showSubcategoryImages && (
                      <TaxonImage taxon={child} size={24} className="rounded" />
                    )}
                    {child.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <Link
            href={taxonHref(basePath, parent)}
            className="block text-xs font-bold text-gray-900 uppercase tracking-wide hover:text-primary-500 transition-colors pt-1"
            role="menuitem"
          >
            View all
          </Link>
        </div>
      ))}
    </div>
  );
}

interface FeaturedTaxonCardProps {
  taxon: StoreTaxon;
  basePath: string;
}

/**
 * Large promo card for a featured taxon.
 * Intentionally prefers `image_url` over `square_image_url` because this is
 * a tall card (min-h-[250px]) where a landscape/portrait image works better
 * than a square crop. This differs from TaxonImage which prefers square.
 */
export function FeaturedTaxonCard({ taxon, basePath }: FeaturedTaxonCardProps) {
  const imageSrc = taxon.image_url || taxon.square_image_url || null;

  if (!imageSrc) return null;

  return (
    <Link
      href={taxonHref(basePath, taxon)}
      className="group relative block rounded-xl overflow-hidden h-full min-h-[250px]"
      role="menuitem"
    >
      <Image
        src={imageSrc}
        alt={taxon.name}
        fill
        className="object-cover group-hover:scale-105 transition-transform duration-300"
        sizes="300px"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      <div className="absolute bottom-4 left-4 right-4">
        <span className="text-white text-sm font-bold uppercase tracking-wide">
          {`Explore ${taxon.name}`}
        </span>
      </div>
    </Link>
  );
}
