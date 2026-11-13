"use client";

import type {
  CmsTheme,
  ThemeBuilderActionMessage,
  ThemeBuilderPreviewMessage,
  ThemeBuilderReadyMessage,
  ThemeBuilderSelectMessage,
  ThemeTemplateDocument,
  ThemeTemplatePayload,
} from "@spree/sdk";
import { useEffect, useRef, useState } from "react";
import {
  type CmsNavigationItemWire,
  cmsNavigationHref,
} from "@/lib/cms-navigation-href";
import { getPublishedNavigation } from "@/lib/data/cms-navigation";
import { sanitizeThemeRichText } from "@/lib/theme/sanitize-rich-text";
import { themeSettingEnabled } from "@/lib/theme/setting-value";
import {
  isTrustedThemeBuilderMessage,
  mergeThemeBuilderPreview,
} from "./theme-builder-preview-contract";
import { themeGlobalDataAttributes, themeInlineStyle } from "./theme-style";

type PreviewPayload = ThemeBuilderPreviewMessage["payload"];
type SectionEntry = ThemeTemplateDocument["sections"][string];
const refreshedRevisions = new Set<string>();
const appliedGlobalThemeStyles = new WeakMap<HTMLElement, Set<string>>();
const generatedSplitHeroPreviews = new WeakSet<HTMLElement>();

function cssPropertyName(name: string): string {
  return name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function previewThemeRoot(): HTMLElement | null {
  const roots = Array.from(
    document.querySelectorAll<HTMLElement>("[data-theme-id]"),
  );
  return (
    roots.find((candidate) =>
      candidate.querySelector(
        "[data-theme-template], [data-theme-section-group]",
      ),
    ) ||
    roots.find((candidate) => candidate.getBoundingClientRect().width > 0) ||
    roots[0] ||
    null
  );
}

export function applyGlobalThemeStyles(
  root: HTMLElement,
  styles: Record<string, string>,
): void {
  const properties = new Map(
    Object.entries(styles).map(([key, value]) => [cssPropertyName(key), value]),
  );
  const previous = appliedGlobalThemeStyles.get(root) || new Set<string>();
  for (const property of previous) {
    if (!properties.has(property)) root.style.removeProperty(property);
  }
  for (const [property, value] of properties)
    root.style.setProperty(property, value);
  appliedGlobalThemeStyles.set(root, new Set(properties.keys()));
}

function resolveEditorOrigin(stored: string | null): string | null {
  const trimmed = stored?.trim();
  if (trimmed) return trimmed.replace(/\/$/, "");
  if (typeof window === "undefined" || window.parent === window) return null;
  try {
    const referrer = document.referrer;
    if (referrer) return new URL(referrer).origin;
  } catch {
    return null;
  }
  return null;
}

function sectionNodes(root: HTMLElement): Map<string, HTMLElement> {
  return new Map(
    Array.from(
      root.querySelectorAll<HTMLElement>(
        '[data-theme-section-id]:not([data-theme-preview-source="true"])',
      ),
    ).map((element) => [element.dataset.themeSectionId || "", element]),
  );
}

export function initializePreviewSections(
  root: HTMLElement,
): Map<string, HTMLElement> {
  const styleId = "theme-builder-preview-source-style";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent =
      '[data-theme-preview-source="true"]{display:none!important}';
    document.head.append(style);
  }

  const nodes = new Map<string, HTMLElement>();
  const sourceNodes = Array.from(
    root.querySelectorAll<HTMLElement>(
      '[data-theme-section-id]:not([data-theme-preview-source="true"]):not([data-theme-preview-managed="true"])',
    ),
  );
  for (const source of sourceNodes) {
    const id = source.dataset.themeSectionId;
    if (!id) continue;
    source.dataset.themePreviewSource = "true";
    const existing = nodes.get(id);
    if (existing) continue;
    const preview = source.cloneNode(true) as HTMLElement;
    delete preview.dataset.themePreviewSource;
    preview.dataset.themePreviewManaged = "true";
    source.parentElement?.append(preview);
    nodes.set(id, preview);
  }
  return nodes;
}

function contentNode(
  root: HTMLElement,
  group: "body" | "header" | "footer",
): HTMLElement {
  const selector =
    group === "body"
      ? "[data-theme-template]"
      : `[data-theme-section-group="${group}"]`;
  const existing = root.querySelector<HTMLElement>(selector);
  if (existing) return existing;
  const created = document.createElement("div");
  if (group === "body") created.dataset.themeTemplate = "preview";
  else created.dataset.themeSectionGroup = group;
  if (group === "header") root.prepend(created);
  else root.append(created);
  return created;
}

function safePreviewUrl(value: unknown): string {
  if (typeof value !== "string") return "";
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  if (/^https:\/\//i.test(value)) return value;
  try {
    const url = new URL(value);
    return url.protocol === "http:" &&
      (url.hostname === "localhost" ||
        url.hostname.endsWith(".localhost") ||
        /^127(?:\.\d{1,3}){3}$/.test(url.hostname))
      ? value
      : "";
  } catch {
    return "";
  }
}

function renderSplitHeroPreview(node: HTMLElement, entry: SectionEntry): void {
  const settings = entry.settings || {};
  const hero = node.querySelector<HTMLElement>("[data-theme-hero-section]");
  if (!hero) return;

  const variant = String(settings.hero_variant || "classic");
  const media1Type = settings.media_1_type === "video" ? "video" : "image";
  const media2Type = settings.media_2_type === "video" ? "video" : "image";
  const media1 = safePreviewUrl(
    settings[`media_1_${media1Type}_url`] ||
      (media1Type === "image" ? settings.image_url : settings.video_source),
  );
  const media2 = safePreviewUrl(settings[`media_2_${media2Type}_url`]);
  const blocks = (entry.blocks || {}) as Record<
    string,
    {
      type?: string;
      settings?: Record<string, unknown>;
      disabled?: unknown;
      parent_id?: string;
    }
  >;
  const orderedBlocks = (entry.block_order || [])
    .map((id) => blocks[id])
    .filter((block) => block && !block.disabled && !block.parent_id);
  const text = (value: unknown) =>
    String(value ?? "")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const heading = orderedBlocks.find((block) => block.type === "heading");
  const button = orderedBlocks.find((block) => block.type === "button");
  const copy = orderedBlocks.find((block) => block.type === "text");
  const headingText =
    text(heading?.settings?.text) ||
    text(settings.heading) ||
    "Meet the Etsy Design Awards Finalists";
  const buttonText =
    text(button?.settings?.label) ||
    text(settings.button_text) ||
    "Get inspired";
  const buttonHref =
    safePreviewUrl(button?.settings?.link) ||
    safePreviewUrl(settings.button_link) ||
    "/products";
  const promoText =
    text(copy?.settings?.text) ||
    text(settings.subheading) ||
    "Trick-or-treat bags with personality";
  const promoHref = safePreviewUrl(settings.promo_link) || "/products";
  const color =
    typeof settings.split_background_color === "string" &&
    /^#[0-9a-fA-F]{6}$/.test(settings.split_background_color)
      ? settings.split_background_color
      : "#ffad00";

  const splitAlreadyRendered =
    generatedSplitHeroPreviews.has(node) &&
    Boolean(hero.querySelector(".theme-hero-split-grid"));
  if (variant !== "split" && !splitAlreadyRendered) return;
  if (!media1 || !media2 || (!headingText && !buttonText && !promoText)) return;
  if (variant !== "split" && splitAlreadyRendered) return;

  generatedSplitHeroPreviews.add(node);

  const split = document.createElement("div");
  split.dataset.themeHeroSplit = "true";
  split.className =
    "theme-hero-split mx-auto w-full max-w-[1440px] px-4 py-4 sm:px-6 lg:px-8";
  const grid = document.createElement("div");
  grid.className =
    "theme-hero-split-grid grid min-h-[17rem] grid-cols-1 md:grid-cols-[minmax(0,1.6fr)_minmax(140px,0.65fr)_minmax(180px,1fr)]";
  grid.dataset.themeHeroLayoutVariant = variant;

  const content = document.createElement("div");
  content.dataset.themeHeroFrame = "true";
  content.dataset.themeHeroVariant = "split";
  content.className =
    "theme-hero-split-copy flex flex-col items-center justify-center rounded-l-xl rounded-r-none px-6 py-8 text-center md:px-8";
  content.style.backgroundColor = color;
  const headingElement = document.createElement("h1");
  headingElement.dataset.themeHeroHeadline = "true";
  headingElement.className =
    "max-w-[11em] text-[2.55rem] font-normal leading-[1.08] tracking-tight text-[#222] md:text-[3rem]";
  headingElement.style.fontFamily = "Georgia, 'Times New Roman', serif";
  headingElement.textContent = headingText;
  const cta = document.createElement("a");
  cta.dataset.themeHeroCta = "true";
  cta.href = buttonHref;
  cta.className =
    "mt-5 rounded-full bg-[#222] px-6 py-3 text-sm font-semibold text-white";
  cta.textContent = buttonText;
  content.append(headingElement, cta);

  const mediaElement = (source: string, type: string, slot: "1" | "2") => {
    const wrapper = document.createElement(slot === "2" ? "a" : "div");
    wrapper.dataset.themeHeroMedia = slot;
    wrapper.className =
      slot === "1"
        ? "theme-hero-split-photo relative min-h-[17rem] rounded-none md:min-h-[22rem]"
        : "theme-hero-split-promo relative ml-0 min-h-[17rem] rounded-xl md:ml-8 md:min-h-[22rem]";
    if (wrapper instanceof HTMLAnchorElement) {
      wrapper.href = promoHref;
      wrapper.dataset.themeHeroPromoDefaultHref = "/products";
    }
    const visual = document.createElement(type === "video" ? "video" : "img");
    visual.src = source;
    visual.className = "absolute inset-0 h-full w-full object-cover";
    if (visual instanceof HTMLVideoElement) {
      visual.autoplay = true;
      visual.muted = true;
      visual.loop = true;
      visual.playsInline = true;
    } else visual.alt = "";
    wrapper.append(visual);
    if (slot === "2") {
      const overlay = document.createElement("div");
      overlay.className =
        "absolute inset-0 rounded-xl bg-gradient-to-t from-black/65 via-black/10 to-transparent";
      const label = document.createElement("div");
      label.className = "absolute inset-x-4 bottom-4 z-10 text-white";
      const title = document.createElement("h2");
      title.dataset.themeHeroPromo = "true";
      title.className = "text-xl font-semibold leading-tight";
      title.textContent = promoText;
      const shop = document.createElement("span");
      shop.className = "mt-1 block text-sm font-semibold";
      shop.textContent = "Shop now";
      label.append(title, shop);
      wrapper.append(overlay, label);
    }
    return wrapper;
  };

  grid.append(
    content,
    mediaElement(media1, media1Type, "1"),
    mediaElement(media2, media2Type, "2"),
  );
  split.append(grid);
  hero.replaceChildren(split);
}

function createPreviewSection(id: string, entry: SectionEntry): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.dataset.themeSectionId = id;
  wrapper.dataset.themeSectionType = entry.type;
  const settings = entry.settings || {};

  if (entry.type === "hero") {
    const shell = document.createElement("div");
    shell.dataset.themeHeroSection = id;
    const section = document.createElement("section");
    section.className = "py-0";
    const width = document.createElement("div");
    width.className = "mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8";
    const frame = document.createElement("div");
    frame.dataset.themeHeroFrame = "true";
    frame.className = "relative grid grid-cols-1";
    frame.style.display = "grid";
    const content = document.createElement("div");
    content.dataset.themeHeroContent = "true";
    content.className =
      "relative z-20 flex min-h-[32rem] flex-col items-start justify-center px-6 py-8 text-left md:px-12";
    const heading = document.createElement("h1");
    heading.dataset.themeHeroFallback = "true";
    heading.className =
      "font-display text-4xl font-semibold leading-tight md:text-6xl";
    heading.textContent = String(settings.heading || "");
    const subheading = document.createElement("p");
    subheading.dataset.themeHeroFallback = "true";
    subheading.className = "mt-5 max-w-xl text-marketplace-muted-foreground";
    subheading.textContent = String(settings.subheading || "");
    content.append(heading, subheading);
    const mediaArea = document.createElement("div");
    mediaArea.dataset.themeHeroMediaArea = "true";
    mediaArea.className = "relative z-0";
    const mediaList = document.createElement("div");
    mediaList.dataset.themeHeroMediaList = "true";
    mediaList.className = "grid grid-cols-1 gap-3 md:grid-cols-1";
    for (const slot of [1, 2]) {
      const media = document.createElement("div");
      media.dataset.themeHeroMedia = String(slot);
      media.className =
        "relative flex h-[32rem] items-center justify-center overflow-hidden";
      media.style.display = "none";
      mediaList.append(media);
    }
    mediaArea.append(mediaList);
    frame.append(content, mediaArea);
    width.append(frame);
    section.append(width);
    shell.append(section);
    wrapper.append(shell);
    syncHeroBlocks(wrapper, entry);
    return wrapper;
  }

  if (entry.type === "announcement_bar") {
    const bar = document.createElement("div");
    bar.dataset.themeSectionType = "announcement_bar";
    bar.className = "bg-[#f5f5f1] px-4 py-2 text-center text-sm text-[#222]";
    bar.textContent = String(settings.text || "Welcome to our store");
    wrapper.append(bar);
    return wrapper;
  }

  if (entry.type === "featured_collection") {
    const section = document.createElement("section");
    section.dataset.featuredCollection = id;
    section.dataset.themeSectionFrame = id;
    section.className = "px-6 py-12";
    const content = document.createElement("div");
    content.dataset.themeSectionContent = "true";
    content.className = "mx-auto w-full max-w-[1440px]";
    const header = document.createElement("div");
    header.className = "featured-collection-header";
    header.dataset.themeSectionHeader = "true";
    const orderedBlocks = (entry.block_order || Object.keys(entry.blocks || {}))
      .map((blockId) => ({
        id: blockId,
        block: entry.blocks?.[blockId] as
          | {
              type?: string;
              disabled?: boolean;
              settings?: Record<string, unknown>;
            }
          | undefined,
      }))
      .filter((item) => item.block);
    const titleBlock = orderedBlocks.find(
      (item) => item.block?.type === "collection_title",
    );
    const viewAllBlock = orderedBlocks.find(
      (item) => item.block?.type === "view_all_button",
    );
    const titleWrapper = document.createElement("div");
    if (titleBlock) titleWrapper.dataset.themeBlockId = titleBlock.id;
    const title = document.createElement("h2");
    title.dataset.themeSectionHeading = "true";
    title.textContent = String(
      titleBlock?.block?.settings?.text || "Featured collection",
    );
    titleWrapper.append(title);
    header.append(titleWrapper);
    if (viewAllBlock && !viewAllBlock.block?.disabled) {
      const viewAll = document.createElement("a");
      viewAll.dataset.themeBlockId = viewAllBlock.id;
      viewAll.dataset.slot = "button";
      viewAll.href = "/collections/all";
      viewAll.textContent = String(
        viewAllBlock.block?.settings?.label || "View all",
      );
      header.append(viewAll);
    }
    const list = document.createElement("div");
    list.className = "featured-collection-grid";
    for (let index = 0; index < 8; index += 1) {
      const card = document.createElement("article");
      card.dataset.themeProductCard = "true";
      card.className = "grid gap-2";
      const media = document.createElement("div");
      media.dataset.themeProductPart = "media";
      media.className = "aspect-[4/5] bg-marketplace-surface-warm";
      media.style.minHeight = "180px";
      media.style.backgroundColor = "var(--marketplace-surface-warm, #f6f1e8)";
      card.append(media);
      const productTitle = document.createElement("h3");
      productTitle.dataset.themeProductPart = "product_title";
      productTitle.textContent = `Product ${index + 1}`;
      card.append(productTitle);
      const price = document.createElement("div");
      price.dataset.themeProductPart = "price";
      price.textContent = "$24.00";
      card.append(price);
      for (const part of [
        "price-installments",
        "price-tax-information",
        "review_stars",
        "sku",
        "swatches",
        "buy_buttons",
      ]) {
        const partNode = document.createElement("div");
        partNode.dataset.themeProductPart = part;
        card.append(partNode);
      }
      list.append(card);
    }
    const navigation = document.createElement("nav");
    navigation.dataset.themeCarouselNavigation = "true";
    navigation.setAttribute("aria-label", "Featured products carousel");
    navigation.className = "mt-4 flex justify-end gap-2";
    navigation.style.display = "none";
    for (const [label, icon] of [
      ["Previous products", "‹"],
      ["Next products", "›"],
    ]) {
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute("aria-label", label);
      button.textContent = icon;
      button.className =
        "grid size-9 place-items-center rounded-full border border-marketplace-border";
      navigation.append(button);
    }
    content.append(header, list, navigation);
    section.append(content);
    wrapper.append(section);
    syncFeaturedCollectionPreview(wrapper, entry);
    return wrapper;
  }

  const section = document.createElement("section");
  section.className = "mx-auto w-full max-w-[1440px] px-6 py-12";
  const heading = document.createElement("h2");
  heading.className = "mb-6 text-2xl font-semibold";
  heading.textContent = String(
    settings.heading || entry.type.replaceAll("_", " "),
  );
  section.append(heading);
  if (
    [
      "product_rail",
      "collection_tiles",
      "category_tiles",
      "shop_rail",
    ].includes(entry.type)
  ) {
    const grid = document.createElement("div");
    grid.className = "grid grid-cols-2 gap-4 md:grid-cols-4";
    for (let index = 0; index < 4; index += 1) {
      const card = document.createElement("div");
      card.className =
        "flex aspect-[4/3] items-end rounded-md bg-marketplace-surface-warm p-4 text-sm";
      card.textContent =
        entry.type === "product_rail"
          ? `Product ${index + 1}`
          : `Item ${index + 1}`;
      grid.append(card);
    }
    section.append(grid);
  } else {
    const copy = document.createElement("p");
    copy.className = "max-w-2xl text-marketplace-muted-foreground";
    copy.dataset.themeSectionBody = "true";
    copy.textContent = String(
      settings.body || settings.text || settings.subheading || "",
    );
    copy.hidden = !copy.textContent?.trim();
    section.append(copy);
  }
  wrapper.append(section);
  return wrapper;
}

function syncHeroBlocks(node: HTMLElement, entry: SectionEntry) {
  const content = node.querySelector<HTMLElement>("[data-theme-hero-content]");
  if (!content) return;
  const order = entry.block_order || [];
  content
    .querySelectorAll<HTMLElement>("[data-theme-hero-fallback]")
    .forEach((item) => {
      item.style.display = order.length ? "none" : "";
    });
  const liveIds = new Set(order);
  content
    .querySelectorAll<HTMLElement>("[data-theme-block-id]")
    .forEach((block) => {
      if (!liveIds.has(block.dataset.themeBlockId || "")) block.remove();
    });
  for (const id of order) {
    const block = entry.blocks?.[id] as
      | { type?: string; settings?: Record<string, unknown> }
      | undefined;
    if (!block) continue;
    let blockNode = Array.from(
      content.querySelectorAll<HTMLElement>("[data-theme-block-id]"),
    ).find((item) => item.dataset.themeBlockId === id);
    if (!blockNode) {
      blockNode = document.createElement("div");
      blockNode.dataset.themeBlockId = id;
      blockNode.dataset.themeBlockType = block.type || "";
      if (block.type === "heading") {
        const heading = document.createElement("h2");
        heading.className =
          "font-display text-4xl font-semibold leading-tight md:text-6xl";
        blockNode.append(heading);
      } else if (block.type === "button") {
        const anchor = document.createElement("a");
        anchor.className =
          "mt-6 inline-flex w-fit items-center justify-center rounded border border-marketplace-brand bg-marketplace-brand px-5 py-3 text-white";
        anchor.href = "#";
        blockNode.append(anchor);
      } else if (block.type === "image") {
        const image = document.createElement("img");
        image.className = "h-auto max-w-full object-cover";
        blockNode.append(image);
      } else if (block.type === "spacer") {
        blockNode.setAttribute("aria-hidden", "true");
      } else {
        blockNode.append(document.createElement("p"));
      }
    }
    content.append(blockNode);
  }
}

function previewBlockContent(
  id: string,
  block: {
    type?: string;
    settings?: Record<string, unknown>;
    disabled?: unknown;
    parent_id?: string;
  },
  blocks: Record<
    string,
    {
      type?: string;
      settings?: Record<string, unknown>;
      disabled?: unknown;
      parent_id?: string;
    }
  >,
  order: string[],
): HTMLElement | null {
  if (!block.type || themeSettingEnabled(block.disabled)) return null;
  const settings = block.settings || {};
  const wrapper = document.createElement("div");
  wrapper.dataset.themeBlockId = id;
  wrapper.dataset.themeBlockType = block.type;
  const text = (value: unknown) => String(value ?? "");
  const richText = (tag: "h2" | "p", value: unknown) => {
    const element = document.createElement(tag);
    element.innerHTML = sanitizeThemeRichText(text(value));
    element.style.padding = `${Number(settings.padding_top || 0)}px ${Number(settings.padding_right || 0)}px ${Number(settings.padding_bottom || 0)}px ${Number(settings.padding_left || 0)}px`;
    element.style.width = settings.width === "fill" ? "100%" : "fit-content";
    const maxWidths: Record<string, string> = {
      narrow: "40rem",
      normal: "48rem",
      wide: "64rem",
      full: "none",
    };
    element.style.maxWidth = maxWidths[text(settings.max_width)] || "";
    const fontSizes: Record<string, string> = {
      heading_1: "2.5rem",
      heading_2: "2rem",
      heading_3: "1.5rem",
      heading_4: "1.25rem",
    };
    if (fontSizes[text(settings.preset)])
      element.style.fontSize = fontSizes[text(settings.preset)];
    const customTextPreset =
      block.type === "text" && settings.preset === "custom";
    const customHeadingPreset =
      block.type === "heading" && settings.preset === "custom_hd";
    if (
      (customTextPreset || customHeadingPreset) &&
      Number(settings.font_size) > 0
    )
      element.style.fontSize = `${Number(settings.font_size)}px`;
    if (block.type === "heading") {
      if (Number(settings.font_weight) > 0)
        element.style.fontWeight = String(settings.font_weight);
      if (Number(settings.line_height) > 0)
        element.style.lineHeight = String(settings.line_height);
      if (settings.uppercase === true)
        element.style.textTransform = "uppercase";
      if (typeof settings.letter_spacing === "string")
        element.style.letterSpacing = settings.letter_spacing;
      if (settings.border_style === "solid")
        element.style.border = "1px solid var(--marketplace-border)";
      if (Number(settings.corner_radius) > 0)
        element.style.borderRadius = `${Number(settings.corner_radius)}px`;
      if (Number(settings.padding_x) > 0 || Number(settings.padding_y) > 0) {
        element.style.padding = `${Number(settings.padding_y) || 0}px ${Number(settings.padding_x) || 0}px`;
      }
    }
    if (customTextPreset) {
      if (Number(settings.font_weight) > 0)
        element.style.fontWeight = String(settings.font_weight);
      if (Number(settings.line_height) > 0)
        element.style.lineHeight = String(settings.line_height);
    }
    if (block.type === "text" && settings.center_text === true)
      element.style.textAlign = "center";
    if (Number(settings.margin_bottom) > 0)
      element.style.marginBottom = `${Number(settings.margin_bottom)}px`;
    if (block.type === "text" && settings.hide_breaks_on_mobile === true) {
      const style = document.createElement("style");
      style.textContent =
        "@media(max-width:767px){[data-theme-hide-breaks-mobile] br{display:none}}";
      wrapper.dataset.themeHideBreaksMobile = "true";
      wrapper.append(style);
    }
    if (
      block.type === "text" &&
      Number(settings.font_size_mobile) > 0 &&
      customTextPreset
    ) {
      const style = document.createElement("style");
      style.textContent = `@media(max-width:767px){[data-theme-block-id="${id}"] p{font-size:${Number(settings.font_size_mobile)}px}}`;
      wrapper.append(style);
    }
    if (themeSettingEnabled(settings.hide_on_mobile))
      wrapper.classList.add("max-md:hidden");
    if (
      block.type === "heading" &&
      themeSettingEnabled(settings.background_enabled)
    ) {
      element.style.backgroundColor = /^#[0-9a-f]{6}$/i.test(
        text(settings.background_color),
      )
        ? text(settings.background_color)
        : settings.background_color === "palette"
          ? "var(--marketplace-surface-warm)"
          : "";
    }
    if (block.type === "heading" && Number(settings.margin_bottom) > 0)
      element.style.marginBottom = `${Number(settings.margin_bottom)}px`;
    if (/^#[0-9a-f]{6}$/i.test(text(settings.text_color)))
      element.style.color = text(settings.text_color);
    else if (settings.text_color === "palette")
      element.style.color = "var(--marketplace-foreground)";
    if (themeSettingEnabled(settings.background_enabled)) {
      element.style.backgroundColor = /^#[0-9a-f]{6}$/i.test(
        text(settings.background_color),
      )
        ? text(settings.background_color)
        : settings.background_color === "palette"
          ? "var(--marketplace-surface-warm)"
          : "";
    }
    wrapper.append(element);
  };
  const link = (label: unknown, value: unknown) => {
    const anchor = document.createElement("a");
    anchor.textContent = text(label);
    anchor.href = safePreviewUrl(value) || "#";
    anchor.className =
      "inline-flex items-center justify-center rounded border px-5 py-3";
    const preset = text(settings.style || "primary");
    if (preset === "primary") {
      anchor.classList.add(
        "border-marketplace-brand",
        "bg-marketplace-brand",
        "text-white",
      );
    } else if (preset === "secondary") {
      anchor.classList.add(
        "border-marketplace-brand",
        "bg-marketplace-surface",
        "text-marketplace-brand",
      );
    } else {
      for (const [property, key, paletteValue] of [
        ["backgroundColor", "background_color", "var(--marketplace-brand)"],
        ["color", "text_color", "white"],
        ["borderColor", "border_color", "var(--marketplace-brand)"],
      ] as const) {
        const color = settings[key];
        anchor.style[property] = /^#[0-9a-f]{6}$/i.test(text(color))
          ? text(color)
          : color === "palette"
            ? paletteValue
            : "";
      }
    }
    anchor.classList.toggle("w-full", settings.mobile_width === "custom");
    anchor.classList.toggle("w-fit", settings.mobile_width !== "custom");
    anchor.classList.toggle("md:w-full", settings.desktop_width === "custom");
    anchor.classList.toggle("md:w-fit", settings.desktop_width !== "custom");
    const buttonSize: Record<string, string> = {
      small: "px-3 py-2 text-sm",
      medium: "px-5 py-3",
      large: "px-7 py-4 text-lg",
    };
    anchor.classList.remove(
      "px-5",
      "py-3",
      "text-sm",
      "text-lg",
      "px-3",
      "py-2",
      "px-7",
      "py-4",
    );
    anchor.classList.add(
      ...(buttonSize[text(settings.size)] || buttonSize.medium).split(" "),
    );
    if (themeSettingEnabled(settings.hide_on_mobile))
      anchor.classList.add("max-md:hidden");
    if (themeSettingEnabled(settings.hide_on_desktop))
      anchor.classList.add("md:hidden");
    if (Number(settings.margin_bottom) > 0)
      anchor.style.marginBottom = `${Number(settings.margin_bottom)}px`;
    anchor.target = themeSettingEnabled(settings.open_in_new_tab)
      ? "_blank"
      : "";
    anchor.rel = anchor.target ? "noopener noreferrer" : "";
    return anchor;
  };

  switch (block.type) {
    case "heading":
    case "collection_title":
      richText("h2", settings.text || "Heading");
      break;
    case "text":
      richText("p", settings.text);
      break;
    case "button":
    case "view_all_button":
      wrapper.append(link(settings.label || "View all", settings.link));
      break;
    case "button_group": {
      wrapper.className = "flex flex-wrap items-center";
      wrapper.style.justifyContent = ["left", "center", "right"].includes(
        text(settings.alignment),
      )
        ? text(settings.alignment)
        : "flex-start";
      wrapper.style.gap = `${Math.max(0, Math.min(120, Number(settings.gap) || 0))}px`;
      for (const line of text(settings.buttons).split(/\r?\n/)) {
        const [label, href] = line.split("|", 2);
        if (label?.trim()) wrapper.append(link(label.trim(), href));
      }
      break;
    }
    case "image":
    case "image_banner": {
      const source = safePreviewUrl(settings.image_url);
      if (source) {
        const image = document.createElement("img");
        image.src = source;
        image.alt = text(settings.alt);
        image.className = "h-auto max-w-full object-cover";
        wrapper.append(image);
      }
      if (block.type === "image_banner" && settings.heading) {
        const heading = document.createElement("p");
        heading.textContent = text(settings.heading);
        wrapper.append(heading);
      }
      break;
    }
    case "video": {
      const source = safePreviewUrl(settings.video_url);
      if (source) {
        const video = document.createElement("video");
        video.src = source;
        video.controls = true;
        video.playsInline = true;
        video.preload = "metadata";
        video.className = "h-auto max-w-full rounded-md";
        wrapper.append(video);
      }
      break;
    }
    case "icon":
      wrapper.textContent = text(settings.name || "★");
      break;
    case "icon_text":
      wrapper.textContent = `${text(settings.icon || "★")} ${text(settings.text)}`;
      break;
    case "social_media": {
      for (const network of [
        "instagram",
        "facebook",
        "pinterest",
        "tiktok",
        "youtube",
      ]) {
        const href = safePreviewUrl(settings[network]);
        if (!href.startsWith("https://")) continue;
        const anchor = document.createElement("a");
        anchor.href = href;
        anchor.textContent = network;
        anchor.setAttribute("aria-label", network);
        anchor.className = "mr-3 underline";
        wrapper.append(anchor);
      }
      break;
    }
    case "countdown":
      wrapper.textContent = text(settings.expired_text || "Countdown");
      break;
    case "collection":
      wrapper.textContent = text(settings.heading || "Collection");
      break;
    case "product":
      wrapper.textContent = text(settings.heading || "Product");
      break;
    case "accordion": {
      const details = document.createElement("details");
      const summary = document.createElement("summary");
      summary.textContent = text(settings.title || "Details");
      const content = document.createElement("p");
      content.textContent = text(settings.content);
      details.append(summary, content);
      wrapper.append(details);
      break;
    }
    case "email_signup": {
      const heading = document.createElement("h3");
      heading.textContent = text(settings.heading || "Subscribe to our emails");
      const description = document.createElement("p");
      description.textContent = text(settings.description);
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = text(settings.button_label || "Subscribe");
      wrapper.append(heading, description, button);
      break;
    }
    case "popup_links": {
      const details = document.createElement("details");
      const summary = document.createElement("summary");
      summary.textContent = text(settings.label || "More links");
      details.append(summary);
      for (const line of text(settings.links).split(/\r?\n/)) {
        const [label, href] = line.split("|", 2);
        if (!label || !safePreviewUrl(href).startsWith("/")) continue;
        const anchor = document.createElement("a");
        anchor.href = safePreviewUrl(href);
        anchor.textContent = label;
        anchor.className = "mr-3 underline";
        details.append(anchor);
      }
      wrapper.append(details);
      break;
    }
    case "custom_code": {
      const code = document.createElement("pre");
      code.textContent = text(settings.code);
      wrapper.append(code);
      break;
    }
    case "group": {
      const direction =
        settings.direction === "horizontal" ? "flex-row flex-wrap" : "flex-col";
      wrapper.className = `flex ${direction}`;
      wrapper.style.gap = `${Math.max(0, Math.min(120, Number(settings.gap) || 12))}px`;
      for (const childId of order) {
        if (blocks[childId]?.parent_id !== id) continue;
        const child = previewBlockContent(
          childId,
          blocks[childId],
          blocks,
          order,
        );
        if (child) wrapper.append(child);
      }
      break;
    }
    case "divider": {
      const divider = document.createElement("hr");
      divider.style.borderTopWidth = `${Math.max(1, Math.min(8, Number(settings.thickness) || 1))}px`;
      wrapper.append(divider);
      break;
    }
    case "spacer":
      wrapper.setAttribute("aria-hidden", "true");
      wrapper.style.height =
        settings.size === "small"
          ? "1rem"
          : settings.size === "large"
            ? "3rem"
            : "2rem";
      break;
    default:
      return null;
  }
  return wrapper;
}

function syncGenericSectionBlocks(node: HTMLElement, entry: SectionEntry) {
  if (
    [
      "hero",
      "slideshow",
      "slideshow_split",
      "theme_header",
      "theme_footer",
      "announcement_bar",
      "featured_collection",
    ].includes(entry.type)
  )
    return;
  const blocks = (entry.blocks || {}) as Record<
    string,
    {
      type?: string;
      settings?: Record<string, unknown>;
      disabled?: unknown;
      parent_id?: string;
    }
  >;
  const order = entry.block_order || Object.keys(blocks);
  let host = node.querySelector<HTMLElement>("[data-theme-section-blocks]");
  if (order.length === 0) {
    host?.remove();
    return;
  }
  if (!host) {
    host = document.createElement("div");
    host.dataset.themeSectionBlocks = entry.type;
    host.className = "grid gap-4";
    (
      node.querySelector<HTMLElement>("[data-theme-section-content]") ||
      node.querySelector<HTMLElement>("section") ||
      node
    ).append(host);
  }
  host.replaceChildren();
  for (const id of order) {
    const block = blocks[id];
    if (!block || block.parent_id || themeSettingEnabled(block.disabled))
      continue;
    const rendered = previewBlockContent(id, block, blocks, order);
    if (rendered) host.append(rendered);
  }
}

function syncSlideshowPreview(node: HTMLElement, entry: SectionEntry) {
  const split = entry.type === "slideshow_split";
  if (entry.type !== "slideshow" && !split) return;

  const blocks = (entry.blocks || {}) as Record<
    string,
    {
      type?: string;
      settings?: Record<string, unknown>;
      disabled?: unknown;
      parent_id?: string;
    }
  >;
  const order = entry.block_order || Object.keys(blocks);
  const slideIds = order.filter(
    (id) =>
      blocks[id]?.type === "slide" &&
      !blocks[id]?.parent_id &&
      !themeSettingEnabled(blocks[id]?.disabled),
  );
  const emptyPlaceholder = Array.from(
    node.querySelectorAll<HTMLElement>("div"),
  ).find(
    (element) =>
      element.children.length === 0 &&
      element.textContent?.includes("No items are selected yet"),
  );
  emptyPlaceholder?.remove();

  let preview = node.querySelector<HTMLElement>(
    "[data-theme-slideshow-preview]",
  );
  if (slideIds.length === 0) {
    preview?.remove();
    return;
  }
  if (!preview) {
    preview = document.createElement("section");
    preview.dataset.themeSlideshowPreview = "true";
    preview.dataset.themeSectionContent = "true";
    preview.setAttribute("aria-roledescription", "carousel");
    preview.setAttribute("aria-label", "Slideshow");
    preview.className = "relative w-full";
    const host =
      node.querySelector<HTMLElement>("[data-theme-section-content]") ||
      node.querySelector<HTMLElement>("section") ||
      node;
    host.append(preview);
  }
  if (preview.dataset.timerId)
    window.clearInterval(Number(preview.dataset.timerId));

  const sectionSettings = entry.settings || {};
  const viewportWidth = window.innerWidth;
  preview.classList.toggle(
    "mx-auto",
    !themeSettingEnabled(sectionSettings.full_width),
  );
  preview.classList.toggle(
    "max-w-[1440px]",
    !themeSettingEnabled(sectionSettings.full_width),
  );
  preview.classList.toggle(
    "px-4",
    !themeSettingEnabled(sectionSettings.remove_side_margins),
  );
  preview.style.paddingTop = `${Number(sectionSettings.padding_top ?? 40)}px`;
  preview.style.paddingBottom = `${Number(sectionSettings.padding_bottom ?? 40)}px`;
  if (viewportWidth < 768) {
    preview.style.paddingTop = `${Number(sectionSettings.padding_top_mobile ?? 20)}px`;
    preview.style.paddingBottom = `${Number(sectionSettings.padding_bottom_mobile ?? 20)}px`;
  }
  preview.style.backgroundColor = themeSettingEnabled(
    sectionSettings.background_enabled,
  )
    ? String(sectionSettings.background_color || "#f7f7f7")
    : "";
  node.style.display =
    (viewportWidth < 768 &&
      themeSettingEnabled(sectionSettings.hide_on_mobile)) ||
    (viewportWidth >= 768 &&
      themeSettingEnabled(sectionSettings.hide_on_desktop))
      ? "none"
      : "";

  preview.replaceChildren();
  const viewport = document.createElement("div");
  viewport.dataset.themeSlideshowViewport = "true";
  viewport.className = `relative overflow-hidden ${themeSettingEnabled(sectionSettings.fade_effect) ? "grid" : ""}`;
  preview.append(viewport);

  slideIds.forEach((id, index) => {
    const block = blocks[id];
    const settings = block.settings || {};
    const slide = document.createElement("div");
    slide.dataset.themeBlockId = id;
    slide.dataset.themeBlockType = "slide";
    slide.setAttribute("role", "group");
    slide.setAttribute("aria-roledescription", "slide");
    slide.setAttribute("aria-label", `${index + 1} of ${slideIds.length}`);
    slide.setAttribute("aria-hidden", index === 0 ? "false" : "true");
    slide.style.backgroundColor = split
      ? typeof settings.background_color === "string" &&
        /^#[0-9a-fA-F]{6}$/.test(settings.background_color)
        ? settings.background_color
        : settings.background_color === "palette"
          ? "var(--marketplace-surface-warm)"
          : "#eeeeee"
      : "";
    slide.className = split
      ? `relative min-h-[420px] overflow-hidden ${index === 0 ? "" : "hidden"}`
      : `relative flex min-h-[300px] h-full items-center overflow-hidden bg-marketplace-surface-warm md:min-h-[480px] ${index === 0 ? "" : "hidden"}`;
    if (themeSettingEnabled(sectionSettings.fade_effect)) {
      slide.classList.remove("hidden");
      slide.style.gridArea = "1 / 1";
      slide.style.transition = "opacity 500ms ease";
      slide.style.opacity = index === 0 ? "1" : "0";
      slide.style.pointerEvents = index === 0 ? "auto" : "none";
    }

    if (split) {
      const imageRow = document.createElement("div");
      imageRow.dataset.themeSplitSlideImages = "true";
      imageRow.className = "absolute inset-0 grid grid-cols-2";
      imageRow.style.gap = `${Math.max(0, Number(settings.mobile_gap ?? 10))}px`;
      if (viewportWidth >= 768)
        imageRow.style.gap = `${Math.max(0, Number(settings.desktop_gap ?? 20))}px`;
      [1, 2].forEach((imageIndex) => {
        const column = document.createElement("div");
        column.className = "min-w-0 overflow-hidden";
        const imageUrl = safePreviewUrl(settings[`image_${imageIndex}_url`]);
        if (imageUrl) {
          const image = document.createElement("img");
          image.dataset.themeSlideImage = "true";
          image.src = imageUrl;
          image.alt = String(settings[`image_${imageIndex}_alt`] || "");
          image.className = "size-full object-cover";
          if (themeSettingEnabled(sectionSettings.image_animation))
            image.classList.add("theme-slideshow-image-zoom");
          const href = safePreviewUrl(settings[`image_${imageIndex}_link`]);
          if (href) {
            const anchor = document.createElement("a");
            anchor.href = href;
            anchor.className = "block size-full";
            anchor.append(image);
            column.append(anchor);
          } else column.append(image);
        }
        imageRow.append(column);
      });
      slide.append(imageRow);
      if (themeSettingEnabled(settings.background_gradient)) {
        const overlay = document.createElement("div");
        overlay.className =
          "pointer-events-none absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent";
        slide.append(overlay);
      }
    } else {
      const imageUrl = safePreviewUrl(settings.image_url);
      if (imageUrl) {
        const image = document.createElement("img");
        image.dataset.themeSlideImage = "true";
        image.src = imageUrl;
        image.alt = String(settings.alt || "");
        image.className = "absolute inset-0 size-full object-cover";
        if (themeSettingEnabled(sectionSettings.image_animation))
          image.classList.add("theme-slideshow-image-zoom");
        slide.append(image);
      }
    }

    const content = document.createElement("div");
    content.dataset.themeSlideContent = "true";
    content.className = split
      ? `absolute inset-y-0 z-10 flex w-full flex-col p-6 text-white md:w-1/2 md:p-12 ${settings.alignment === "top" ? "justify-start" : settings.alignment === "bottom" ? "justify-end" : "justify-center"} ${settings.position === "right" ? "md:right-0" : "md:left-0"}`
      : "relative z-10 flex w-full flex-col gap-3 p-6 md:p-12";
    for (const childId of order) {
      const child = blocks[childId];
      if (child?.parent_id !== id || themeSettingEnabled(child.disabled))
        continue;
      const rendered = previewBlockContent(childId, child, blocks, order);
      if (rendered) content.append(rendered);
    }
    slide.append(content);
    viewport.append(slide);
  });

  if (themeSettingEnabled(sectionSettings.image_animation)) {
    const animationStyle = document.createElement("style");
    animationStyle.textContent =
      "@keyframes theme-slideshow-image-zoom{from{transform:scale(1)}to{transform:scale(1.06)}}.theme-slideshow-image-zoom{animation:theme-slideshow-image-zoom 6s ease-in-out both}";
    preview.append(animationStyle);
  }

  const controls = order
    .map((id) => blocks[id])
    .find(
      (block) =>
        block?.type === "slideshow_controls" &&
        !themeSettingEnabled(block.disabled),
    );
  if (slideIds.length < 2) return;
  const controlSettings = controls?.settings || {};
  const background = String(controlSettings.background || "none");
  const controlClass =
    background === "circle"
      ? "rounded-full bg-white/90 text-gray-900 hover:bg-white"
      : background === "square"
        ? "rounded-md bg-white/90 text-gray-900 hover:bg-white"
        : "rounded-full bg-transparent text-white hover:bg-black/15";
  const slides = Array.from(viewport.children) as HTMLElement[];
  const hasArrowSettings =
    sectionSettings.show_arrows_desktop !== undefined ||
    sectionSettings.show_arrows_mobile !== undefined;
  const hasDotSettings =
    sectionSettings.show_pagination_desktop !== undefined ||
    sectionSettings.show_pagination_mobile !== undefined;
  const showArrows = hasArrowSettings
    ? Boolean(controls) &&
      (themeSettingEnabled(sectionSettings.show_arrows_desktop) ||
        themeSettingEnabled(sectionSettings.show_arrows_mobile))
    : Boolean(controls) && controlSettings.style !== "dots";
  const showDots = hasDotSettings
    ? Boolean(controls) &&
      (themeSettingEnabled(sectionSettings.show_pagination_desktop) ||
        themeSettingEnabled(sectionSettings.show_pagination_mobile))
    : Boolean(controls) && controlSettings.style === "dots";
  const showArrowsHere =
    Boolean(controls) &&
    (viewportWidth < 768
      ? themeSettingEnabled(sectionSettings.show_arrows_mobile, showArrows)
      : themeSettingEnabled(sectionSettings.show_arrows_desktop, showArrows));
  const showDotsHere =
    Boolean(controls) &&
    (viewportWidth < 768
      ? themeSettingEnabled(sectionSettings.show_pagination_mobile, showDots)
      : themeSettingEnabled(sectionSettings.show_pagination_desktop, showDots));
  const setActiveSlide = (index: number) => {
    slides.forEach((slide, current) => {
      const fade = themeSettingEnabled(sectionSettings.fade_effect);
      slide.classList.toggle("hidden", !fade && index !== current);
      if (fade) {
        slide.style.opacity = index === current ? "1" : "0";
        slide.style.pointerEvents = index === current ? "auto" : "none";
      }
      slide.setAttribute("aria-hidden", index === current ? "false" : "true");
    });
  };
  if (showDotsHere) {
    const dots = document.createElement("div");
    dots.dataset.slideshowDots = "true";
    dots.className = "mt-3 flex justify-center gap-2";
    dots.setAttribute("role", "group");
    dots.setAttribute("aria-label", "Choose slide");
    slideIds.forEach((_, index) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.setAttribute("aria-label", `Go to slide ${index + 1}`);
      dot.className = `size-2.5 rounded-full ${index === 0 ? "bg-marketplace-brand" : "bg-marketplace-border"}`;
      dot.style.backgroundColor = String(
        sectionSettings.pagination_color || "#ffffff",
      );
      dot.addEventListener("click", () => {
        setActiveSlide(index);
        dots.querySelectorAll("button").forEach((item, current) => {
          item.setAttribute(
            "aria-current",
            current === index ? "true" : "false",
          );
          item.classList.toggle("bg-marketplace-brand", current === index);
          item.classList.toggle("bg-marketplace-border", current !== index);
        });
      });
      dots.append(dot);
    });
    dots.querySelector("button")?.setAttribute("aria-current", "true");
    preview.append(dots);
  }

  if (themeSettingEnabled(sectionSettings.auto_rotate)) {
    const interval =
      Math.max(1, Number(sectionSettings.autoplay_speed) || 5) * 1000;
    const timerId = window.setInterval(() => {
      if (!preview?.isConnected) {
        window.clearInterval(timerId);
        return;
      }
      const current = slides.findIndex(
        (slide) => slide.getAttribute("aria-hidden") === "false",
      );
      const next = current + 1;
      setActiveSlide(
        themeSettingEnabled(sectionSettings.infinite_loop, true)
          ? next % slides.length
          : Math.min(next, slides.length - 1),
      );
    }, interval);
    preview.dataset.timerId = String(timerId);
  }

  if (!showArrowsHere) return;
  const arrows = document.createElement("div");
  arrows.dataset.slideshowArrows = "true";
  arrows.className =
    "pointer-events-none absolute inset-x-3 top-1/2 z-20 flex -translate-y-1/2 justify-between";
  const makeArrow = (direction: "previous" | "next") => {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute(
      "aria-label",
      `${direction === "next" ? "Next" : "Previous"} slide`,
    );
    button.className = `pointer-events-auto inline-flex size-10 items-center justify-center shadow-sm ${controlClass}`;
    button.style.color = String(sectionSettings.arrow_color || "#ffffff");
    button.style.backgroundColor = String(
      sectionSettings.arrow_background || "#222222",
    );
    button.textContent = direction === "next" ? "›" : "‹";
    button.addEventListener("click", () => {
      const current = slides.findIndex(
        (slide) => slide.getAttribute("aria-hidden") === "false",
      );
      const delta = direction === "next" ? 1 : -1;
      const next = current + delta;
      const infinite = themeSettingEnabled(sectionSettings.infinite_loop, true);
      setActiveSlide(
        infinite
          ? (next + slides.length) % slides.length
          : Math.max(0, Math.min(slides.length - 1, next)),
      );
    });
    return button;
  };
  arrows.append(makeArrow("previous"), makeArrow("next"));
  viewport.append(arrows);
}

function syncFeaturedCollectionPreview(node: HTMLElement, entry: SectionEntry) {
  const section = node.querySelector<HTMLElement>("[data-featured-collection]");
  if (!section) return;

  const settings = entry.settings || {};
  const blocks = (entry.blocks || {}) as Record<
    string,
    {
      type?: string;
      settings?: Record<string, unknown>;
      disabled?: unknown;
      parent_id?: string;
    }
  >;
  const allBlocks = Object.entries(blocks).map(([id, block]) => ({
    id,
    block,
  }));
  const blockFor = (type: string) =>
    allBlocks.find(
      ({ block }) =>
        block.type === type ||
        (type === "header" && block.type === "collection_header"),
    )?.block;
  const blockSettings = (type: string) => blockFor(type)?.settings || {};
  const cssColor = (value: unknown, role: "background" | "text") =>
    typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value)
      ? value
      : value === "palette"
        ? role === "background"
          ? "var(--marketplace-surface-warm)"
          : "var(--marketplace-foreground)"
        : "";
  const px = (value: unknown, fallback = 0, max = 120) =>
    `${Math.max(0, Math.min(max, Number(value) || fallback))}px`;

  section.style.backgroundColor = cssColor(
    settings.background_color,
    "background",
  );
  section.style.paddingTop = px(settings.padding_top, 48);
  section.style.paddingBottom = px(settings.padding_bottom, 48);
  section.style.color = cssColor(settings.theme_text_color, "text");
  const content = section.firstElementChild as HTMLElement | null;
  if (content) {
    content.style.maxWidth =
      settings.width === "full" || settings.section_width === "full"
        ? "none"
        : "var(--marketplace-page-width, 1200px)";
    content.style.marginInline =
      settings.alignment === "center"
        ? "auto"
        : settings.alignment === "right"
          ? "0 0 0 auto"
          : "0 auto";
  }

  const isCarousel = settings.type === "carousel";
  const list = section.querySelector<HTMLElement>(
    ".featured-collection-grid, .featured-collection-carousel",
  );
  if (list) {
    list.classList.toggle("featured-collection-carousel", isCarousel);
    list.classList.toggle("featured-collection-grid", !isCarousel);
    list.classList.toggle(
      "featured-mobile-carousel",
      isCarousel && themeSettingEnabled(settings.carousel_on_mobile),
    );
    list.style.setProperty(
      "--featured-columns",
      String(Math.max(2, Math.min(6, Number(settings.columns) || 4))),
    );
    list.style.setProperty(
      "--featured-mobile-columns",
      settings.mobile_columns === "2" ? "2" : "1",
    );
    list.style.setProperty(
      "--featured-column-gap",
      px(settings.horizontal_gap, 0),
    );
    list.style.setProperty("--featured-row-gap", px(settings.vertical_gap, 24));
    list.style.columnGap = px(settings.horizontal_gap, 0);
    list.style.rowGap = px(settings.vertical_gap, 24);
    list.style.gridAutoFlow = isCarousel ? "column" : "row";
    list.style.gridAutoColumns = isCarousel ? "minmax(190px, 1fr)" : "";
    list.style.overflowX = isCarousel ? "auto" : "";
    list.style.scrollSnapType = isCarousel ? "x mandatory" : "";
    list.style.gridTemplateColumns = isCarousel
      ? ""
      : `repeat(${window.innerWidth < 768 ? (settings.mobile_columns === "2" ? 2 : 1) : Math.max(2, Math.min(6, Number(settings.columns) || 4))}, minmax(0, 1fr))`;
    list.style.display = themeSettingEnabled(settings.product_cards, true)
      ? "grid"
      : "none";
    const count = Math.max(
      1,
      Math.min(50, Number(settings.product_count) || list.children.length),
    );
    Array.from(list.children).forEach((card, index) => {
      (card as HTMLElement).style.display = index < count ? "" : "none";
    });
  }

  const header = section.querySelector<HTMLElement>(
    ".featured-collection-header",
  );
  if (header) {
    const headerSettings = blockSettings("header");
    header.style.flexDirection =
      headerSettings.direction === "vertical" ? "column" : "row";
    header.style.gap = px(headerSettings.gap, 12);
    header.style.marginBottom = px(settings.gap, 28);
    header.style.justifyContent =
      settings.alignment === "center" || headerSettings.alignment === "center"
        ? "center"
        : settings.alignment === "right" || headerSettings.alignment === "right"
          ? "flex-end"
          : headerSettings.alignment === "space_between"
            ? "space-between"
            : "flex-start";
    header.style.backgroundColor = cssColor(
      headerSettings.background_color,
      "background",
    );
    for (const side of ["top", "bottom", "left", "right"] as const) {
      const key = `padding_${side}`;
      header.style.setProperty(`padding-${side}`, px(headerSettings[key]));
    }
  }

  const titleSettings = blockSettings("collection_title");
  const title = section.querySelector<HTMLElement>(
    "[data-theme-block-id] h1, [data-theme-block-id] h2, [data-theme-block-id] h3, .featured-collection-header h1, .featured-collection-header h2, .featured-collection-header h3",
  );
  if (title) {
    const text = String(titleSettings.text ?? title.textContent ?? "").trim();
    if (text) title.textContent = text;
    title.style.color = cssColor(titleSettings.text_color, "text");
    title.style.backgroundColor = themeSettingEnabled(
      titleSettings.background_enabled,
    )
      ? cssColor(titleSettings.background_color, "background")
      : "";
    title.style.width = titleSettings.width === "fill" ? "100%" : "fit-content";
    for (const side of ["top", "bottom", "left", "right"] as const)
      title.style.setProperty(
        `padding-${side}`,
        px(titleSettings[`padding_${side}`]),
      );
  }

  const viewButton = section.querySelector<HTMLAnchorElement>(
    "[data-theme-block-id] a[data-slot='button'], .featured-collection-header a[data-slot='button']",
  );
  const viewSettings = blockSettings("view_all_button");
  if (viewButton) {
    if (typeof viewSettings.label === "string")
      viewButton.textContent = viewSettings.label;
    viewButton.style.display = themeSettingEnabled(
      blockFor("view_all_button")?.disabled,
    )
      ? "none"
      : "";
    viewButton.target = themeSettingEnabled(viewSettings.open_in_new_tab)
      ? "_blank"
      : "";
  }

  const navigation = section.querySelector<HTMLElement>(
    "[data-theme-carousel-navigation]",
  );
  if (navigation) navigation.style.display = isCarousel ? "" : "none";

  const cardSettings = blockSettings("product_card");
  section
    .querySelectorAll<HTMLElement>("[data-theme-product-card]")
    .forEach((card) => {
      card.style.backgroundColor = cssColor(
        cardSettings.background_color,
        "background",
      );
      card.style.border =
        cardSettings.border_style === "solid"
          ? "1px solid var(--marketplace-border)"
          : "";
      card.style.borderRadius = px(cardSettings.corner_radius);
      card.style.padding = `${px(cardSettings.padding_top)} ${px(cardSettings.padding_right)} ${px(cardSettings.padding_bottom)} ${px(cardSettings.padding_left)}`;
      card.style.rowGap = px(cardSettings.vertical_gap, 4);

      const applyPart = (partType: string, selector: string) => {
        const part = allBlocks.find(({ block }) => block.type === partType);
        const target = card.querySelector<HTMLElement>(selector);
        if (!target) return;
        target.style.display =
          !part || themeSettingEnabled(part.block.disabled) ? "none" : "";
        if (!part) return;
        const partSettings = part.block.settings || {};
        target.style.color = cssColor(partSettings.text_color, "text");
        target.style.backgroundColor = themeSettingEnabled(
          partSettings.background_enabled,
        )
          ? cssColor(partSettings.background_color, "background")
          : "";
        target.style.width =
          partSettings.width === "fit" ? "fit-content" : "100%";
        if (
          partSettings.alignment === "left" ||
          partSettings.alignment === "center" ||
          partSettings.alignment === "right"
        )
          target.style.textAlign = partSettings.alignment;
        for (const side of ["top", "bottom", "left", "right"] as const)
          target.style.setProperty(
            `padding-${side}`,
            px(partSettings[`padding_${side}`]),
          );
        if (partType === "media") {
          target.style.border =
            partSettings.border_style === "solid"
              ? "1px solid var(--marketplace-border)"
              : "";
          target.style.borderRadius = px(partSettings.corner_radius);
        }
        if (partType === "price") {
          const installments = card.querySelector<HTMLElement>(
            "[data-theme-product-part='price-installments']",
          );
          const tax = card.querySelector<HTMLElement>(
            "[data-theme-product-part='price-tax-information']",
          );
          if (installments)
            installments.style.display = themeSettingEnabled(
              partSettings.installments,
            )
              ? ""
              : "none";
          if (tax)
            tax.style.display = themeSettingEnabled(
              partSettings.tax_information,
            )
              ? ""
              : "none";
        }
        if (partType === "buy_buttons") {
          const quickAdd = card.querySelector<HTMLElement>(
            "[data-theme-product-part='buy_buttons']",
          );
          if (quickAdd)
            quickAdd.style.display = themeSettingEnabled(partSettings.quick_add)
              ? ""
              : "none";
        }
      };
      applyPart("media", "[data-theme-product-part='media']");
      applyPart("product_title", "[data-theme-product-part='product_title']");
      applyPart("price", "[data-theme-product-part='price']");
      applyPart("review_stars", "[data-theme-product-part='review_stars']");
      applyPart("sku", "[data-theme-product-part='sku']");
      applyPart("swatches", "[data-theme-product-part='swatches']");
      applyPart("buy_buttons", "[data-theme-product-part='buy_buttons']");
    });
}

function syncLimitedRailPreview(node: HTMLElement, entry: SectionEntry) {
  if (
    ![
      "product_rail",
      "shop_rail",
      "category_tiles",
      "collection_tiles",
    ].includes(entry.type)
  )
    return;
  const settings = entry.settings || {};
  const count = Math.max(1, Math.min(24, Number(settings.limit) || 8));
  const slides = [...node.querySelectorAll<HTMLElement>(".swiper-slide")];
  const items = slides.length
    ? slides
    : [
        ...node.querySelectorAll<HTMLElement>(
          "[data-theme-section-content] > div:last-child > *",
        ),
      ];
  items.forEach((item, index) => {
    item.style.display = index < count ? "" : "none";
  });
  if (entry.type !== "product_rail" || typeof settings.layout !== "string")
    return;
  const carousel = node.querySelector<HTMLElement>(
    "[data-theme-carousel-navigation]",
  );
  if (!carousel) return;
  const isGrid = settings.layout === "grid";
  carousel
    .querySelectorAll<HTMLElement>(":scope > button")
    .forEach((button) => {
      button.style.display = isGrid ? "none" : "";
    });
  const wrapper = carousel.querySelector<HTMLElement>(".swiper-wrapper");
  if (wrapper) {
    if (isGrid) {
      wrapper.style.setProperty("display", "grid", "important");
      wrapper.style.gridTemplateColumns = "repeat(4, minmax(0, 1fr))";
      wrapper.style.setProperty("transform", "none", "important");
      wrapper.style.gap = "16px";
      wrapper.style.width = "100%";
    } else {
      wrapper.style.removeProperty("display");
      wrapper.style.gridTemplateColumns = "";
      wrapper.style.removeProperty("transform");
      wrapper.style.gap = "";
      wrapper.style.width = "";
    }
  }
  const viewAll = node.querySelector<HTMLElement>(
    "[data-theme-section-header] a",
  );
  if (viewAll) viewAll.style.display = isGrid ? "none" : "";
  const swiperHost = carousel.querySelector<
    HTMLElement & { swiper?: { update: () => void } }
  >(".swiper");
  swiperHost?.swiper?.update();
}

function syncCollectionCategoryCardsPreview(
  node: HTMLElement,
  entry: SectionEntry,
) {
  const isCategory = entry.type === "category_tiles";
  if (!isCategory && entry.type !== "collection_tiles") return;

  const blockType = isCategory ? "category_card" : "collection_card";
  const blocks = (entry.blocks || {}) as Record<
    string,
    {
      type?: string;
      parent_id?: string;
      disabled?: boolean;
      settings?: Record<string, unknown>;
    }
  >;
  const cards = (entry.block_order || Object.keys(blocks))
    .map((id) => ({ id, block: blocks[id] }))
    .filter(
      ({ block }) =>
        block?.type === blockType &&
        !block.parent_id &&
        !themeSettingEnabled(block.disabled),
    );
  if (!cards.length) return;

  const placeholder = Array.from(
    node.querySelectorAll<HTMLElement>("div"),
  ).find(
    (element) =>
      element.children.length === 0 &&
      element.textContent?.includes("No items are selected yet"),
  );
  const host =
    node.querySelector<HTMLElement>("[data-theme-section-content]") ||
    placeholder?.parentElement ||
    node;
  let preview =
    host.querySelector<HTMLElement>("[data-collection-card-grid]") ||
    host.querySelector<HTMLElement>("[data-theme-tile-block-preview]");
  if (!preview) {
    preview = document.createElement("div");
    preview.className = "grid grid-cols-2 gap-4 md:grid-cols-4";
    if (placeholder?.parentElement === host) placeholder.replaceWith(preview);
    else host.append(preview);
  }
  preview.dataset.themeTileBlockPreview = "true";

  preview.replaceChildren();
  for (const { id, block } of cards) {
    const settings = block.settings || {};
    const title = String(settings.title || "").trim();
    const description = String(settings.description || "").trim();
    const label = String(settings.button_label || "").trim();
    const href = safePreviewUrl(settings.link) || "#";
    const imageUrl = safePreviewUrl(
      settings.card_image_url || settings.image_url,
    );
    const anchor = document.createElement("a");
    anchor.dataset.themeTileBlockId = id;
    anchor.href = href;
    anchor.className = "group block min-w-0 text-inherit no-underline";
    const image = document.createElement("div");
    image.className =
      "relative aspect-[4/3] overflow-hidden rounded-md bg-marketplace-surface-warm";
    if (imageUrl) {
      const img = document.createElement("img");
      img.src = imageUrl;
      img.alt = title;
      img.className = "h-full w-full object-cover";
      image.append(img);
    }
    const titleNode = document.createElement("p");
    titleNode.className = "mt-2 font-medium";
    titleNode.textContent = title || (isCategory ? "Category" : "Collection");
    anchor.append(image, titleNode);
    if (description) {
      const descriptionNode = document.createElement("p");
      descriptionNode.className =
        "mt-1 text-sm text-marketplace-muted-foreground";
      descriptionNode.textContent = description;
      anchor.append(descriptionNode);
    }
    if (label) {
      const buttonLabel = document.createElement("span");
      buttonLabel.className = "mt-2 inline-block text-sm underline";
      buttonLabel.textContent = label;
      anchor.append(buttonLabel);
    }
    preview.append(anchor);
  }
}

function syncSectionFramePreview(node: HTMLElement, entry: SectionEntry) {
  const frame = node.querySelector<HTMLElement>("[data-theme-section-frame]");
  if (!frame) return;
  const content = frame.querySelector<HTMLElement>(
    "[data-theme-section-content]",
  );
  const settings = entry.settings || {};
  const background = settings.background_color;
  const text = settings.text_color;
  if (typeof background === "string" && /^#[0-9a-fA-F]{6}$/.test(background))
    frame.style.backgroundColor = background;
  else if (background === "palette")
    frame.style.backgroundColor = "var(--marketplace-surface-warm)";
  if (!content) return;
  if (typeof settings.padding_top === "number") {
    const top = Math.max(0, Math.min(120, settings.padding_top));
    content.style.paddingTop = `calc(${top}px * var(--cms-section-spacing-scale, 1))`;
  }
  if (typeof settings.padding_bottom === "number") {
    const bottom = Math.max(0, Math.min(120, settings.padding_bottom));
    content.style.paddingBottom = `calc(${bottom}px * var(--cms-section-spacing-scale, 1))`;
  }
  if (typeof text === "string" && /^#[0-9a-fA-F]{6}$/.test(text))
    content.style.color = text;
  else if (text === "palette")
    content.style.color = "var(--marketplace-foreground)";
  if (typeof settings.gap === "number")
    content.style.gap = `${Math.max(0, Math.min(120, settings.gap))}px`;
  if (settings.width === "full" || settings.section_width === "full")
    content.style.maxWidth = "none";
  else if (settings.width === "page" || settings.section_width === "page")
    content.style.maxWidth = "";
}

function syncSectionImagePreview(node: HTMLElement, entry: SectionEntry) {
  const settings = entry.settings || {};
  const rawSources =
    settings.image_urls ?? settings.slide_image_urls ?? settings.images;
  const sources = Array.isArray(rawSources)
    ? rawSources.map(safePreviewUrl).filter(Boolean)
    : [];
  if (!sources.length) {
    const single = safePreviewUrl(settings.image_url);
    if (single) sources.push(single);
  }
  let gallery = node.querySelector<HTMLElement>("[data-theme-image-layout]");
  const imageSectionTypes = [
    "image_carousel",
    "image_gallery",
    "image_masonry",
    "instagram_feed",
    "scrolling_images",
    "slideshow",
  ];
  if (!gallery && sources.length && imageSectionTypes.includes(entry.type)) {
    const section = node.querySelector<HTMLElement>("section") || node;
    gallery = document.createElement("div");
    gallery.dataset.themeImageLayout = String(
      settings.layout ||
        (entry.type === "image_carousel" ||
        entry.type === "scrolling_images" ||
        entry.type === "slideshow"
          ? "carousel"
          : entry.type === "image_masonry"
            ? "masonry"
            : "grid"),
    );
    gallery.className = "grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4";
    section.append(gallery);
    node.querySelector("[data-theme-section-body]")?.remove();
  }
  if (gallery) {
    gallery.hidden = sources.length === 0;
    const images = Array.from(
      gallery.querySelectorAll<HTMLImageElement>("img"),
    );
    const template = images[0];
    for (const [index, source] of sources.entries()) {
      let image = images[index];
      if (!image) {
        image = template
          ? (template.cloneNode(false) as HTMLImageElement)
          : document.createElement("img");
        image.className = "min-w-0 rounded-md object-cover";
        image.alt = `${String(settings.heading || "Store image")} ${index + 1}`;
        gallery.append(image);
      }
      if (!image) continue;
      image.src = source;
      image.hidden = false;
    }
    for (const image of images.slice(sources.length)) image.remove();
    const defaultLayout =
      entry.type === "image_carousel" ||
      entry.type === "scrolling_images" ||
      entry.type === "slideshow"
        ? "carousel"
        : entry.type === "image_masonry"
          ? "masonry"
          : "grid";
    const layout = String(settings.layout || defaultLayout);
    if (layout) {
      const carousel = layout === "carousel";
      const masonry = layout === "masonry";
      const slideshow = entry.type === "slideshow";
      gallery.dataset.themeImageLayout = layout;
      gallery.classList.toggle("flex", carousel);
      gallery.classList.toggle("overflow-x-auto", carousel);
      gallery.classList.toggle("snap-x", carousel);
      gallery.classList.toggle("columns-2", masonry);
      gallery.classList.toggle("grid", !carousel && !masonry);
      gallery.classList.toggle("grid-cols-2", !carousel && !masonry);
      gallery.classList.toggle("md:grid-cols-3", !carousel && !masonry);
      gallery.classList.toggle("lg:grid-cols-4", !carousel && !masonry);
      gallery.style.gap = `${Math.max(0, Number(settings.gap ?? 12))}px`;
      if (masonry)
        gallery.style.columnGap = `${Math.max(0, Number(settings.gap ?? 12))}px`;
      gallery.querySelectorAll<HTMLImageElement>("img").forEach((image) => {
        image.classList.toggle("w-64", carousel && !slideshow);
        image.classList.toggle("w-full", !carousel || slideshow);
        image.classList.toggle("shrink-0", carousel);
        image.classList.toggle("snap-start", carousel);
      });
    }
    const ratios: Record<string, string> = {
      square: "1 / 1",
      portrait: "4 / 5",
      landscape: "3 / 2",
    };
    const ratio = ratios[String(settings.image_ratio || "")];
    gallery.querySelectorAll<HTMLImageElement>("img").forEach((image) => {
      image.style.aspectRatio = ratio || "";
    });
  }

  if (entry.type === "image_comparison") {
    const before = safePreviewUrl(settings.before_image_url);
    const after = safePreviewUrl(settings.after_image_url);
    const beforeImage = node.querySelector<HTMLImageElement>(
      "[data-theme-comparison-before]",
    );
    const afterImage = node.querySelector<HTMLImageElement>(
      "[data-theme-comparison-after]",
    );
    const comparison = node.querySelector<HTMLElement>(
      "[data-theme-comparison]",
    );
    if (comparison) comparison.hidden = !before || !after;
    if (beforeImage) {
      if (before) beforeImage.src = before;
      else beforeImage.removeAttribute("src");
    }
    if (afterImage) {
      if (after) afterImage.src = after;
      else afterImage.removeAttribute("src");
    }
  }
}

function applySectionSettings(node: HTMLElement, entry: SectionEntry) {
  if (entry.type === "product") {
    const settings = entry.settings || {};
    const productLayout = node.querySelector<HTMLElement>(
      ".product-theme-grid",
    );
    if (productLayout) {
      const mediaWidth = Number(settings.media_width);
      if (Number.isFinite(mediaWidth)) {
        productLayout.style.setProperty(
          "--product-media-width",
          `${Math.max(35, Math.min(75, mediaWidth))}%`,
        );
      }
    }
  }

  if (entry.type === "theme_header") {
    const colorValue = (value: unknown, role: "background" | "text") =>
      typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value)
        ? value
        : value === "palette"
          ? role === "background"
            ? "var(--marketplace-surface-warm)"
            : "var(--marketplace-foreground)"
          : "";
    const fontFamily = (value: unknown) =>
      value === "heading"
        ? "var(--font-display), serif"
        : value === "subheading"
          ? "var(--font-display), sans-serif"
          : value === "body"
            ? "var(--font-sans), sans-serif"
            : "";
    const header = node.querySelector<HTMLElement>("[data-theme-header]");
    if (header) {
      const settings = entry.settings || {};
      const headerLayout = [
        "inline",
        "big_search",
        "menu_bottom",
        "hamburger",
      ].includes(String(settings.header_style))
        ? String(settings.header_style)
        : "inline";
      header.dataset.headerStyle = headerLayout;
      for (const [setting, attribute] of Object.entries({
        logo_position: "data-logo-position",
        menu_position: "data-menu-position",
        menu_row: "data-menu-row",
        search_position: "data-search-position",
        search_row: "data-search-row",
        account_position: "data-account-position",
        account_row: "data-account-row",
        menu_style: "data-menu-style",
      })) {
        if (typeof settings[setting] === "string")
          header.setAttribute(attribute, settings[setting] as string);
      }
      const sticky =
        settings.sticky_behavior === "never"
          ? false
          : themeSettingEnabled(settings.sticky, true);
      header.dataset.stickyEnabled = sticky ? "true" : "false";
      header.dataset.stickyBehavior = String(
        settings.sticky_behavior || (sticky ? "always" : "never"),
      );
      const row = header.querySelector<HTMLElement>("[data-theme-header-main]");
      const categoryRow = header.querySelector<HTMLElement>(
        "[data-theme-category-row]",
      );
      if (row && categoryRow) {
        if (headerLayout !== "menu_bottom" && settings.menu_row === "top")
          row.before(categoryRow);
        else row.after(categoryRow);
      }
      const mobileMenu = header.querySelector<HTMLElement>(
        "[data-theme-header-mobile-menu]",
      );
      if (mobileMenu) {
        mobileMenu.classList.toggle("flex", headerLayout === "hamburger");
        mobileMenu.classList.toggle("md:hidden", headerLayout !== "hamburger");
      }
      const width =
        settings.section_width === "page"
          ? "var(--marketplace-page-width, 1200px)"
          : "none";
      for (const element of header.querySelectorAll<HTMLElement>(".mx-auto"))
        element.style.maxWidth = width;
      if (row)
        row.style.borderBottomWidth = `${Math.max(0, Math.min(8, Number(settings.divider_thickness ?? 0)))}px`;
      if (categoryRow)
        categoryRow.style.display =
          !themeSettingEnabled(settings.show_category_row, true) ||
          headerLayout === "hamburger"
            ? "none"
            : "";
      const top = header.querySelector<HTMLElement>(
        "[data-theme-header-top-row]",
      );
      if (top) {
        top.style.display = themeSettingEnabled(
          settings.top_header_enabled,
          true,
        )
          ? ""
          : "none";
        const promoText = top.querySelector<HTMLElement>("p");
        if (promoText && typeof settings.promo_text === "string") {
          if (!promoText.dataset.themeDefaultText)
            promoText.dataset.themeDefaultText = promoText.textContent || "";
          promoText.textContent =
            settings.promo_text.trim() || promoText.dataset.themeDefaultText;
        }
      }
      const topBackground = settings.top_row_background_color;
      const topText = settings.top_row_text_color;
      if (top) {
        top.style.backgroundColor = colorValue(topBackground, "background");
        top.style.color = colorValue(topText, "text");
      }
      const countrySelector = header.querySelector<HTMLElement>(
        "[data-theme-country-selector]",
      );
      if (countrySelector)
        countrySelector.style.display = themeSettingEnabled(
          settings.country_region_selector,
          true,
        )
          ? ""
          : "none";
      const languageSelector = header.querySelector<HTMLElement>(
        "[data-theme-language-selector]",
      );
      if (languageSelector)
        languageSelector.style.display = themeSettingEnabled(
          settings.language_selector,
          false,
        )
          ? ""
          : "none";
      const searchVisible = themeSettingEnabled(settings.search_enabled, true);
      const searchOnBottom =
        settings.search_row === "bottom" || headerLayout === "big_search";
      const searchOrder = settings.search_position === "left" ? "1" : "3";
      const searchContainer = header.querySelector<HTMLElement>(
        "[data-theme-header-search]",
      );
      if (searchContainer) {
        searchContainer.style.order = searchOnBottom ? "6" : searchOrder;
        searchContainer.style.flexBasis = searchOnBottom ? "100%" : "";
      }
      const headerInner = row?.querySelector<HTMLElement>(".mx-auto.flex");
      if (headerInner) {
        headerInner.style.flexWrap =
          searchOnBottom ||
          settings.account_row === "bottom" ||
          headerLayout === "big_search"
            ? "wrap"
            : "";
        const compactHeader = settings.height === "compact";
        const headerPadding = compactHeader ? "4px" : "14px";
        headerInner.style.paddingTop = headerPadding;
        headerInner.style.paddingBottom = headerPadding;
      }
      const actions = header.querySelector<HTMLElement>(
        "[data-theme-header-actions]",
      );
      if (actions) {
        const accountOnBottom = settings.account_row === "bottom";
        const accountOnLeft = settings.account_position === "left";
        actions.style.order = accountOnBottom ? "7" : accountOnLeft ? "1" : "5";
        actions.style.flexBasis = accountOnBottom ? "100%" : "";
        actions.style.display = accountOnBottom ? "flex" : "";
        actions.style.marginLeft =
          accountOnBottom || accountOnLeft ? "0" : "auto";
        actions.style.justifyContent = accountOnLeft
          ? "flex-start"
          : "flex-end";
      }
      for (const selector of [
        "[data-theme-header-search]",
        "[data-theme-header-mobile-search]",
      ]) {
        const search = header.querySelector<HTMLElement>(selector);
        if (search)
          search.style.display =
            searchVisible &&
            !(
              selector === "[data-theme-header-mobile-search]" &&
              headerLayout === "big_search"
            )
              ? ""
              : "none";
      }
      const showAccount = themeSettingEnabled(settings.customer_account, true);
      header
        .querySelectorAll<HTMLElement>("[data-theme-header-account]")
        .forEach((account) => {
          account.style.display = showAccount ? "" : "none";
        });
      const blocks = Object.values(entry.blocks || {}) as Array<{
        type?: string;
        settings?: Record<string, unknown>;
      }>;
      const logoSettings =
        blocks.find((block) => block.type === "header_logo")?.settings || {};
      const logo = header.querySelector<HTMLElement>(
        "[data-theme-header-logo]",
      );
      if (logo) {
        logo.style.display =
          themeSettingEnabled(logoSettings.hide_on_home_page) && !sticky
            ? "none"
            : "";
        logo.style.paddingTop = `${Math.max(0, Math.min(80, Number(logoSettings.desktop_padding_top ?? 0)))}px`;
        logo.style.paddingBottom = `${Math.max(0, Math.min(80, Number(logoSettings.desktop_padding_bottom ?? 0)))}px`;
        const logoPosition = settings.logo_position;
        logo.style.order =
          logoPosition === "center"
            ? "2"
            : logoPosition === "right"
              ? "4"
              : "0";
        logo.style.marginInline = logoPosition === "center" ? "auto" : "";
        const brandLogo = logo.querySelector<HTMLElement>(
          "[data-theme-brand-logo]",
        );
        const logoImage = brandLogo?.querySelector<HTMLImageElement>(
          "[data-theme-brand-logo-image]",
        );
        const logoText = brandLogo?.querySelector<HTMLElement>(
          "[data-theme-brand-logo-text]",
        );
        const logoUrl =
          typeof logoSettings.logo_image_url === "string"
            ? logoSettings.logo_image_url
            : "";
        if (logoImage) {
          if (logoUrl && logoImage.src !== logoUrl) logoImage.src = logoUrl;
          logoImage.alt =
            typeof logoSettings.logo_image_alt === "string" &&
            logoSettings.logo_image_alt
              ? logoSettings.logo_image_alt
              : "Store logo";
          logoImage.style.display = logoUrl ? "" : "none";
        }
        if (logoText) logoText.style.display = logoUrl ? "none" : "";
      }
      const menuSettings =
        blocks.find((block) => block.type === "header_menu")?.settings || {};
      const background = menuSettings.background_color;
      const text = menuSettings.text_color;
      const menuTextColor = colorValue(text, "text");
      const headerTextColor = colorValue(settings.text_color, "text");
      header.style.backgroundColor = colorValue(background, "background");
      header.style.color = menuTextColor || headerTextColor;
      header.style.fontSize =
        typeof settings.size === "string" &&
        /^(12|14|16|18|20)px$/.test(settings.size)
          ? settings.size
          : "14px";
      header.style.fontFamily = fontFamily(settings.font);
      header.style.textTransform =
        menuSettings.text_case === "uppercase" ? "uppercase" : "";
      if (categoryRow) {
        categoryRow.style.color = menuTextColor || headerTextColor;
        categoryRow.style.fontSize =
          typeof menuSettings.top_level_size === "string" &&
          /^(12|14|16|18|20)px$/.test(menuSettings.top_level_size)
            ? menuSettings.top_level_size
            : "";
        categoryRow.style.fontFamily = fontFamily(menuSettings.font);
      }
      const contextKind =
        node.dataset.themeContextKind ||
        node.querySelector<HTMLElement>("[data-theme-context-kind]")?.dataset
          .themeContextKind;
      const transparent =
        (contextKind === "home" &&
          themeSettingEnabled(settings.transparent_home)) ||
        (contextKind === "product" &&
          themeSettingEnabled(settings.transparent_product)) ||
        ((contextKind === "collection" || contextKind === "category") &&
          themeSettingEnabled(settings.transparent_collection));
      header.dataset.transparent = transparent ? "true" : "false";
      header.classList.toggle("absolute", transparent);
      header.classList.toggle("inset-x-0", transparent);
      header.classList.toggle("relative", !transparent);
      header.classList.toggle("bg-white", !transparent);
      const stickyWrapper = header.closest<HTMLElement>(
        "[data-theme-scroll-up-header]",
      );
      if (stickyWrapper) {
        stickyWrapper.classList.toggle("sticky", sticky && !transparent);
        stickyWrapper.classList.toggle("relative", !sticky || transparent);
      }
      if (transparent) header.style.backgroundColor = "transparent";
      const logoTextColor = colorValue(settings.logo_color, "text");
      const brand = header.querySelector<HTMLElement>(
        "[data-theme-brand-logo]",
      );
      if (brand) brand.style.color = logoTextColor;
      const cssInput =
        typeof settings.custom_css === "string" ? settings.custom_css : "";
      const cssNodeId = `theme-builder-css-${node.dataset.themeSectionId || "header"}`;
      let cssNode = document.getElementById(
        cssNodeId,
      ) as HTMLStyleElement | null;
      const safeCss =
        /@import|url\s*\(|expression\s*\(|<\/style|javascript:/i.test(cssInput)
          ? ""
          : cssInput.replace(
              /([^{}]+)\{([^{}]*)\}/g,
              (_rule, selectors: string, declarations: string) => {
                if (selectors.trim().startsWith("@")) return "";
                return `${selectors
                  .split(",")
                  .map((selector) => `#${node.id} ${selector.trim()}`)
                  .join(", ")} {${declarations}}`;
              },
            );
      if (safeCss) {
        if (!cssNode) {
          cssNode = document.createElement("style");
          cssNode.id = cssNodeId;
          document.head.append(cssNode);
        }
        cssNode.textContent = safeCss;
      } else cssNode?.remove();
    }
  }

  if (entry.type === "theme_footer") {
    const footer = node.querySelector<HTMLElement>("[data-theme-footer]");
    if (footer) {
      const settings = entry.settings || {};
      const content = footer.querySelector<HTMLElement>(
        "[data-theme-footer-content]",
      );
      const layout = footer.querySelector<HTMLElement>(
        "[data-theme-footer-layout]",
      );
      const schemes: Record<string, { background: string; text: string }> = {
        "scheme-1": { background: "#ffffff", text: "#242027" },
        "scheme-2": { background: "#f6f1e8", text: "#6c315d" },
        "scheme-3": { background: "#e8f4ef", text: "#173b32" },
        "scheme-4": { background: "#f0f3fa", text: "#24365f" },
        "scheme-5": { background: "#fff5e8", text: "#804a19" },
      };
      const palette =
        schemes[String(settings.color_scheme || "scheme-1")] ||
        schemes["scheme-1"];
      const background = settings.background_color;
      const textColor = settings.text_color;
      footer.style.backgroundColor =
        typeof background === "string" && /^#[0-9a-fA-F]{6}$/.test(background)
          ? background
          : palette.background;
      footer.style.color =
        typeof textColor === "string" && /^#[0-9a-fA-F]{6}$/.test(textColor)
          ? textColor
          : palette.text;
      footer.style.setProperty("--marketplace-foreground", footer.style.color);
      footer.style.setProperty(
        "--marketplace-muted-foreground",
        `color-mix(in srgb, ${footer.style.color} 68%, transparent)`,
      );
      footer.style.setProperty(
        "--marketplace-border",
        `color-mix(in srgb, ${footer.style.color} 18%, transparent)`,
      );
      footer.style.setProperty(
        "--marketplace-border-subtle",
        `color-mix(in srgb, ${footer.style.color} 10%, transparent)`,
      );
      footer.style.setProperty(
        "--footer-pad-bottom",
        `${Math.max(0, Math.min(120, Number(settings.padding_bottom ?? 48)))}px`,
      );
      const spotlight = footer.querySelector<HTMLElement>(
        "[data-theme-footer-spotlight]",
      );
      if (spotlight) {
        const color = (value: unknown, fallback: string) =>
          typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value)
            ? value
            : fallback;
        const visible = settings.footer_spotlight_enabled !== false;
        spotlight.style.display = visible ? "" : "none";
        spotlight.style.backgroundColor = color(
          settings.footer_spotlight_background_color,
          "#c2522b",
        );
        spotlight.style.color = color(
          settings.footer_spotlight_text_color,
          "#fffaf6",
        );
        const spotlightContent =
          spotlight.firstElementChild as HTMLElement | null;
        if (spotlightContent) {
          spotlightContent.style.maxWidth =
            settings.section_width === "full"
              ? "none"
              : "var(--marketplace-page-width, 1200px)";
        }
        for (const accent of footer.querySelectorAll<HTMLElement>(
          "[data-theme-footer-accent]",
        )) {
          accent.style.backgroundColor = spotlight.style.backgroundColor;
        }
        const spotlightTitle = spotlight.querySelector<HTMLElement>(
          "[data-theme-footer-spotlight-title]",
        );
        if (
          spotlightTitle &&
          String(settings.footer_spotlight_text ?? "").trim()
        )
          spotlightTitle.textContent = String(
            settings.footer_spotlight_text,
          ).trim();
        const spotlightLink = spotlight.querySelector<HTMLAnchorElement>(
          "[data-theme-footer-spotlight-link]",
        );
        if (spotlightLink) {
          if (String(settings.footer_spotlight_link_label ?? "").trim())
            spotlightLink.childNodes[0].textContent = String(
              settings.footer_spotlight_link_label,
            ).trim();
          const href = String(settings.footer_spotlight_link || "/products");
          const basePath = footer.dataset.themeBasePath || "";
          spotlightLink.href = /^(https?:|mailto:|tel:)/i.test(href)
            ? href
            : `${basePath}${href.startsWith("/") ? href : `/${href}`}`;
          spotlightLink.style.backgroundColor = color(
            settings.footer_spotlight_button_background_color,
            "#251e24",
          );
          spotlightLink.style.color = color(
            settings.footer_spotlight_button_text_color,
            "#ffffff",
          );
        }
      }
      if (content) {
        content.style.maxWidth =
          settings.section_width === "full"
            ? "none"
            : "var(--marketplace-page-width, 1200px)";
        content.style.paddingTop = `${Math.max(0, Math.min(120, Number(settings.padding_top ?? 48)))}px`;
        content.style.paddingBottom = "0px";
      }
      if (layout) {
        const gap = Math.max(0, Math.min(80, Number(settings.gap ?? 24)));
        layout.style.columnGap = `${gap}px`;
        layout.style.rowGap = `${gap}px`;
        const existingBrandTitle =
          footer
            .querySelector<HTMLElement>("[data-theme-footer-brand-title]")
            ?.textContent?.trim() || "My Store";
        const existingBrandDescription =
          footer
            .querySelector<HTMLElement>("[data-theme-footer-brand-description]")
            ?.textContent?.trim() || "";
        const region = footer
          .querySelector<HTMLElement>("[data-theme-footer-region]")
          ?.cloneNode(true) as HTMLElement | undefined;
        const isLegacyFooterCopyright = (
          block:
            | { type?: string; settings?: Record<string, unknown> }
            | undefined,
        ) =>
          block?.type === "footer_text" &&
          /\{\{year\}\}|©|all rights reserved|rights reserved/i.test(
            String(block.settings?.text ?? ""),
          );
        const blocks = entry.blocks || {};
        const order = entry.block_order || Object.keys(blocks);
        const copyrightBlock = order
          .map((id) => ({
            id,
            block: blocks[id] as
              | {
                  type?: string;
                  settings?: Record<string, unknown>;
                  disabled?: boolean;
                }
              | undefined,
          }))
          .find(
            (item) =>
              item.block?.type === "footer_copyright" ||
              isLegacyFooterCopyright(item.block),
          );
        const paymentIconsBlocks = order.flatMap((id) => {
          const block = blocks[id] as
            | {
                type?: string;
                settings?: Record<string, unknown>;
                disabled?: boolean;
              }
            | undefined;
          return block?.type === "footer_payment_icons" && !block.disabled
            ? [{ id, block }]
            : [];
        });
        layout.replaceChildren();
        for (const id of order) {
          const block = blocks[id] as
            | {
                type?: string;
                settings?: Record<string, unknown>;
                disabled?: boolean;
              }
            | undefined;
          if (
            !block ||
            block.disabled ||
            block.type === "footer_copyright" ||
            block.type === "footer_payment_icons" ||
            isLegacyFooterCopyright(block)
          )
            continue;
          const values = block.settings || {};
          const element = document.createElement("div");
          element.dataset.themeFooterBlockId = id;
          element.dataset.themeFooterBlockType = block.type || "";
          if (block.type === "footer_brand") {
            element.className = "col-span-2 md:col-span-3 lg:col-span-2";
            const title = document.createElement("span");
            title.className = "text-xl font-semibold";
            title.dataset.themeFooterBrandTitle = "";
            title.textContent = String(values.title || existingBrandTitle);
            element.append(title);
            const description = String(
              values.description || existingBrandDescription,
            ).trim();
            if (description) {
              const paragraph = document.createElement("p");
              paragraph.className =
                "mt-3 max-w-sm text-sm leading-6 text-marketplace-muted-foreground";
              paragraph.dataset.themeFooterBrandDescription = "";
              paragraph.textContent = description;
              element.append(paragraph);
            }
          } else if (block.type === "footer_follow_on_shop") {
            const anchor = document.createElement("a");
            anchor.className =
              "inline-flex rounded-md border border-marketplace-border px-3 py-2 text-sm font-medium hover:bg-white";
            const href = String(values.link || "/shops");
            anchor.href =
              href.startsWith("/") || /^https:\/\//i.test(href) ? href : "#";
            anchor.textContent = String(values.title || "Follow on Shop");
            element.append(anchor);
          } else if (
            block.type === "footer_menu" ||
            block.type === "footer_social" ||
            block.type === "footer_social_links" ||
            block.type === "footer_policy_links"
          ) {
            const title = document.createElement("h2");
            title.className = "text-sm font-semibold";
            title.textContent = String(
              values.title ||
                (block.type === "footer_social" ||
                block.type === "footer_social_links"
                  ? "Follow us"
                  : block.type === "footer_policy_links"
                    ? "Policies"
                    : "Links"),
            );
            element.append(title);
            const list = document.createElement("ul");
            list.className = "mt-4 space-y-3";
            let menuLinks: Array<{ label: string; url: string }> = [];
            if (
              block.type === "footer_menu" ||
              block.type === "footer_policy_links"
            ) {
              const savedLinks = String(values.links || "");
              let parsedLinks = false;
              try {
                const parsed: unknown = JSON.parse(savedLinks);
                if (Array.isArray(parsed)) {
                  parsedLinks = true;
                  menuLinks = parsed.filter(
                    (item): item is { label: string; url: string } =>
                      Boolean(
                        item &&
                          typeof item === "object" &&
                          "label" in item &&
                          typeof item.label === "string" &&
                          "url" in item &&
                          typeof item.url === "string",
                      ),
                  );
                }
              } catch {
                /* Older themes store links as one Label|/path entry per line. */
              }
              if (!parsedLinks)
                menuLinks = savedLinks
                  .split(/\r?\n/)
                  .map((line) => {
                    const [label = "", ...url] = line.split("|");
                    return { label: label.trim(), url: url.join("|").trim() };
                  })
                  .filter((link) => link.label || link.url);
            }
            const links: Array<[string, string]> =
              block.type === "footer_menu" ||
              block.type === "footer_policy_links"
                ? menuLinks.map((link) => [link.label, link.url])
                : (
                    [
                      "instagram",
                      "facebook",
                      "pinterest",
                      "tiktok",
                      "youtube",
                    ] as const
                  )
                    .filter(
                      (key) =>
                        typeof values[key] === "string" &&
                        String(values[key]).trim(),
                    )
                    .map((key) => [
                      key[0].toUpperCase() + key.slice(1),
                      String(values[key]),
                    ]);
            for (const [label, href] of links) {
              if (!href.startsWith("/") && !/^https:\/\//i.test(href)) continue;
              const item = document.createElement("li");
              const anchor = document.createElement("a");
              anchor.href = href;
              anchor.className =
                "text-sm text-marketplace-muted-foreground transition-colors hover:text-marketplace-foreground";
              anchor.textContent = label;
              item.append(anchor);
              list.append(item);
            }
            element.append(list);
          } else if (
            block.type === "footer_contact_form" ||
            block.type === "footer_email_signup"
          ) {
            const title = document.createElement("h2");
            title.className = "text-sm font-semibold";
            title.textContent = String(
              values.title ||
                (block.type === "footer_contact_form"
                  ? "Contact us"
                  : "Subscribe to our emails"),
            );
            element.append(title);
            const description = String(values.description || "").trim();
            if (description) {
              const paragraph = document.createElement("p");
              paragraph.className =
                "mt-2 text-sm leading-6 text-marketplace-muted-foreground";
              paragraph.textContent = description;
              element.append(paragraph);
            }
            const form = document.createElement("form");
            form.className = "mt-3 space-y-2";
            if (block.type === "footer_contact_form") {
              for (const [name, type, placeholder] of [
                ["name", "text", "Name"],
                ["email", "email", "Email"],
                ["subject", "text", "Subject"],
                ["message", "text", "Message"],
              ]) {
                const input = document.createElement(
                  name === "message" ? "textarea" : "input",
                );
                input.setAttribute("name", name);
                if (name !== "message") input.setAttribute("type", type);
                if (name === "message") input.setAttribute("rows", "4");
                input.setAttribute("placeholder", placeholder);
                input.className =
                  "w-full rounded-md border border-marketplace-border bg-white px-3 py-2 text-sm text-gray-900";
                form.append(input);
              }
            } else {
              const input = document.createElement("input");
              input.name = "email";
              input.type = "email";
              input.required = true;
              input.placeholder = "Email address";
              input.className =
                "w-full rounded-md border border-marketplace-border bg-white px-3 py-2 text-sm text-gray-900";
              form.append(input);
            }
            const submit = document.createElement("button");
            submit.type = "submit";
            submit.className =
              "rounded-md bg-marketplace-brand px-3 py-2 text-sm font-medium text-white";
            submit.textContent = String(
              values.submit_label || values.button_label || "Submit",
            );
            form.append(submit);
            form.addEventListener("submit", (event) => event.preventDefault());
            element.append(form);
          } else if (block.type === "footer_text") {
            const title = String(values.title || "").trim();
            if (title) {
              const heading = document.createElement("h2");
              heading.className = "text-sm font-semibold";
              heading.textContent = title;
              element.append(heading);
            }
            const text = String(values.text || "").trim();
            if (text) {
              const paragraph = document.createElement("p");
              paragraph.className =
                "mt-3 whitespace-pre-line text-sm leading-6 text-marketplace-muted-foreground";
              paragraph.textContent = text;
              element.append(paragraph);
            }
          }
          layout.append(element);
        }
        const copyright = footer.querySelector<HTMLElement>(
          "[data-theme-footer-copyright]",
        );
        if (copyright && copyrightBlock?.block?.settings) {
          const store =
            footer.querySelector<HTMLElement>("[data-theme-footer-brand-title]")
              ?.textContent || "My Store";
          copyright.textContent = String(
            copyrightBlock.block.settings.text || "",
          )
            .replace("{{year}}", String(new Date().getFullYear()))
            .replace("{{store}}", store);
          copyright.style.display = "";
        } else if (
          copyright &&
          themeSettingEnabled(settings.footer_blocks_initialized)
        ) {
          copyright.style.display = "none";
        }
        if (copyright && settings.footer_show_copyright === false)
          copyright.style.display = "none";
        const regionSlot = footer.querySelector<HTMLElement>(
          "[data-theme-footer-region]",
        );
        if (regionSlot)
          regionSlot.style.display =
            settings.footer_show_region_selector === false ? "none" : "";
        if (region && regionSlot)
          regionSlot.replaceChildren(...Array.from(region.childNodes));
        const socialSlot = footer.querySelector<HTMLElement>(
          "[data-theme-footer-social-links]",
        );
        if (socialSlot)
          socialSlot.style.display =
            settings.footer_show_social_links === false ? "none" : "";
        const paymentIcons = footer.querySelector<HTMLElement>(
          "[data-theme-footer-payment-icons]",
        );
        if (paymentIcons) {
          paymentIcons.replaceChildren();
          paymentIcons.style.display =
            settings.footer_show_payment_icons === true &&
            paymentIconsBlocks.length
              ? "contents"
              : "none";
          for (const { id, block } of paymentIconsBlocks) {
            const blockSettings = block.settings || {};
            const title = String(blockSettings.title || "").trim();
            const group = document.createElement("div");
            group.dataset.themeFooterPaymentBlockId = id;
            group.className = "flex flex-col items-end gap-2";
            if (title) {
              const heading = document.createElement("p");
              heading.className = "text-xs text-marketplace-muted-foreground";
              heading.textContent = title;
              group.append(heading);
            }
            const methods = String(blockSettings.payment_methods || "")
              .split(/,|\r?\n/)
              .map((item) => item.trim())
              .filter(Boolean);
            const list = document.createElement("ul");
            list.setAttribute(
              "aria-label",
              title || "Accepted payment methods",
            );
            list.className = "flex flex-wrap justify-end gap-2";
            for (const method of methods) {
              const item = document.createElement("li");
              item.className =
                "flex h-8 min-w-12 items-center justify-center rounded-md border border-marketplace-border bg-white px-2 text-[11px] font-extrabold tracking-tight shadow-sm";
              item.setAttribute("aria-label", method);
              item.title = method;
              const key = method.toLowerCase().replace(/[^a-z]/g, "");
              const colors: Record<string, string> = {
                visa: "#1a1f71",
                mastercard: "#eb001b",
                americanexpress: "#006fcf",
                amex: "#006fcf",
                paypal: "#003087",
                applepay: "#111111",
                googlepay: "#4285f4",
                klarna: "#111111",
                discover: "#222222",
              };
              item.style.color = colors[key] || "#30343b";
              if (key === "mastercard") {
                const marks = document.createElement("span");
                marks.className = "flex items-center";
                const first = document.createElement("i");
                first.className = "-mr-1.5 h-4 w-4 rounded-full bg-[#eb001b]";
                const second = document.createElement("i");
                second.className = "h-4 w-4 rounded-full bg-[#f79e1b]/95";
                marks.append(first, second);
                item.append(marks);
              } else if (key === "americanexpress" || key === "amex") {
                const mark = document.createElement("span");
                mark.className =
                  "bg-[#006fcf] px-1 py-1 text-[8px] leading-none text-white";
                mark.textContent = "AMEX";
                item.append(mark);
              } else if (key === "klarna") {
                const mark = document.createElement("span");
                mark.className =
                  "rounded-sm bg-[#ffb3c7] px-1.5 py-1 text-black";
                mark.textContent = "Klarna.";
                item.append(mark);
              } else if (key === "visa") {
                const mark = document.createElement("span");
                mark.className = "italic";
                mark.textContent = "VISA";
                item.append(mark);
              } else if (key === "paypal") {
                const mark = document.createElement("span");
                mark.innerHTML =
                  '<b style="color:#003087">P</b><b style="color:#009cde;margin-left:-2px">P</b><span style="margin-left:2px;color:#003087;font-style:normal">PayPal</span>';
                mark.className = "italic";
                item.append(mark);
              } else if (key === "applepay") {
                const mark = document.createElement("span");
                mark.className =
                  "inline-flex items-center gap-0.5 font-semibold tracking-tight";
                mark.innerHTML =
                  '<svg aria-hidden="true" viewBox="0 0 20 20" class="h-4 w-4 fill-current"><path d="M16.6 10.7c0-2.1 1.7-3.1 1.8-3.2-1-1.5-2.6-1.7-3.2-1.7-1.4-.1-2.7.8-3.4.8-.7 0-1.8-.8-3-.8-1.5 0-2.9.9-3.7 2.2-1.6 2.7-.4 6.7 1.1 8.9.7 1.1 1.5 2.3 2.6 2.2 1-.1 1.4-.7 2.7-.7 1.2 0 1.6.7 2.7.7 1.1 0 1.8-1.1 2.5-2.2.8-1.2 1.1-2.4 1.1-2.5-.1 0-2.2-.9-2.2-3.7ZM14.4 4.4c.6-.8 1-1.8.9-2.9-.9 0-2 .6-2.6 1.4-.6.7-1.1 1.8-1 2.8 1 0 2-.5 2.7-1.3Z"/></svg>Pay';
                item.append(mark);
              } else if (key === "googlepay") {
                const mark = document.createElement("span");
                mark.innerHTML =
                  '<span style="color:#4285f4">G</span><span style="color:#ea4335">o</span><span style="color:#fbbc05">o</span><span style="color:#4285f4">g</span><span style="color:#34a853">l</span><span style="color:#ea4335">e</span> Pay';
                mark.className = "font-medium";
                item.append(mark);
              } else item.textContent = method;
              list.append(item);
            }
            group.append(list);
            paymentIcons.append(group);
          }
        }
      }
      const cssInput =
        typeof settings.custom_css === "string" ? settings.custom_css : "";
      const cssNodeId = `theme-builder-css-${node.dataset.themeSectionId || "footer"}`;
      let cssNode = document.getElementById(
        cssNodeId,
      ) as HTMLStyleElement | null;
      const safeCss =
        /@import|url\s*\(|expression\s*\(|<\/style|javascript:/i.test(cssInput)
          ? ""
          : cssInput.replace(
              /([^{}]+)\{([^{}]*)\}/g,
              (_rule, selectors: string, declarations: string) => {
                if (selectors.trim().startsWith("@")) return "";
                return `${selectors
                  .split(",")
                  .map((selector) => `#${footer.id} ${selector.trim()}`)
                  .join(", ")} {${declarations}}`;
              },
            );
      if (safeCss) {
        if (!cssNode) {
          cssNode = document.createElement("style");
          cssNode.id = cssNodeId;
          document.head.append(cssNode);
        }
        cssNode.textContent = safeCss;
      } else cssNode?.remove();
    }
  }

  if (entry.type === "announcement_bar") {
    const announcement = node.querySelector<HTMLElement>(
      '[data-theme-section-type="announcement_bar"]',
    );
    const text =
      typeof entry.settings?.text === "string" ? entry.settings.text : "";
    const link =
      typeof entry.settings?.link === "string" ? entry.settings.link : "";
    const accent = entry.settings?.style === "accent";

    if (announcement) {
      announcement.className = accent
        ? "bg-marketplace-brand text-white text-center text-sm py-2 px-4"
        : "bg-[#f5f5f1] text-[#222] text-center text-sm py-2 px-4 border-b border-[#e1e3df]";
      const numberSetting = (key: string, fallback: number, max: number) => {
        const value = Number(entry.settings?.[key]);
        return Number.isFinite(value)
          ? Math.max(0, Math.min(max, value))
          : fallback;
      };
      const colorSetting = (key: string, fallback: string) => {
        const value = entry.settings?.[key];
        return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value)
          ? value
          : fallback;
      };
      const schemes: Record<string, { background: string; text: string }> = {
        "scheme-1": { background: "#ffffff", text: "#111111" },
        "scheme-2": { background: "#f6f1e8", text: "#6c315d" },
        "scheme-3": { background: "#e8f4ef", text: "#173b32" },
        "scheme-4": { background: "#f0f3fa", text: "#24365f" },
        "scheme-5": { background: "#fff5e8", text: "#804a19" },
      };
      const palette =
        schemes[String(entry.settings?.color_scheme || "scheme-1")] ||
        schemes["scheme-1"];
      announcement.style.backgroundColor = accent
        ? ""
        : colorSetting("background_color", palette.background);
      announcement.style.color = accent
        ? ""
        : colorSetting("text_color", palette.text);
      announcement.style.borderBottom = `${numberSetting("divider_thickness", 1, 8)}px solid ${colorSetting("divider_color", "#e1e3df")}`;
      announcement.style.paddingTop = `${numberSetting("padding_top", 15, 120)}px`;
      announcement.style.paddingBottom = `${numberSetting("padding_bottom", 15, 120)}px`;
      announcement.style.maxWidth =
        entry.settings?.section_width === "full"
          ? "none"
          : "var(--marketplace-page-width, 1200px)";
      announcement.style.marginInline = "auto";
      const cssInput =
        typeof entry.settings?.custom_css === "string"
          ? entry.settings.custom_css
          : "";
      const cssNodeId = `theme-builder-css-${node.dataset.themeSectionId || "announcement"}`;
      let cssNode = document.getElementById(
        cssNodeId,
      ) as HTMLStyleElement | null;
      const safeCss =
        /@import|url\s*\(|expression\s*\(|<\/style|javascript:/i.test(cssInput)
          ? ""
          : cssInput.replace(
              /([^{}]+)\{([^{}]*)\}/g,
              (_rule, selectors: string, declarations: string) => {
                if (selectors.trim().startsWith("@")) return "";
                return `${selectors
                  .split(",")
                  .map((selector) => `#${announcement.id} ${selector.trim()}`)
                  .join(", ")} {${declarations}}`;
              },
            );
      if (safeCss) {
        if (!cssNode) {
          cssNode = document.createElement("style");
          cssNode.id = cssNodeId;
          document.head.append(cssNode);
        }
        cssNode.textContent = safeCss;
      } else cssNode?.remove();

      if (!(entry.block_order || []).length) {
        const content = document.createElement("span");
        content.textContent = text;
        if (link) {
          const anchor = document.createElement("a");
          anchor.href = link.startsWith("/") ? link : `/${link}`;
          anchor.className = "underline-offset-2 hover:underline";
          anchor.append(content);
          announcement.replaceChildren(anchor);
        } else {
          announcement.replaceChildren(content);
        }
      }
    }
  }

  if (entry.type === "hero") {
    const settings = entry.settings || {};
    syncHeroBlocks(node, entry);
    renderSplitHeroPreview(node, entry);
    const frame = node.querySelector<HTMLElement>("[data-theme-hero-frame]");
    const heroVariant = String(settings.hero_variant || "classic");
    node
      .querySelector<HTMLElement>("[data-theme-hero-section]")
      ?.setAttribute("data-theme-hero-variant", heroVariant);
    if (frame) frame.dataset.themeHeroVariant = heroVariant;
    const heroLayout = node.querySelector<HTMLElement>(
      ".theme-hero-split-grid",
    );
    if (heroLayout) heroLayout.dataset.themeHeroLayoutVariant = heroVariant;
    const splitLayout = Boolean(
      node.querySelector("[data-theme-hero-split], .theme-hero-split-grid"),
    );
    const content = node.querySelector<HTMLElement>(
      "[data-theme-hero-content]",
    );
    const mediaList = node.querySelector<HTMLElement>(
      "[data-theme-hero-media-list]",
    );
    const mediaArea = node.querySelector<HTMLElement>(
      "[data-theme-hero-media-area]",
    );
    const media1Type = settings.media_1_type === "video" ? "video" : "image";
    const media2Type = settings.media_2_type === "video" ? "video" : "image";
    const hasMedia1 = Boolean(
      safePreviewUrl(
        settings[`media_1_${media1Type}_url`] ||
          (media1Type === "image" ? settings.image_url : settings.video_source),
      ),
    );
    const hasMedia2 = Boolean(
      safePreviewUrl(settings[`media_2_${media2Type}_url`]),
    );
    const blocks = (entry.blocks || {}) as Record<
      string,
      {
        type?: string;
        settings?: Record<string, unknown>;
        disabled?: unknown;
        parent_id?: string;
      }
    >;
    const blockOrder = entry.block_order || [];
    const hasBlockContent = blockOrder.some((id) => {
      const block = blocks[id];
      if (!block || block.disabled || block.parent_id) return false;
      if (block.type === "heading" || block.type === "text")
        return (
          typeof block.settings?.text === "string" &&
          block.settings.text.trim().length > 0
        );
      if (block.type === "button")
        return (
          typeof block.settings?.label === "string" &&
          block.settings.label.trim().length > 0
        );
      if (block.type === "image")
        return Boolean(block.settings?.image_url || block.settings?.image_id);
      return false;
    });
    const hasLegacyContent = Boolean(
      String(settings.eyebrow || "").trim() ||
        String(settings.heading || "").trim() ||
        String(settings.subheading || "").trim() ||
        (safePreviewUrl(settings.button_link) &&
          String(settings.button_text || "").trim()),
    );
    const hasContent = blockOrder.length ? hasBlockContent : hasLegacyContent;
    const hasMedia = hasMedia1 || hasMedia2;
    const splitHero =
      settings.direction !== "vertical" && hasMedia && hasContent;
    if (frame && !splitLayout) {
      frame.style.gridTemplateColumns = splitHero
        ? "minmax(0, 1fr) minmax(0, 1fr)"
        : "minmax(0, 1fr)";
      frame.style.gap = `${Math.max(0, Math.min(120, Number(settings.gap ?? 24)))}px`;
      frame.style.paddingTop = `${Math.max(0, Math.min(120, Number(settings.padding_top ?? 100)))}px`;
      frame.style.paddingBottom = `${Math.max(0, Math.min(120, Number(settings.padding_bottom ?? 72)))}px`;
    }
    if (frame) {
      frame.style.backgroundColor =
        splitLayout && heroVariant === "split"
          ? typeof settings.split_background_color === "string" &&
            /^#[0-9a-fA-F]{6}$/.test(settings.split_background_color)
            ? settings.split_background_color
            : "#ffad00"
          : typeof settings.background_color === "string" &&
              /^#[0-9a-fA-F]{6}$/.test(settings.background_color)
            ? settings.background_color
            : "";
      const widthContainer = node.querySelector<HTMLElement>(
        "[data-theme-hero-section] > section > div",
      );
      if (widthContainer) {
        widthContainer.style.maxWidth =
          settings.section_width === "full"
            ? "none"
            : "var(--marketplace-page-width, 1200px)";
        widthContainer.style.width = "100%";
        widthContainer.style.marginInline = "auto";
      }
    }
    const plain = (value: unknown) =>
      String(value ?? "")
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    const orderedBlocks = blockOrder
      .map((id) => blocks[id])
      .filter((block) => block && !block.disabled && !block.parent_id);
    const headingBlock = orderedBlocks.find(
      (block) => block.type === "heading",
    );
    const buttonBlock = orderedBlocks.find((block) => block.type === "button");
    const textBlock = orderedBlocks.find((block) => block.type === "text");
    const headlineNode = node.querySelector<HTMLElement>(
      "[data-theme-hero-headline]",
    );
    const ctaNode = node.querySelector<HTMLAnchorElement>(
      "[data-theme-hero-cta]",
    );
    const promoNode = node.querySelector<HTMLElement>(
      "[data-theme-hero-promo]",
    );
    const headline =
      plain(headingBlock?.settings?.text) || plain(settings.heading);
    if (headlineNode && headline) headlineNode.textContent = headline;
    if (
      splitLayout &&
      heroVariant === "split" &&
      headlineNode &&
      typeof settings.theme_text_color === "string" &&
      /^#[0-9a-fA-F]{6}$/.test(settings.theme_text_color)
    )
      headlineNode.style.color = settings.theme_text_color;
    const buttonLabel = plain(buttonBlock?.settings?.label);
    if (ctaNode && buttonLabel) ctaNode.textContent = buttonLabel;
    const buttonLink = safePreviewUrl(buttonBlock?.settings?.link);
    if (ctaNode && buttonLink) ctaNode.href = buttonLink;
    const promoCardNode = node.querySelector<HTMLAnchorElement>(
      '[data-theme-hero-media="2"]',
    );
    if (promoCardNode && splitLayout) {
      promoCardNode.href =
        safePreviewUrl(settings.promo_link) ||
        promoCardNode.dataset.themeHeroPromoDefaultHref ||
        promoCardNode.href;
    }
    const promo =
      plain(textBlock?.settings?.text) || plain(settings.subheading);
    if (promoNode && promo) promoNode.textContent = promo;
    if (splitLayout) {
      const split = node.querySelector<HTMLElement>("[data-theme-hero-split]");
      if (split) {
        if (settings.height === "small" || settings.height === "large")
          split.dataset.themeHeroHeight = String(settings.height);
        else delete split.dataset.themeHeroHeight;
      }
      node
        .querySelectorAll<HTMLElement>(
          '[data-theme-hero-media="1"] [data-theme-block-id], [data-theme-hero-media="2"] [data-theme-block-id]',
        )
        .forEach((block) => {
          block.remove();
        });
      if (frame) {
        if (settings.alignment === "left" || settings.alignment === "right")
          frame.dataset.themeHeroAlign = settings.alignment;
        else delete frame.dataset.themeHeroAlign;
        if (settings.position === "top" || settings.position === "bottom")
          frame.dataset.themeHeroPosition = settings.position;
        else delete frame.dataset.themeHeroPosition;
        const topPadding = Number(settings.padding_top);
        const bottomPadding = Number(settings.padding_bottom);
        if (Number.isFinite(topPadding))
          frame.style.paddingTop = `${Math.max(0, Math.min(120, topPadding))}px`;
        if (Number.isFinite(bottomPadding))
          frame.style.paddingBottom = `${Math.max(0, Math.min(120, bottomPadding))}px`;
        frame.style.gap = `${Math.max(0, Math.min(120, Number(settings.gap ?? 16)))}px`;
      }
      if (ctaNode) ctaNode.style.marginTop = "0";
    }
    if (content) {
      content.style.textAlign = String(settings.alignment || "left");
      content.style.justifyContent =
        settings.position === "top"
          ? "flex-start"
          : settings.position === "bottom"
            ? "flex-end"
            : "center";
      content.style.gap = `${Math.max(0, Math.min(120, Number(settings.gap ?? 24)))}px`;
      content.style.color =
        typeof settings.theme_text_color === "string" &&
        /^#[0-9a-fA-F]{6}$/.test(settings.theme_text_color)
          ? settings.theme_text_color
          : heroVariant === "centered" || heroVariant === "video"
            ? "#ffffff"
            : "";
      content.style.alignItems = themeSettingEnabled(settings.text_baseline)
        ? "baseline"
        : "";
      content.style.minHeight =
        settings.height === "small"
          ? "16rem"
          : settings.height === "large"
            ? "44rem"
            : "32rem";
    }
    if (mediaList) {
      const mobileCount = themeSettingEnabled(
        settings.show_different_media_mobile,
      )
        ? Number(hasMedia2)
        : Number(hasMedia1) + Number(hasMedia2);
      const desktopCount = themeSettingEnabled(
        settings.show_different_media_mobile,
      )
        ? Number(hasMedia1)
        : mobileCount;
      mediaList.classList.toggle(
        "grid-cols-1",
        themeSettingEnabled(settings.stack_media_mobile, true) ||
          mobileCount < 2,
      );
      mediaList.classList.toggle(
        "grid-cols-2",
        !themeSettingEnabled(settings.stack_media_mobile, true) &&
          mobileCount > 1,
      );
      mediaList.classList.toggle(
        "md:grid-cols-2",
        settings.direction !== "vertical" && desktopCount > 1,
      );
      mediaList.classList.toggle(
        "md:grid-cols-1",
        settings.direction === "vertical" || desktopCount < 2,
      );
      if (frame && !splitLayout)
        frame.style.gridTemplateColumns = splitHero
          ? "minmax(0, 1fr) minmax(0, 1fr)"
          : "minmax(0, 1fr)";
    }
    const palette: Record<string, { background: string; text: string }> = {
      "scheme-1": { background: "#ffffff", text: "#111111" },
      "scheme-2": { background: "#f6f1e8", text: "#6c315d" },
      "scheme-3": { background: "#e8f4ef", text: "#173b32" },
      "scheme-4": { background: "#f0f3fa", text: "#24365f" },
      "scheme-5": { background: "#fff5e8", text: "#804a19" },
    };
    const scheme =
      palette[String(settings.theme_color_scheme)] || palette["scheme-1"];
    if (
      frame &&
      !splitLayout &&
      !(
        typeof settings.background_color === "string" &&
        /^#[0-9a-fA-F]{6}$/.test(settings.background_color)
      )
    )
      frame.style.backgroundColor = scheme.background;
    if (
      content &&
      !(
        typeof settings.theme_text_color === "string" &&
        /^#[0-9a-fA-F]{6}$/.test(settings.theme_text_color)
      )
    )
      content.style.color = scheme.text;
    for (const slot of [1, 2] as const) {
      const media = node.querySelector<HTMLElement>(
        `[data-theme-hero-media="${slot}"]`,
      );
      if (!media) continue;
      if (!splitLayout) {
        media.classList.toggle(
          "hidden",
          themeSettingEnabled(settings.show_different_media_mobile) &&
            slot === 1,
        );
        media.classList.toggle(
          "sm:block",
          themeSettingEnabled(settings.show_different_media_mobile) &&
            slot === 1,
        );
        media.classList.toggle(
          "sm:hidden",
          themeSettingEnabled(settings.show_different_media_mobile) &&
            slot === 2,
        );
      }
      const type =
        settings[`media_${slot}_type`] === "video" ? "video" : "image";
      const source = safePreviewUrl(
        settings[
          `media_${slot}_${type === "video" ? "video_url" : "image_url"}`
        ] || (slot === 1 ? settings.image_url || settings.video_source : ""),
      );
      media.style.display = source ? "" : "none";
      if (!splitLayout) {
        media.style.height =
          settings.height === "small"
            ? "16rem"
            : settings.height === "large"
              ? "44rem"
              : "32rem";
        media.style.minHeight = "";
      }
      if (source && mediaArea) mediaArea.style.display = "";
      let visual = media.querySelector<HTMLImageElement | HTMLVideoElement>(
        "img, video",
      );
      if (source && (!visual || visual.tagName.toLowerCase() !== type)) {
        const replacement =
          type === "video"
            ? document.createElement("video")
            : document.createElement("img");
        replacement.className = `h-full w-full ${type === "image" ? "object-contain" : "object-cover"}`;
        if (replacement instanceof HTMLVideoElement) {
          replacement.autoplay = true;
          replacement.muted = true;
          replacement.loop = true;
          replacement.playsInline = true;
        }
        visual?.replaceWith(replacement);
        if (!visual) media.prepend(replacement);
        visual = replacement;
      }
      if (visual && source && visual.getAttribute("src") !== source)
        visual.setAttribute("src", source);
      if (visual && !splitLayout)
        visual.style.objectFit = type === "image" ? "contain" : "cover";
      if (visual && splitLayout) {
        visual.style.objectFit = "cover";
        visual.classList.remove("object-contain");
        visual.classList.add("object-cover");
      }
      if (visual && type === "video") (visual as HTMLVideoElement).load();
      let overlay = media.querySelector<HTMLElement>(
        "[data-theme-hero-overlay]",
      );
      if (themeSettingEnabled(settings.media_overlay)) {
        if (!overlay) {
          overlay = document.createElement("div");
          overlay.dataset.themeHeroOverlay = "true";
          overlay.className = "absolute inset-0";
          media.append(overlay);
        }
        const color =
          typeof settings.overlay_color === "string" &&
          /^#[0-9a-fA-F]{6}$/.test(settings.overlay_color)
            ? settings.overlay_color
            : "#121212";
        overlay.style.background =
          settings.overlay_style === "gradient"
            ? `linear-gradient(90deg, ${color}cc, ${color}22)`
            : `${color}66`;
      } else overlay?.remove();
      if (visual)
        visual.style.filter = themeSettingEnabled(settings.blur_media)
          ? "blur(4px)"
          : "";
    }
    if (mediaArea)
      mediaArea.style.display = Array.from(
        node.querySelectorAll<HTMLElement>("[data-theme-hero-media]"),
      ).some((item) => item.style.display !== "none")
        ? ""
        : "none";
    if (frame) {
      const href = safePreviewUrl(settings.section_link);
      let sectionAnchor = frame.querySelector<HTMLAnchorElement>(
        "a[data-theme-hero-link]",
      );
      if (href && !sectionAnchor) {
        sectionAnchor = document.createElement("a");
        sectionAnchor.dataset.themeHeroLink = "true";
        sectionAnchor.setAttribute("aria-label", "Open hero link");
        sectionAnchor.className = "absolute inset-0 z-10";
        frame.prepend(sectionAnchor);
      }
      if (sectionAnchor) {
        sectionAnchor.style.display = href ? "" : "none";
        if (href) sectionAnchor.href = href;
        sectionAnchor.target = themeSettingEnabled(
          settings.open_link_in_new_tab,
        )
          ? "_blank"
          : "";
        sectionAnchor.rel = themeSettingEnabled(settings.open_link_in_new_tab)
          ? "noopener noreferrer"
          : "";
      }
    }
    const headingBlocks = new Map<
      string,
      { type?: string; settings?: Record<string, unknown> }
    >();
    for (const id of entry.block_order || []) {
      const block = entry.blocks?.[id] as
        | { type?: string; settings?: Record<string, unknown> }
        | undefined;
      if (!block) continue;
      const blockNode = Array.from(
        node.querySelectorAll<HTMLElement>("[data-theme-block-id]"),
      ).find((item) => item.dataset.themeBlockId === id);
      if (!blockNode) continue;
      if (block.type === "heading") {
        headingBlocks.set(id, block);
        const heading = blockNode.querySelector<HTMLElement>(
          '[role="heading"], h1, h2, h3, h4',
        );
        if (heading) {
          heading.innerHTML = sanitizeThemeRichText(
            String(block.settings?.text || ""),
          );
          const preset: Record<string, string> = {
            heading_1: "2.5rem",
            heading_2: "2rem",
            heading_3: "1.5rem",
            heading_4: "1.25rem",
          };
          heading.style.fontSize = preset[String(block.settings?.preset)] || "";
          heading.style.color =
            typeof block.settings?.text_color === "string" &&
            /^#[0-9a-fA-F]{6}$/.test(block.settings.text_color)
              ? block.settings.text_color
              : "";
          heading.style.padding = `${Number(block.settings?.padding_top || 0)}px ${Number(block.settings?.padding_right || 0)}px ${Number(block.settings?.padding_bottom || 0)}px ${Number(block.settings?.padding_left || 0)}px`;
          const wrapper = heading.parentElement as HTMLElement;
          wrapper.style.width =
            block.settings?.width === "fill" ? "100%" : "fit-content";
          wrapper.style.maxWidth =
            (
              {
                narrow: "40rem",
                normal: "48rem",
                wide: "64rem",
                full: "none",
              } as Record<string, string>
            )[String(block.settings?.max_width)] || "";
          wrapper.style.backgroundColor = themeSettingEnabled(
            block.settings?.background_enabled,
          )
            ? typeof block.settings?.background_color === "string" &&
              /^#[0-9a-fA-F]{6}$/.test(String(block.settings?.background_color))
              ? String(block.settings?.background_color)
              : block.settings?.background_color === "palette"
                ? "var(--marketplace-surface-warm)"
                : ""
            : "";
        }
      } else if (block.type === "text") {
        const text = blockNode.querySelector<HTMLElement>(
          ".whitespace-pre-line",
        );
        if (text)
          text.innerHTML = sanitizeThemeRichText(
            String(block.settings?.text || ""),
          );
      } else if (block.type === "image") {
        const image = blockNode.querySelector<HTMLImageElement>("img");
        const source = safePreviewUrl(block.settings?.image_url);
        if (image) {
          if (source) image.src = source;
          else image.removeAttribute("src");
          image.alt = String(block.settings?.alt || "");
          image.style.display = source ? "" : "none";
        }
      } else if (block.type === "spacer") {
        blockNode.style.height =
          block.settings?.size === "small"
            ? "1rem"
            : block.settings?.size === "large"
              ? "3rem"
              : "2rem";
      } else if (block.type === "button") {
        const anchor = blockNode.querySelector<HTMLAnchorElement>("a");
        if (!anchor) continue;
        anchor.textContent = String(block.settings?.label || "");
        const href = safePreviewUrl(block.settings?.link);
        if (href) anchor.href = href;
        anchor.target = themeSettingEnabled(block.settings?.open_in_new_tab)
          ? "_blank"
          : "";
        anchor.rel = themeSettingEnabled(block.settings?.open_in_new_tab)
          ? "noopener noreferrer"
          : "";
        if (
          block.settings?.style === "primary" ||
          block.settings?.style === "secondary"
        ) {
          anchor.style.backgroundColor = "";
          anchor.style.color = "";
          anchor.style.borderColor = "";
        } else {
          for (const [property, key, paletteValue] of [
            ["backgroundColor", "background_color", "var(--marketplace-brand)"],
            ["color", "text_color", "white"],
            ["borderColor", "border_color", "var(--marketplace-brand)"],
          ] as const) {
            const value = block.settings?.[key];
            anchor.style[property] =
              typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value)
                ? value
                : value === "palette"
                  ? paletteValue
                  : "";
          }
        }
        anchor.style.width = "";
        anchor.classList.toggle(
          "w-fit",
          block.settings?.mobile_width !== "custom",
        );
        anchor.classList.toggle(
          "w-full",
          block.settings?.mobile_width === "custom",
        );
        anchor.classList.toggle(
          "md:w-full",
          block.settings?.desktop_width === "custom",
        );
        anchor.classList.toggle(
          "md:w-fit",
          block.settings?.desktop_width !== "custom",
        );
        anchor.classList.toggle(
          "bg-marketplace-brand",
          block.settings?.style === "primary",
        );
        anchor.classList.toggle(
          "text-white",
          block.settings?.style === "primary",
        );
        anchor.classList.toggle(
          "bg-marketplace-surface",
          block.settings?.style === "secondary",
        );
        anchor.classList.toggle(
          "text-marketplace-brand",
          block.settings?.style === "secondary",
        );
        anchor.classList.toggle(
          "border-marketplace-brand",
          block.settings?.style === "primary" ||
            block.settings?.style === "secondary",
        );
      }
    }
    if (headingBlocks.size === 0) {
      const heading =
        node.querySelector<HTMLElement>("[data-theme-hero-content] h1") ||
        node.querySelector<HTMLElement>("h1");
      if (heading && typeof settings.heading === "string")
        heading.textContent = settings.heading;
      const subheading =
        node.querySelector<HTMLElement>("[data-theme-hero-content] p") ||
        node.querySelector<HTMLElement>("p");
      if (subheading && typeof settings.subheading === "string")
        subheading.textContent = settings.subheading;
    }
    const cssInput =
      typeof settings.custom_css === "string" ? settings.custom_css : "";
    const cssNodeId = `theme-builder-css-${node.dataset.themeSectionId || "hero"}`;
    let cssNode = document.getElementById(cssNodeId) as HTMLStyleElement | null;
    const safeCss =
      /@import|url\s*\(|expression\s*\(|<\/style|javascript:/i.test(cssInput)
        ? ""
        : cssInput.replace(
            /([^{}]+)\{([^{}]*)\}/g,
            (_rule, selectors: string, declarations: string) => {
              if (selectors.trim().startsWith("@")) return "";
              return `${selectors
                .split(",")
                .map(
                  (selector) =>
                    `[data-theme-hero-section="${node.dataset.themeSectionId}"] ${selector.trim()}`,
                )
                .join(", ")} {${declarations}}`;
            },
          );
    if (safeCss) {
      if (!cssNode) {
        cssNode = document.createElement("style");
        cssNode.id = cssNodeId;
        document.head.append(cssNode);
      }
      cssNode.textContent = safeCss;
    } else cssNode?.remove();
  }

  for (const blockId of entry.block_order || []) {
    const rawBlock = entry.blocks?.[blockId];
    if (!rawBlock || typeof rawBlock !== "object") continue;
    const block = rawBlock as {
      type?: string;
      settings?: Record<string, unknown>;
    };
    if (block.type !== "announcement") continue;
    const blockNode = Array.from(
      node.querySelectorAll<HTMLElement>("[data-theme-block-id]"),
    ).find((item) => item.dataset.themeBlockId === blockId);
    if (!blockNode) continue;
    const text =
      typeof block.settings?.text === "string" ? block.settings.text : "";
    const link =
      typeof block.settings?.link === "string" ? block.settings.link : "";
    const content = document.createElement("span");
    content.textContent = text;
    let target: HTMLElement = content;
    if (link) {
      const anchor = document.createElement("a");
      anchor.href = link.startsWith("/") ? link : `/${link}`;
      anchor.append(content);
      target = anchor;
    }
    const sizes = ["12px", "14px", "16px", "18px", "20px"];
    const weights: Record<string, string> = {
      regular: "400",
      medium: "500",
      semibold: "600",
      bold: "700",
    };
    const settings = block.settings || {};
    const styleNode = target;
    styleNode.style.fontSize = sizes.includes(String(settings.size))
      ? String(settings.size)
      : "12px";
    styleNode.style.fontWeight = weights[String(settings.weight)] || "400";
    styleNode.style.fontFamily =
      settings.font === "heading" || settings.font === "subheading"
        ? "var(--font-display, inherit)"
        : "";
    styleNode.style.letterSpacing =
      settings.letter_spacing === "tight"
        ? "-0.02em"
        : settings.letter_spacing === "loose"
          ? "0.08em"
          : "normal";
    styleNode.style.textTransform =
      settings.text_case === "uppercase" ? "uppercase" : "none";
    if (
      typeof settings.text_color === "string" &&
      /^#[0-9a-fA-F]{6}$/.test(settings.text_color)
    )
      styleNode.style.color = settings.text_color;
    blockNode.replaceChildren(target);
  }

  if (entry.type !== "hero") {
    const heading = entry.settings?.heading;
    const headingNode =
      node.querySelector<HTMLElement>("[data-theme-section-heading]") ||
      node.querySelector<HTMLElement>("h1, h2");
    if (typeof heading === "string" && headingNode) {
      headingNode.textContent = heading;
      const header = headingNode.closest<HTMLElement>(
        "[data-theme-section-header]",
      );
      if (header) {
        const description = header
          .querySelector("[data-theme-section-description]")
          ?.textContent?.trim();
        const action = header.querySelector("a, button");
        header.style.display =
          heading.trim() || description || action ? "" : "none";
      }
    }
    const body = entry.settings?.body;
    const bodyNode = node.querySelector<HTMLElement>(
      "[data-theme-section-body]",
    );
    if (typeof body === "string" && bodyNode) {
      bodyNode.textContent = body;
      bodyNode.hidden = !body.trim();
    }
    const image = safePreviewUrl(entry.settings?.image_url);
    const secondaryImage = safePreviewUrl(entry.settings?.secondary_image_url);
    const imageNode = node.querySelector<HTMLImageElement>(
      "[data-theme-section-image]",
    );
    const secondaryImageNode = node.querySelector<HTMLImageElement>(
      "[data-theme-section-secondary-image]",
    );
    if (imageNode) {
      if (image) imageNode.src = image;
      else imageNode.removeAttribute("src");
      imageNode.hidden = !image;
    }
    if (secondaryImageNode) {
      if (secondaryImage) secondaryImageNode.src = secondaryImage;
      else secondaryImageNode.removeAttribute("src");
      secondaryImageNode.hidden = !secondaryImage;
    }
    const media = node.querySelector<HTMLElement>("[data-theme-section-media]");
    if (media) media.hidden = !image && !secondaryImage;
  }
  syncSectionImagePreview(node, entry);
  syncCollectionCategoryCardsPreview(node, entry);
  if (entry.type === "featured_collection")
    syncFeaturedCollectionPreview(node, entry);
  syncLimitedRailPreview(node, entry);
  syncSectionFramePreview(node, entry);
  syncGenericSectionBlocks(node, entry);
  syncSlideshowPreview(node, entry);
}

function isVisible(entry: SectionEntry, viewport: number): boolean {
  if (entry.disabled) return false;
  const settings = entry.settings || {};
  const visibility =
    (settings.visibility as
      | { desktop?: boolean; tablet?: boolean; mobile?: boolean }
      | undefined) || {};
  const desktop = settings.desktopVisible ?? visibility.desktop ?? true;
  const tablet = settings.tabletVisible ?? visibility.tablet ?? true;
  const mobile = settings.mobileVisible ?? visibility.mobile ?? true;
  if (viewport < 768) return themeSettingEnabled(mobile, true);
  if (viewport < 1024) return themeSettingEnabled(tablet, true);
  return themeSettingEnabled(desktop, true);
}

function flattenNavigationPreview(
  items: CmsNavigationItemWire[],
  basePath: string,
): Array<{ label: string; href: string }> {
  return items.flatMap((item) => {
    const href = cmsNavigationHref(item, basePath);
    return [
      ...(href ? [{ label: item.label, href }] : []),
      ...flattenNavigationPreview(item.children ?? [], basePath),
    ];
  });
}

async function updateNavigationPreviews(
  node: HTMLElement,
  entry: SectionEntry,
): Promise<void> {
  const blocks = (entry.blocks || {}) as Record<
    string,
    { type?: string; settings?: Record<string, unknown> }
  >;
  const order = entry.block_order || Object.keys(blocks);
  if (entry.type === "theme_header") {
    const header = node.querySelector<HTMLElement>("[data-theme-header]");
    const nav = header?.querySelector<HTMLElement>(
      "[data-theme-category-row] nav",
    );
    if (!header || !nav) return;
    const menu = order
      .map((id) => blocks[id])
      .find((block) => block?.type === "header_menu");
    const key = String(
      menu?.settings?.menu_key || entry.settings?.menu_key || "header",
    );
    if (
      nav.dataset.themeMenuKey === key ||
      nav.dataset.themeMenuRequest === key
    )
      return;
    nav.dataset.themeMenuRequest = key;
    if (key === "") {
      nav.dataset.themeMenuKey = "";
      nav.dataset.themeMenuRequest = "";
      window.dispatchEvent(
        new CustomEvent("spree:cms-navigation-preview", {
          detail: { key, items: [] },
        }),
      );
      return;
    }
    const navigation = await getPublishedNavigation(key);
    if (nav.dataset.themeMenuRequest !== key || !navigation) return;
    nav.dataset.themeMenuKey = key;
    window.dispatchEvent(
      new CustomEvent("spree:cms-navigation-preview", {
        detail: { key, items: navigation.items },
      }),
    );
  }

  if (entry.type === "theme_footer") {
    const footer = node.querySelector<HTMLElement>("[data-theme-footer]");
    if (!footer) return;
    const basePath = footer.dataset.themeBasePath || "";
    await Promise.all(
      order.map(async (id) => {
        const block = blocks[id];
        if (block?.type !== "footer_menu") return;
        const key = String(block.settings?.menu_key || "");
        const menuNode = footer.querySelector<HTMLElement>(
          `[data-theme-footer-block-id="${CSS.escape(id)}"]`,
        );
        const list = menuNode?.querySelector<HTMLUListElement>("ul");
        if (
          !menuNode ||
          !list ||
          menuNode.dataset.themeFooterMenuKey === key ||
          menuNode.dataset.themeFooterMenuRequest === key
        )
          return;
        menuNode.dataset.themeFooterMenuRequest = key;
        const fallbackMarkup =
          list.dataset.themeFooterFallback ?? list.innerHTML;
        list.dataset.themeFooterFallback = fallbackMarkup;
        if (!key) {
          menuNode.dataset.themeFooterMenuKey = "";
          menuNode.dataset.themeFooterMenuRequest = "";
          list.innerHTML = fallbackMarkup;
          return;
        }
        const navigation = await getPublishedNavigation(key);
        if (menuNode.dataset.themeFooterMenuRequest !== key || !navigation)
          return;
        const links = flattenNavigationPreview(navigation.items, basePath);
        if (!links.length) return;
        list.replaceChildren(
          ...links.map(({ label, href }) => {
            const item = document.createElement("li");
            const anchor = document.createElement("a");
            anchor.href = href;
            anchor.className =
              "text-sm text-marketplace-muted-foreground transition-colors hover:text-marketplace-foreground";
            anchor.textContent = label;
            item.append(anchor);
            return item;
          }),
        );
        menuNode.dataset.themeFooterMenuKey = key;
      }),
    );
  }
}

export function applyPreviewDocument(
  root: HTMLElement,
  group: "body" | "header" | "footer",
  documentState: ThemeTemplateDocument,
  nodes: Map<string, HTMLElement>,
): boolean {
  const container = contentNode(root, group);
  let needsServerRender = false;
  for (const id of documentState.order || []) {
    const entry = documentState.sections?.[id];
    if (!entry) continue;
    // The DOM bridge previews common values immediately, but the storefront
    // renderer owns the full meaning of every section setting. Refresh from
    // that renderer after the edited revision has been saved.
    needsServerRender = true;
    const renderedNodes = Array.from(
      container.querySelectorAll<HTMLElement>(
        '[data-theme-section-id]:not([data-theme-preview-source="true"])',
      ),
    ).filter((item) => item.dataset.themeSectionId === id);
    let node: HTMLElement | undefined = renderedNodes[0] || nodes.get(id);
    for (const duplicate of renderedNodes) {
      if (duplicate !== node) duplicate.remove();
    }
    if (!node) {
      const source = Array.from(nodes.values()).find(
        (item) => item.dataset.themeSectionType === entry.type,
      );
      node = source?.cloneNode(true) as HTMLElement | undefined;
      if (!node) {
        node = createPreviewSection(id, entry);
      }
      node.dataset.themeSectionId = id;
      node.dataset.themeSectionType = entry.type;
      node.dataset.themePreviewCreated = "true";
      node.dataset.themePreviewManaged = "true";
      needsServerRender = true;
    }
    nodes.set(id, node);
    applySectionSettings(node, entry);
    void updateNavigationPreviews(node, entry);
    const visible = isVisible(entry, window.innerWidth);
    node.style.display = visible ? "" : "none";
    container.append(node);
    const hiddenId = `hidden-${id}`;
    let hidden = Array.from(
      container.querySelectorAll<HTMLElement>("[data-theme-hidden-section-id]"),
    ).find((item) => item.dataset.themeHiddenSectionId === id);
    if (!visible) {
      if (!hidden) {
        hidden = window.document.createElement("button");
        hidden.setAttribute("type", "button");
        hidden.dataset.themeHiddenSectionId = id;
        hidden.className =
          "w-full border border-dashed border-marketplace-border px-3 py-2 text-left text-xs text-marketplace-muted-foreground";
      }
      hidden.id = hiddenId;
      hidden.textContent = `Hidden ${entry.type.replaceAll("_", " ")} · Show`;
      container.append(hidden);
    } else hidden?.remove();
  }
  for (const child of Array.from(container.children)) {
    if (!(child instanceof HTMLElement)) continue;
    if (child.dataset.themePreviewSource === "true") continue;
    const id = child.dataset.themeSectionId;
    if (id && !documentState.order.includes(id)) child.remove();
    const hiddenId = child.dataset.themeHiddenSectionId;
    if (hiddenId && !documentState.order.includes(hiddenId)) child.remove();
  }
  for (const [id] of nodes) {
    if (!documentState.order.includes(id)) nodes.delete(id);
  }
  return needsServerRender;
}

export function sendThemeBuilderSelection(
  editorOrigin: string,
  sectionId: string,
  blockId?: string,
) {
  const payload = blockId
    ? { entity: "block" as const, id: blockId, sectionId, blockId }
    : { entity: "section" as const, id: sectionId, sectionId };
  window.parent.postMessage(
    {
      type: "THEME_BUILDER_SELECT",
      payload,
    } satisfies ThemeBuilderSelectMessage,
    editorOrigin,
  );
}

function sectionToolbar(
  sectionId: string,
  editorOrigin: string,
  hidden: boolean,
  removable = true,
): HTMLElement {
  const toolbar = document.createElement("div");
  toolbar.dataset.themeBuilderToolbar = "true";
  toolbar.setAttribute("role", "toolbar");
  toolbar.setAttribute("aria-label", "Section actions");
  Object.assign(toolbar.style, {
    position: "absolute",
    top: "0",
    right: "0",
    zIndex: "30",
    display: "flex",
    gap: "2px",
    background: "#3b3044",
    color: "white",
    padding: "3px",
    fontSize: "11px",
  });
  const actions: ThemeBuilderActionMessage["payload"]["action"][] = [
    "add_before",
    "add_after",
    "duplicate",
    hidden ? "show" : "hide",
    ...(removable ? ["delete" as const] : []),
  ];
  for (const action of actions) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = action.replaceAll("_", " ");
    button.setAttribute("aria-label", action.replaceAll("_", " "));
    Object.assign(button.style, { padding: "3px 5px", color: "white" });
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      window.parent.postMessage(
        {
          type: "THEME_BUILDER_ACTION",
          payload: { action, sectionId },
        } satisfies ThemeBuilderActionMessage,
        editorOrigin,
      );
    });
    toolbar.append(button);
  }
  return toolbar;
}

export function ThemeBuilderPreviewBridge({
  editorOrigin: editorOriginProp,
  themeId,
  templateType,
  templateKey,
  baseTheme,
  baseTemplate,
}: {
  editorOrigin: string | null;
  themeId: string;
  templateType: string;
  templateKey: string;
  baseTheme: CmsTheme;
  baseTemplate: ThemeTemplatePayload;
}) {
  const nodes = useRef<Map<string, HTMLElement>>(new Map());
  const latest = useRef<PreviewPayload | null>(null);
  const needsRender = useRef(false);
  const lastPersisted = useRef(0);
  const [rootReady, setRootReady] = useState(false);
  const editorOrigin = resolveEditorOrigin(editorOriginProp);

  useEffect(() => {
    if (document.querySelector("[data-theme-id]")) {
      setRootReady(true);
      return;
    }
    const observer = new MutationObserver(() => {
      if (document.querySelector("[data-theme-id]")) {
        setRootReady(true);
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!rootReady || !editorOrigin || window.parent === window) return;
    const root = previewThemeRoot();
    if (!root) return;
    root.dataset.themeBuilderBridge = "listening";
    nodes.current = initializePreviewSections(root);

    const select = (id: string | null) => {
      for (const [sectionId, node] of nodes.current) {
        if (!node.isConnected) nodes.current.delete(sectionId);
      }
      for (const [sectionId, node] of sectionNodes(root)) {
        nodes.current.set(sectionId, node);
      }
      root
        .querySelectorAll<HTMLElement>("[data-theme-section-id]")
        .forEach((node) => {
          node.style.outline =
            node.dataset.themeSectionId === id ? "2px solid #3b3044" : "";
          node.querySelector("[data-theme-builder-toolbar]")?.remove();
          node.querySelector("[data-theme-builder-hover-label]")?.remove();
        });
      if (!id) return;
      const node = nodes.current.get(id);
      if (!node?.isConnected) return;
      node.style.position = "relative";
      node.append(
        sectionToolbar(
          id,
          editorOrigin,
          node.style.display === "none",
          node.dataset.themeSectionType !== "theme_header",
        ),
      );
    };

    const apply = (payload: PreviewPayload) => {
      for (const [id, node] of initializePreviewSections(root)) {
        nodes.current.set(id, node);
      }
      const visual = mergeThemeBuilderPreview(baseTheme, baseTemplate, payload);
      const styles = themeInlineStyle(visual.theme) as Record<string, string>;
      const initialStyles = themeInlineStyle(baseTheme) as Record<
        string,
        string
      >;
      for (const themeRoot of document.querySelectorAll<HTMLElement>(
        "[data-theme-id]",
      )) {
        if (!appliedGlobalThemeStyles.has(themeRoot)) {
          appliedGlobalThemeStyles.set(
            themeRoot,
            new Set(Object.keys(initialStyles).map(cssPropertyName)),
          );
        }
        applyGlobalThemeStyles(themeRoot, styles);
      }
      window.dispatchEvent(
        new CustomEvent("spree:theme-settings-preview", {
          detail: visual.theme.settings || {},
        }),
      );
      for (const [attribute, value] of Object.entries(
        themeGlobalDataAttributes(visual.theme),
      ))
        root.setAttribute(attribute, value);
      needsRender.current =
        applyPreviewDocument(
          root,
          "body",
          visual.template.data,
          nodes.current,
        ) || needsRender.current;
      needsRender.current =
        applyPreviewDocument(
          root,
          "header",
          visual.groups.header,
          nodes.current,
        ) || needsRender.current;
      needsRender.current =
        applyPreviewDocument(
          root,
          "footer",
          visual.groups.footer,
          nodes.current,
        ) || needsRender.current;
      select(
        payload.mode === "select"
          ? payload.selection?.sectionId ||
              (payload.selection?.entity === "section"
                ? payload.selection.id
                : null)
          : null,
      );
      const refreshKey = `${themeId}:${templateType}:${templateKey}:${payload.persistedRevision}`;
      const refreshStorageKey = `spree:theme-preview-refreshed:${refreshKey}`;
      let alreadyRefreshed = refreshedRevisions.has(refreshKey);
      try {
        alreadyRefreshed ||=
          window.sessionStorage.getItem(refreshStorageKey) === "true";
      } catch {
        // Session storage can be unavailable in restricted browser contexts.
      }
      if (
        needsRender.current &&
        payload.persistedRevision > 0 &&
        payload.persistedRevision > lastPersisted.current &&
        !alreadyRefreshed &&
        root.querySelector('[data-theme-preview-created="true"]')
      ) {
        needsRender.current = false;
        refreshedRevisions.add(refreshKey);
        try {
          window.sessionStorage.setItem(refreshStorageKey, "true");
        } catch {
          // The editor can still issue a fresh preview token.
        }
        window.parent.postMessage(
          { type: "THEME_BUILDER_REFRESH_PREVIEW" },
          editorOrigin,
        );
      }
      lastPersisted.current = payload.persistedRevision;
    };

    const onMessage = (event: MessageEvent) => {
      if (
        !isTrustedThemeBuilderMessage(
          event,
          editorOrigin,
          window.parent,
          themeId,
          templateType,
          templateKey,
        )
      )
        return;
      try {
        root.dataset.themeBuilderBridge = "updated";
        root.dataset.themeBuilderRevision = String(
          event.data.payload.persistedRevision,
        );
        latest.current = event.data.payload;
        apply(event.data.payload);
      } catch {
        let alert = root.querySelector<HTMLElement>(
          "[data-theme-builder-error]",
        );
        if (!alert) {
          alert = document.createElement("div");
          alert.dataset.themeBuilderError = "true";
          alert.setAttribute("role", "alert");
          root.prepend(alert);
        }
        alert.textContent =
          "Preview could not update. Your editor changes are still available.";
      }
    };
    const onMouseOver = (event: MouseEvent) => {
      if (latest.current?.mode !== "select") return;
      const target =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>("[data-theme-section-id]")
          : null;
      if (
        target &&
        target.dataset.themeSectionId !== latest.current?.selection?.sectionId
      ) {
        target.style.outline = "1px solid #3b3044";
        target.style.position = "relative";
        if (!target.querySelector("[data-theme-builder-hover-label]")) {
          const label = document.createElement("span");
          label.dataset.themeBuilderHoverLabel = "true";
          label.textContent = (
            target.dataset.themeSectionType || "Section"
          ).replaceAll("_", " ");
          Object.assign(label.style, {
            position: "absolute",
            top: "0",
            left: "0",
            zIndex: "29",
            background: "#3b3044",
            color: "white",
            padding: "2px 6px",
            fontSize: "11px",
          });
          target.append(label);
        }
      }
    };
    const onMouseOut = (event: MouseEvent) => {
      const target =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>("[data-theme-section-id]")
          : null;
      if (
        target &&
        event.relatedTarget instanceof Node &&
        target.contains(event.relatedTarget)
      )
        return;
      if (
        target &&
        target.dataset.themeSectionId !== latest.current?.selection?.sectionId
      ) {
        target.style.outline = "";
        target.querySelector("[data-theme-builder-hover-label]")?.remove();
      }
    };
    const onClick = (event: MouseEvent) => {
      if (latest.current?.mode !== "select") return;
      if (
        event.target instanceof Element &&
        event.target.closest("[data-theme-builder-toolbar]")
      )
        return;
      const hidden =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>("[data-theme-hidden-section-id]")
          : null;
      if (hidden?.dataset.themeHiddenSectionId) {
        event.preventDefault();
        const sectionId = hidden.dataset.themeHiddenSectionId;
        window.parent.postMessage(
          {
            type: "THEME_BUILDER_ACTION",
            payload: { action: "show", sectionId },
          } satisfies ThemeBuilderActionMessage,
          editorOrigin,
        );
        return;
      }
      const target =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>("[data-theme-section-id]")
          : null;
      if (!target?.dataset.themeSectionId) return;
      event.preventDefault();
      event.stopPropagation();
      const block =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>("[data-theme-block-id]")
          : null;
      sendThemeBuilderSelection(
        editorOrigin,
        target.dataset.themeSectionId,
        block?.dataset.themeBlockId,
      );
    };
    window.addEventListener("message", onMessage);
    const streamedSections = new MutationObserver(() => {
      const addedNodes = initializePreviewSections(root);
      if (!addedNodes.size) return;
      for (const [id, node] of addedNodes) nodes.current.set(id, node);
      if (latest.current) apply(latest.current);
    });
    streamedSections.observe(root, { childList: true, subtree: true });
    root.addEventListener("mouseover", onMouseOver, true);
    root.addEventListener("mouseout", onMouseOut, true);
    root.addEventListener("click", onClick, true);
    window.parent.postMessage(
      {
        type: "THEME_BUILDER_READY",
        payload: { themeId, templateType, templateKey },
      } satisfies ThemeBuilderReadyMessage,
      editorOrigin,
    );
    if (latest.current) apply(latest.current);
    return () => {
      window.removeEventListener("message", onMessage);
      streamedSections.disconnect();
      root.removeEventListener("mouseover", onMouseOver, true);
      root.removeEventListener("mouseout", onMouseOut, true);
      root.removeEventListener("click", onClick, true);
    };
  }, [
    rootReady,
    editorOrigin,
    themeId,
    templateType,
    templateKey,
    baseTheme,
    baseTemplate,
  ]);

  return null;
}
