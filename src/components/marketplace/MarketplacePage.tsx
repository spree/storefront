import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function MarketplacePage({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "mx-auto w-full min-w-0 max-w-[var(--marketplace-container,1440px)] px-[var(--marketplace-gutter)]",
        className,
      )}
      {...props}
    />
  );
}
