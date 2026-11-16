import type { ReactNode } from "react";
import {
  EmptyStateIllustration,
  type EmptyStateName,
} from "@/components/empty-states/EmptyStateIllustration";
import { cn } from "@/lib/utils";
import styles from "./MarketplaceEmptyState.module.css";

interface MarketplaceEmptyStateProps {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  illustration?: EmptyStateName;
  appearance?: "default" | "editorial";
  className?: string;
}

export function MarketplaceEmptyState({
  title,
  description,
  action,
  illustration,
  appearance = "default",
  className,
}: MarketplaceEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-[var(--marketplace-radius-lg)] border border-marketplace-border-subtle bg-marketplace-surface px-6 py-12 text-center text-marketplace-foreground",
        appearance === "editorial" && styles.editorial,
        className,
      )}
      data-marketplace-empty-state-appearance={
        appearance === "editorial" ? "editorial" : undefined
      }
    >
      {illustration ? (
        <EmptyStateIllustration
          name={illustration}
          className={cn(
            "mb-5 text-marketplace-brand",
            appearance === "editorial" && styles.illustration,
          )}
        />
      ) : null}
      <h2
        className={cn(
          "text-xl font-semibold",
          appearance === "editorial" && styles.title,
        )}
      >
        {title}
      </h2>
      {description ? (
        <p
          className={cn(
            "mt-2 max-w-md text-sm text-marketplace-muted-foreground",
            appearance === "editorial" && styles.description,
          )}
        >
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
