import type { CSSProperties } from "react";
import type { CmsNavigationItem } from "@/lib/data/cms-navigation";

type HighlightSource = Pick<
  CmsNavigationItem,
  "highlight_style" | "highlight_tone" | "text_color" | "background_color"
>;

export function cmsNavigationItemHighlightClassName(
  item: HighlightSource,
): string {
  const classes: string[] = [];
  if (item.highlight_style === "pill") {
    classes.push("rounded-full");
  } else if (item.highlight_style === "badge") {
    classes.push("rounded-sm");
  } else if (item.highlight_style === "underline") {
    classes.push("underline underline-offset-4");
  }
  if (item.highlight_tone === "bold") {
    classes.push("font-semibold");
  } else if (item.highlight_tone === "subtle") {
    classes.push("font-normal opacity-90");
  }
  if (item.text_color || item.background_color) {
    classes.push("transition-colors");
  }
  return classes.join(" ");
}

export function cmsNavigationItemHighlightStyle(
  item: HighlightSource,
): CSSProperties | undefined {
  const style: CSSProperties = {};
  if (item.text_color?.trim()) style.color = item.text_color.trim();
  if (item.background_color?.trim()) {
    style.backgroundColor = item.background_color.trim();
  }
  return Object.keys(style).length > 0 ? style : undefined;
}
