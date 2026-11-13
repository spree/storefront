import Link from "next/link";
import { SpreeIcon } from "@/components/icons";
import { getStoreDescription, getStoreName } from "@/lib/store";

interface StoreBrandLogoProps {
  basePath: string;
  tagline?: string;
  compact?: boolean;
  logoImageUrl?: string;
  logoImageAlt?: string;
  /** Accent-colored wordmark without icon or tagline. */
  appearance?: "default" | "etsy";
  logoColor?: string;
}

export function StoreBrandLogo({
  basePath,
  tagline,
  compact = false,
  logoImageUrl,
  logoImageAlt,
  appearance = "default",
  logoColor,
}: StoreBrandLogoProps) {
  const storeName = getStoreName();
  const defaultTagline = getStoreDescription();
  const lines = tagline ?? defaultTagline;

  const isEtsy = appearance === "etsy";

  return (
    <Link
      data-theme-brand-logo
      style={logoColor ? { color: logoColor } : undefined}
      href={basePath || "/"}
      className={
        isEtsy
          ? "shrink-0 rounded-sm font-display text-[1.6rem] font-semibold leading-none tracking-tight text-marketplace-brand-accent focus-visible:outline-2 focus-visible:outline-marketplace-brand-accent sm:text-[2.15rem]"
          : compact
            ? "shrink-0 rounded-sm font-display text-[2.15rem] font-semibold leading-none tracking-tight text-marketplace-brand focus-visible:outline-2 focus-visible:outline-marketplace-brand"
            : "group flex min-w-0 max-w-[11rem] items-center gap-2.5 rounded-sm focus-visible:outline-2 focus-visible:outline-marketplace-brand sm:max-w-none sm:gap-3"
      }
    >
      {isEtsy || compact ? (
        <>
          <span
            data-theme-brand-logo-text
            style={{ display: logoImageUrl ? "none" : undefined }}
          >
            {storeName}
          </span>
          <img
            data-theme-brand-logo-image
            src={logoImageUrl || undefined}
            alt={logoImageAlt || storeName}
            width={180}
            height={60}
            className="max-h-[3rem] w-auto max-w-[12rem] object-contain"
            style={{ display: logoImageUrl ? undefined : "none" }}
          />
        </>
      ) : (
        <>
          {logoImageUrl ? (
            <img
              data-theme-brand-logo-image
              src={logoImageUrl}
              alt={logoImageAlt || storeName}
              width={180}
              height={60}
              className="max-h-[3rem] w-auto max-w-[12rem] object-contain"
            />
          ) : (
            <>
              <span
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-marketplace-brand text-marketplace-brand-foreground sm:size-11"
                aria-hidden
              >
                <SpreeIcon
                  name="handmade"
                  className="size-5 sm:size-[1.35rem]"
                />
              </span>
              <span className="min-w-0 text-left leading-tight">
                <span
                  data-theme-brand-logo-text
                  className="block truncate font-display text-xl font-semibold tracking-tight text-marketplace-brand sm:text-[1.65rem]"
                >
                  {storeName}
                </span>
                <span className="mt-0.5 line-clamp-2 text-[10px] font-medium leading-snug text-marketplace-muted-foreground sm:text-[11px]">
                  {lines}
                </span>
              </span>
            </>
          )}
        </>
      )}
    </Link>
  );
}
