import type * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-[var(--marketplace-control-height)] w-full min-w-0 rounded-[var(--marketplace-radius-sm)] border border-[color:var(--theme-form-border,var(--marketplace-control-border))] bg-transparent px-3 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--marketplace-focus)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive md:text-sm dark:bg-input/30 dark:focus-visible:outline-white dark:disabled:bg-input/80",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
