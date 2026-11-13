import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MarketplaceSectionHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  density?: "default" | "compact" | "etsy" | "home";
  headingLevel?: "h1" | "h2";
}

export function MarketplaceSectionHeader({
  title,
  description,
  action,
  className,
  density = "default",
  headingLevel = "h2",
}: MarketplaceSectionHeaderProps) {
  const Heading = headingLevel;
  return (
    <div
      data-theme-section-header
      className={cn(
        density === "etsy" || density === "home"
          ? "mb-4 flex items-center justify-between gap-4 text-marketplace-foreground"
          : density === "compact"
            ? "mb-3 flex items-end justify-between gap-4 text-marketplace-foreground"
            : "mb-6 flex items-end justify-between gap-4 text-marketplace-foreground lg:mb-8",
        className,
      )}
    >
      <div className="min-w-0">
        <Heading
          data-theme-section-heading
          className={cn(
            "tracking-tight",
            density === "home"
              ? "text-xl font-bold leading-tight md:text-2xl"
              : density === "etsy"
                ? "font-display text-xl font-semibold leading-snug"
                : density === "compact"
                  ? "text-base font-semibold sm:text-lg"
                  : "text-2xl font-semibold lg:text-3xl",
          )}
        >
          {title}
        </Heading>
        {description ? (
          <p
            data-theme-section-description
            className="mt-2 max-w-2xl text-sm text-marketplace-muted-foreground sm:text-base"
          >
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
