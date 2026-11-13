import Link from "next/link";
import { ProductImage } from "@/components/ui/product-image";
import {
  MAKER_AVATAR_FALLBACK_STYLES,
  makerAvatarMonogram,
} from "@/lib/made-together/format";

type MadeTogetherMakerAvatarProps = {
  name: string;
  logoUrl: string | null;
  href: string | null;
  className: string;
  variantIndex?: number;
};

export function MadeTogetherMakerAvatar({
  name,
  logoUrl,
  href,
  className,
  variantIndex = 0,
}: MadeTogetherMakerAvatarProps) {
  const monogram = makerAvatarMonogram(name);
  const fallbackStyle =
    MAKER_AVATAR_FALLBACK_STYLES[
      variantIndex % MAKER_AVATAR_FALLBACK_STYLES.length
    ];
  const inner = (
    <span
      className={`relative inline-flex shrink-0 overflow-hidden rounded-full ${className}`}
      style={
        logoUrl
          ? undefined
          : {
              backgroundColor: fallbackStyle.background,
              color: fallbackStyle.foreground,
            }
      }
    >
      {logoUrl ? (
        <ProductImage
          src={logoUrl}
          alt=""
          fill
          className="object-cover"
          sizes="64px"
        />
      ) : (
        <span
          className="flex size-full items-center justify-center text-[11px] font-bold tracking-tight"
          aria-hidden="true"
        >
          {monogram}
        </span>
      )}
    </span>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="rounded-full transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#222] focus-visible:ring-offset-2"
      >
        {inner}
      </Link>
    );
  }

  return inner;
}
