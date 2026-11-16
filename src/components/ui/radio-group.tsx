"use client";

import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import type * as React from "react";

import { cn } from "@/lib/utils";

function RadioGroup({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>): React.JSX.Element {
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      className={cn("grid w-full gap-2", className)}
      {...props}
    />
  );
}

type RadioGroupItemProps = React.ComponentProps<
  typeof RadioGroupPrimitive.Item
> & {
  /** Shown to assistive tech when the control has no visible label text. */
  label?: string;
};

function RadioGroupItem({
  className,
  label,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  ...props
}: RadioGroupItemProps): React.JSX.Element {
  const accessibleName = ariaLabel ?? label;
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(
        "peer flex items-center justify-center size-4.5 shrink-0 rounded-full border border-gray-300 bg-white outline-none disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-black",
        className,
      )}
      {...props}
      aria-label={accessibleName}
      aria-labelledby={ariaLabelledBy}
      title={accessibleName}
    >
      {accessibleName ? (
        <span className="sr-only">{accessibleName}</span>
      ) : null}
      <RadioGroupPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="flex items-center justify-center"
      >
        <span
          className="block size-2 rounded-full bg-black"
          aria-hidden="true"
        />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
}

export { RadioGroup, RadioGroupItem };
