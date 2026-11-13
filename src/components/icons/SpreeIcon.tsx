import { createElement, type SVGProps } from "react";
import { type IconName, iconPaths } from "./icon-paths.generated";

export type SpreeIconProps = Omit<SVGProps<SVGSVGElement>, "name"> & {
  name: IconName;
  variant?: "outline" | "filled";
  size?: number | string;
  title?: string;
};

export function SpreeIcon({
  name,
  variant = "outline",
  size = 24,
  title,
  fill,
  strokeWidth,
  style,
  ...props
}: SpreeIconProps) {
  const icon = iconPaths[name];
  const filledClass = /(?:^|\s)fill-(?!none\b)/.test(props.className ?? "");
  const selectedVariant =
    variant === "filled" || fill === "currentColor" || filledClass
      ? "filled"
      : "outline";
  const nodes =
    selectedVariant === "filled" ? (icon.filled ?? icon.outline) : icon.outline;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="1 1 22 22"
      width={size}
      height={size}
      fill={fill ?? "none"}
      style={{ scale: 1.18, ...style }}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      data-icon={name}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {nodes.map((node, index) =>
        createElement(node.tag, {
          ...node.props,
          ...(node.props.strokeWidth == null && strokeWidth == null
            ? {}
            : {
                strokeWidth:
                  Number(strokeWidth ?? node.props.strokeWidth) + 0.4,
              }),
          key: index,
        }),
      )}
    </svg>
  );
}
