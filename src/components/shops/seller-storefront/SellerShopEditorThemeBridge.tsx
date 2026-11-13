"use client";

import { useEffect, useRef } from "react";
import {
  getSellerAccentMutedTextColor,
  getSellerAccentTextColor,
} from "@/lib/utils/seller-storefront";

const editorMessageSource = "spree-shop-editor-parent";

export function SellerShopEditorThemeBridge({ enabled }: { enabled: boolean }) {
  const bridgeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!enabled) return;

    function onMessage(event: MessageEvent) {
      if (event.source !== window.parent) return;
      const message = event.data;
      if (
        message?.source !== editorMessageSource ||
        message.action !== "patch"
      ) {
        return;
      }

      if (Object.hasOwn(message.payload ?? {}, "preferred_featured_layout")) {
        const layout = message.payload.preferred_featured_layout;
        if (
          layout === "standard" ||
          layout === "mixed_grid" ||
          layout === "none"
        ) {
          document
            .querySelectorAll<HTMLElement>("[data-seller-featured-section]")
            .forEach((section) => {
              section.hidden = layout === "none";
            });
        }
      }

      if (Object.hasOwn(message.payload ?? {}, "banner")) {
        const banner = message.payload.banner;
        const layout =
          banner && typeof banner === "object" && "layout" in banner
            ? banner.layout
            : null;
        if (layout === "none" || typeof layout === "string") {
          const hidden = layout === "none";
          document
            .querySelectorAll<HTMLElement>(
              "[data-shop-banner-layout], [data-seller-shop-cover-fallback]",
            )
            .forEach((section) => {
              section.hidden = hidden;
            });
        }
      }

      if (!Object.hasOwn(message.payload ?? {}, "shop_accent_color")) return;

      const header = bridgeRef.current?.closest<HTMLElement>(
        "header[data-theme-seller-identity]",
      );
      const about = document.querySelector<HTMLElement>(
        "[data-theme-seller-about]",
      );
      const rawColor = message.payload.shop_accent_color;
      const color = typeof rawColor === "string" ? rawColor.trim() : "";
      if (color && !/^#[\da-f]{3}(?:[\da-f]{3})?$/i.test(color)) return;
      const storyTaglines = document.querySelectorAll<HTMLElement>(
        "[data-seller-accent-story-tagline]",
      );

      if (!color) {
        for (const property of themeProperties) {
          header?.style.removeProperty(property);
        }
        const defaultAboutColors: Record<string, string> = {
          "--marketplace-seller-accent": "#faf9f7",
          "--marketplace-seller-accent-text": "#29252d",
          "--marketplace-seller-accent-muted": "rgb(34 34 34 / 72%)",
          "--marketplace-seller-field-background": "#f7f3ee",
          "--marketplace-seller-action-background": "#29252d",
          "--marketplace-seller-action-foreground": "#ffffff",
        };
        for (const [property, value] of Object.entries(defaultAboutColors)) {
          about?.style.setProperty(property, value);
        }
        storyTaglines.forEach((tagline) => {
          tagline.style.removeProperty("color");
        });
        return;
      }

      const textColor = getSellerAccentTextColor(color);
      storyTaglines.forEach((tagline) => {
        tagline.style.color = textColor;
      });
      const lightAccent = textColor === "#222222";
      const sharedColors: Record<string, string> = {
        "--marketplace-seller-accent": color,
        "--marketplace-seller-accent-text": textColor,
        "--marketplace-seller-accent-muted":
          textColor === "#ffffff"
            ? "#ffffff"
            : getSellerAccentMutedTextColor(textColor),
        "--marketplace-seller-field-background": `color-mix(in srgb, ${color} 14%, #ffffff)`,
        "--marketplace-seller-action-background": lightAccent
          ? color
          : "#29252d",
        "--marketplace-seller-action-foreground": lightAccent
          ? textColor
          : "#ffffff",
      };
      for (const [property, value] of Object.entries(sharedColors)) {
        header?.style.setProperty(property, value);
        about?.style.setProperty(property, value);
      }
      if (header) {
        const actionBackground = "#ffffff";
        const actionBorder = lightAccent ? color : "#ffffff";
        const actionText = lightAccent ? "#222222" : color;
        header.style.setProperty(
          "--marketplace-seller-action-bg",
          actionBackground,
        );
        header.style.setProperty(
          "--marketplace-seller-action-border",
          actionBorder,
        );
        header.style.setProperty(
          "--marketplace-seller-action-text",
          actionText,
        );
        header.style.setProperty(
          "--marketplace-seller-rating-star",
          textColor === "#ffffff" ? "#ffffff" : "#5a3c12",
        );
        header.style.setProperty(
          "--marketplace-seller-rating-empty",
          textColor === "#ffffff"
            ? "rgb(255 255 255 / 55%)"
            : "var(--marketplace-border)",
        );
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [enabled]);

  return <span ref={bridgeRef} hidden aria-hidden="true" />;
}

const themeProperties = [
  "--marketplace-seller-accent",
  "--marketplace-seller-accent-text",
  "--marketplace-seller-accent-muted",
  "--marketplace-seller-field-background",
  "--marketplace-seller-action-background",
  "--marketplace-seller-action-foreground",
  "--marketplace-seller-action-bg",
  "--marketplace-seller-action-border",
  "--marketplace-seller-action-text",
  "--marketplace-seller-rating-star",
  "--marketplace-seller-rating-empty",
];
