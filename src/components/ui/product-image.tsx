"use client";

import type { LucideIcon } from "lucide-react";
import { ImageIcon } from "lucide-react";
import Image, { type ImageProps } from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

type ProductImageProps = Omit<ImageProps, "src"> & {
  src: string | null | undefined;
  iconClassName?: string;
  icon?: LucideIcon;
};

export function ProductImage({
  src,
  alt,
  iconClassName = "w-8 h-8",
  icon: Icon = ImageIcon,
  onError,
  fetchPriority,
  ...rest
}: ProductImageProps): React.JSX.Element {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    const label = typeof alt === "string" ? alt.trim() : "";
    return (
      <div
        aria-hidden={label ? undefined : true}
        className={cn(
          "pointer-events-none items-center justify-center bg-marketplace-surface-subtle text-marketplace-brand",
          rest.fill
            ? "absolute inset-0 flex size-full"
            : "inline-flex shrink-0",
          rest.className,
        )}
        style={
          rest.fill
            ? rest.style
            : {
                width: rest.width ? Number(rest.width) : undefined,
                height: rest.height ? Number(rest.height) : undefined,
                ...rest.style,
              }
        }
      >
        {label ? <span className="sr-only">{label}</span> : null}
        <Icon className={iconClassName} aria-hidden />
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      onError={(e) => {
        setHasError(true);
        onError?.(e);
      }}
      fetchPriority={fetchPriority}
      loading={fetchPriority === "high" ? "eager" : undefined}
      {...rest}
    />
  );
}
