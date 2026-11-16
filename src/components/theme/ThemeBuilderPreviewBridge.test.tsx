import type {
  CmsTheme,
  ThemeBuilderPreviewMessage,
  ThemeTemplateDocument,
  ThemeTemplatePayload,
} from "@spree/sdk";
import { act, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  applyGlobalThemeStyles,
  applyPreviewDocument,
  initializePreviewSections,
  sendThemeBuilderSelection,
  ThemeBuilderPreviewBridge,
} from "./ThemeBuilderPreviewBridge";
import {
  isTrustedThemeBuilderMessage,
  mergeThemeBuilderPreview,
} from "./theme-builder-preview-contract";

const theme: CmsTheme = {
  id: "theme_1",
  name: "Test",
  settings: { colors: { brand: "#111111" } },
};
const template: ThemeTemplatePayload = {
  id: "tmpl_1",
  template_type: "home",
  key: "default",
  full_key: "home.default",
  name: "Home",
  data: {
    sections: { hero: { type: "hero", settings: { heading: "Before" } } },
    order: ["hero"],
  },
};
const payload: ThemeBuilderPreviewMessage["payload"] = {
  themeId: "theme_1",
  templateType: "home",
  templateKey: "default",
  settings: { colors: { brand: "#3b3044" } },
  template: {
    sections: { hero: { type: "hero", settings: { heading: "After" } } },
    order: ["hero"],
  },
  sectionGroups: {
    header: { sections: {}, order: [] },
    footer: { sections: {}, order: [] },
  },
  selection: null,
  mode: "select",
  revision: 1,
  persistedRevision: 0,
};

describe("Theme Builder preview bridge", () => {
  it("acknowledges applied updates only for the current frame session and rejects older sequences", async () => {
    const iframe = document.createElement("iframe");
    document.body.append(iframe);
    const parent = iframe.contentWindow!;
    const postMessage = vi
      .spyOn(parent, "postMessage")
      .mockImplementation(() => {});
    vi.stubGlobal("parent", parent);
    const origin = "https://editor.example";
    const staging = document.createElement("div");
    staging.hidden = true;
    staging.innerHTML =
      '<div data-theme-id="theme_1"><div data-theme-template="home.default"></div></div>';
    document.body.prepend(staging);
    const { container, unmount } = render(
      <>
        <div data-theme-id="theme_1">
          <div data-theme-template="home.default">
            <section
              data-theme-section-id="hero"
              data-theme-section-type="hero"
            >
              <h1>Before</h1>
            </section>
          </div>
        </div>
        <ThemeBuilderPreviewBridge
          editorOrigin={origin}
          themeId="theme_1"
          templateType="home"
          templateKey="default"
          baseTheme={theme}
          baseTemplate={template}
        />
      </>,
    );
    try {
      const ready = postMessage.mock.calls.filter(
        ([message]) => message.type === "THEME_BUILDER_READY",
      );
      expect(ready).toHaveLength(1);
      const sessionId = ready[0][0].payload.sessionId;
      const send = async (
        sequence: number,
        text: string,
        session = sessionId,
      ) =>
        act(async () => {
          window.dispatchEvent(
            new MessageEvent("message", {
              source: parent,
              origin,
              data: {
                type: "THEME_BUILDER_PREVIEW",
                payload: {
                  ...payload,
                  sessionId: session,
                  sequence,
                  template: {
                    ...payload.template,
                    sections: {
                      hero: { type: "hero", settings: { heading: text } },
                    },
                  },
                },
              },
            }),
          );
        });
      const root = container.querySelector<HTMLElement>("[data-theme-id]")!;
      expect(root.dataset.themeBuilderBridge).toBe("listening");
      expect(staging.querySelector("[data-theme-builder-bridge]")).toBeNull();
      await send(1, "Wrong session", "old-session");
      expect(root.dataset.themeBuilderBridge).toBe("listening");
      await send(2, "Newest heading");
      expect(root.dataset.themeBuilderBridge).toBe("updated");
      expect(root.dataset.themeBuilderSequence).toBe("2");
      expect(
        root.querySelector('[data-theme-preview-managed="true"] h1')
          ?.textContent,
      ).toBe("Newest heading");
      await send(1, "Stale heading");
      expect(
        root.querySelector('[data-theme-preview-managed="true"] h1')
          ?.textContent,
      ).toBe("Newest heading");
      expect(
        postMessage.mock.calls.filter(
          ([message]) => message.type === "THEME_BUILDER_APPLIED",
        ),
      ).toHaveLength(1);
    } finally {
      unmount();
      postMessage.mockRestore();
      vi.unstubAllGlobals();
      iframe.remove();
      staging.remove();
    }
  });
  it("updates the product media width before the saved storefront render", () => {
    const root = document.createElement("div");
    root.innerHTML =
      '<div data-theme-template="product.default"><section data-theme-section-id="main-product" data-theme-section-type="product"><div class="product-theme-grid"></div></section></div>';
    document.body.append(root);
    const nodes = initializePreviewSections(root);

    applyPreviewDocument(
      root,
      "body",
      {
        sections: {
          "main-product": {
            type: "product",
            settings: { media_width: 70 },
          },
        },
        order: ["main-product"],
      },
      nodes,
    );

    const productLayout = root.querySelector<HTMLElement>(
      '[data-theme-preview-managed="true"] .product-theme-grid',
    );
    expect(productLayout?.style.getPropertyValue("--product-media-width")).toBe(
      "70%",
    );
    root.remove();
  });

  it("builds and updates the split hero preview as settings change before save", () => {
    const root = document.createElement("div");
    root.innerHTML = '<div data-theme-template="home.default"></div>';
    document.body.append(root);
    const nodes = new Map<string, HTMLElement>();
    const render = (heroVariant: string) =>
      applyPreviewDocument(
        root,
        "body",
        {
          sections: {
            hero: {
              type: "hero",
              settings: {
                hero_variant: heroVariant,
                media_1_image_url: "/left.jpg",
                media_2_image_url: "/right.jpg",
                promo_link: "/collections/trick-or-treat",
                split_background_color: "#ffad00",
              },
              blocks: {
                heading: {
                  type: "heading",
                  settings: { text: "Design awards" },
                },
                copy: { type: "text", settings: { text: "Shop the campaign" } },
                button: {
                  type: "button",
                  settings: {
                    label: "Get inspired",
                    link: "/collections/design",
                  },
                },
              },
              block_order: ["heading", "copy", "button"],
            },
          },
          order: ["hero"],
        },
        nodes,
      );

    render("split");
    const hero = nodes.get("hero");
    expect(hero?.querySelectorAll(".theme-hero-split-grid")).toHaveLength(1);
    expect(hero?.querySelectorAll(".theme-hero-split-grid img")).toHaveLength(
      2,
    );
    expect(hero?.querySelector("[data-theme-hero-headline]")?.textContent).toBe(
      "Design awards",
    );
    expect(hero?.querySelector("[data-theme-hero-promo]")?.textContent).toBe(
      "Shop the campaign",
    );
    expect(
      hero
        ?.querySelector<HTMLAnchorElement>("[data-theme-hero-cta]")
        ?.getAttribute("href"),
    ).toBe("/collections/design");
    expect(
      hero
        ?.querySelector<HTMLAnchorElement>('a[data-theme-hero-media="2"]')
        ?.getAttribute("href"),
    ).toBe("/collections/trick-or-treat");

    render("classic");
    expect(
      hero
        ?.querySelector(".theme-hero-split-grid")
        ?.getAttribute("data-theme-hero-layout-variant"),
    ).toBe("classic");
    expect(hero?.querySelector("[data-theme-hero-content]")).toBeNull();
    root.remove();
  });

  it("renders slideshow slides, their nested content, and controls before saving", () => {
    const root = document.createElement("div");
    root.innerHTML = '<div data-theme-template="home.default"></div>';
    document.body.append(root);
    const nodes = new Map<string, HTMLElement>();

    applyPreviewDocument(
      root,
      "body",
      {
        sections: {
          slideshow: {
            type: "slideshow",
            settings: {},
            block_order: [
              "slide-one",
              "heading-one",
              "button-one",
              "slide-two",
              "heading-two",
              "controls",
            ],
            blocks: {
              "slide-one": {
                type: "slide",
                settings: { image_url: "/first.jpg", alt: "First slide" },
              },
              "heading-one": {
                type: "heading",
                parent_id: "slide-one",
                settings: { text: "First heading" },
              },
              "button-one": {
                type: "button",
                parent_id: "slide-one",
                settings: { label: "Shop first", link: "/first" },
              },
              "slide-two": {
                type: "slide",
                settings: { image_url: "/second.jpg", alt: "Second slide" },
              },
              "heading-two": {
                type: "heading",
                parent_id: "slide-two",
                settings: { text: "Second heading" },
              },
              controls: {
                type: "slideshow_controls",
                settings: { style: "arrows", background: "circle" },
              },
            },
          },
        },
        order: ["slideshow"],
      },
      nodes,
    );

    const section = nodes.get("slideshow");
    const slides = section?.querySelectorAll<HTMLElement>("[role=group]");
    expect(
      section?.querySelector("[data-theme-slide-image]")?.getAttribute("alt"),
    ).toBe("First slide");
    expect(section?.textContent).toContain("First heading");
    expect(
      section?.querySelector<HTMLAnchorElement>("a")?.getAttribute("href"),
    ).toBe("/first");
    expect(slides).toHaveLength(2);
    expect(slides?.[0].getAttribute("aria-hidden")).toBe("false");
    expect(slides?.[1].getAttribute("aria-hidden")).toBe("true");

    section
      ?.querySelector<HTMLButtonElement>('[aria-label="Next slide"]')
      ?.click();
    expect(slides?.[0].getAttribute("aria-hidden")).toBe("true");
    expect(slides?.[1].getAttribute("aria-hidden")).toBe("false");
    expect(section?.textContent).toContain("Second heading");
    root.remove();
  });

  it("previews split slides with separate image links and working navigation", () => {
    const root = document.createElement("div");
    root.innerHTML = '<div data-theme-template="home.default"></div>';
    document.body.append(root);
    const nodes = new Map<string, HTMLElement>();

    applyPreviewDocument(
      root,
      "body",
      {
        sections: {
          split: {
            type: "slideshow_split",
            settings: {
              show_arrows_desktop: true,
              show_arrows_mobile: false,
              show_pagination_desktop: true,
              show_pagination_mobile: true,
              fade_effect: true,
              infinite_loop: false,
            },
            block_order: ["slide-one", "heading-one", "slide-two", "controls"],
            blocks: {
              "slide-one": {
                type: "slide",
                settings: {
                  image_1_url: "/left-one.jpg",
                  image_1_link: "/collections/left-one",
                  image_1_alt: "Left one",
                  image_2_url: "/right-one.jpg",
                  image_2_link: "/collections/right-one",
                  image_2_alt: "Right one",
                },
              },
              "heading-one": {
                type: "heading",
                parent_id: "slide-one",
                settings: { text: "Split slide one" },
              },
              "slide-two": {
                type: "slide",
                settings: {
                  image_1_url: "/left-two.jpg",
                  image_2_url: "/right-two.jpg",
                },
              },
              controls: {
                type: "slideshow_controls",
                settings: { style: "arrows" },
              },
            },
          },
        },
        order: ["split"],
      },
      nodes,
    );

    const section = nodes.get("split");
    const slides = section?.querySelectorAll<HTMLElement>(
      "[data-theme-block-type='slide']",
    );
    expect(
      section
        ?.querySelector("a[href='/collections/left-one'] img")
        ?.getAttribute("alt"),
    ).toBe("Left one");
    expect(
      section
        ?.querySelector("a[href='/collections/right-one'] img")
        ?.getAttribute("alt"),
    ).toBe("Right one");
    expect(section?.textContent).toContain("Split slide one");
    expect(
      section?.querySelector("[data-slideshow-dots] button"),
    ).toBeInTheDocument();

    section
      ?.querySelector<HTMLButtonElement>("[aria-label='Next slide']")
      ?.click();
    expect(slides?.[0]).toHaveAttribute("aria-hidden", "true");
    expect(slides?.[1]).toHaveAttribute("aria-hidden", "false");
    expect(
      section?.querySelector("[data-slideshow-arrows]"),
    ).toBeInTheDocument();
    root.remove();
  });

  it("updates split hero CTA and promo destinations independently in the live preview", () => {
    const root = document.createElement("div");
    root.innerHTML = '<div data-theme-template="home.default"></div>';
    document.body.append(root);
    const node = document.createElement("div");
    node.dataset.themeSectionId = "split-hero";
    node.dataset.themeSectionType = "hero";
    node.innerHTML = [
      '<div data-theme-hero-split="true">',
      '<div data-theme-hero-frame="true"><h1 data-theme-hero-headline>Headline</h1>',
      '<a data-theme-hero-cta href="/old-cta">Get inspired</a></div>',
      '<a data-theme-hero-media="2" data-theme-hero-promo-default-href="/us/en/products" href="/old-promo">',
      "<span data-theme-hero-promo>Promo</span></a></div>",
    ].join("");
    root.firstElementChild?.append(node);
    const nodes = new Map([["split-hero", node]]);
    const render = (promoLink: string) =>
      applyPreviewDocument(
        root,
        "body",
        {
          sections: {
            "split-hero": {
              type: "hero",
              settings: {
                hero_variant: "split",
                split_background_color: "#ffad00",
                promo_link: promoLink,
              },
              block_order: ["main-cta"],
              blocks: {
                "main-cta": {
                  type: "button",
                  settings: { label: "Get inspired", link: "/awards" },
                },
              },
            },
          },
          order: ["split-hero"],
        },
        nodes,
      );

    render("/trick-or-treat");
    expect(
      node
        .querySelector<HTMLAnchorElement>("[data-theme-hero-cta]")
        ?.getAttribute("href"),
    ).toBe("/awards");
    expect(
      node
        .querySelector<HTMLAnchorElement>('[data-theme-hero-media="2"]')
        ?.getAttribute("href"),
    ).toBe("/trick-or-treat");
    expect(
      node.querySelector<HTMLElement>("[data-theme-hero-frame]")?.style
        .backgroundColor,
    ).toBe("rgb(255, 173, 0)");

    render("");
    expect(
      node
        .querySelector<HTMLAnchorElement>('[data-theme-hero-media="2"]')
        ?.getAttribute("href"),
    ).toBe("/us/en/products");
    root.remove();
  });

  it("updates and removes global theme styles when preview values are cleared", () => {
    const root = document.createElement("div");
    applyGlobalThemeStyles(root, {
      "--theme-button-primary-background": "#123456",
      fontFamily: "serif",
    });
    expect(
      root.style.getPropertyValue("--theme-button-primary-background"),
    ).toBe("#123456");
    expect(root.style.getPropertyValue("font-family")).toBe("serif");

    applyGlobalThemeStyles(root, {
      "--theme-button-primary-background": "#abcdef",
    });
    expect(
      root.style.getPropertyValue("--theme-button-primary-background"),
    ).toBe("#abcdef");
    expect(root.style.getPropertyValue("font-family")).toBe("");
  });

  it("accepts only the signed origin, parent frame, and matching theme/template", () => {
    const message = {
      origin: "https://admin.example",
      source: window,
      data: { type: "THEME_BUILDER_PREVIEW", payload },
    };
    expect(
      isTrustedThemeBuilderMessage(
        message,
        "https://admin.example",
        window,
        "theme_1",
        "home",
        "default",
      ),
    ).toBe(true);
    expect(
      isTrustedThemeBuilderMessage(
        { ...message, origin: "https://other.example" },
        "https://admin.example",
        window,
        "theme_1",
        "home",
        "default",
      ),
    ).toBe(false);
    expect(
      isTrustedThemeBuilderMessage(
        { ...message, source: null },
        "https://admin.example",
        window,
        "theme_1",
        "home",
        "default",
      ),
    ).toBe(false);
    expect(
      isTrustedThemeBuilderMessage(
        { ...message, data: { type: "UNKNOWN", payload } },
        "https://admin.example",
        window,
        "theme_1",
        "home",
        "default",
      ),
    ).toBe(false);
    expect(
      isTrustedThemeBuilderMessage(
        message,
        "https://admin.example",
        window,
        "theme_2",
        "home",
        "default",
      ),
    ).toBe(false);
  });

  it("overlays local settings and sections without mutating server data", () => {
    const result = mergeThemeBuilderPreview(theme, template, payload);
    expect(result.theme.settings.colors?.brand).toBe("#3b3044");
    expect(result.template.data.sections.hero.settings?.heading).toBe("After");
    expect(theme.settings.colors?.brand).toBe("#111111");
    expect(template.data.sections.hero.settings?.heading).toBe("Before");
  });

  it("updates heading, section order, and visibility in the existing DOM", () => {
    const root = document.createElement("div");
    root.innerHTML =
      '<div data-theme-template="home.default"><div data-theme-section-id="hero" data-theme-section-type="hero"><h1>Before</h1></div><div data-theme-section-id="trust" data-theme-section-type="trust"><h2>Trust</h2></div></div>';
    document.body.append(root);
    const nodes = new Map(
      Array.from(
        root.querySelectorAll<HTMLElement>("[data-theme-section-id]"),
      ).map((node) => [node.dataset.themeSectionId!, node]),
    );
    applyPreviewDocument(
      root,
      "body",
      {
        sections: {
          trust: { type: "trust", settings: { heading: "Trusted" } },
          hero: {
            type: "hero",
            settings: { heading: "Live heading" },
            disabled: true,
          },
        },
        order: ["trust", "hero"],
      },
      nodes,
    );
    const order = Array.from(
      root.querySelectorAll<HTMLElement>("[data-theme-section-id]"),
    ).map((node) => node.dataset.themeSectionId);
    expect(order).toEqual(["trust", "hero"]);
    expect(nodes.get("hero")?.querySelector("h1")?.textContent).toBe(
      "Live heading",
    );
    expect(nodes.get("hero")?.style.display).toBe("none");
    expect(
      root.querySelector("[data-theme-hidden-section-id='hero']"),
    ).not.toBeNull();
    root.remove();
  });

  it("keeps React-owned sections in place and reorders preview copies", () => {
    const root = document.createElement("div");
    root.innerHTML =
      '<div data-theme-template="home.default"><div data-theme-section-id="hero" data-theme-section-type="hero"><h1>Hero</h1></div><div data-theme-section-id="trust" data-theme-section-type="trust"><h2>Trust</h2></div></div>';
    document.body.append(root);
    const templateRoot = root.querySelector<HTMLElement>(
      "[data-theme-template]",
    )!;
    const originalSections = Array.from(templateRoot.children);
    const nodes = initializePreviewSections(root);

    applyPreviewDocument(
      root,
      "body",
      {
        sections: {
          trust: { type: "trust", settings: { heading: "Trust" } },
          hero: { type: "hero", settings: { heading: "Hero" } },
        },
        order: ["trust", "hero"],
      },
      nodes,
    );

    expect(Array.from(templateRoot.children).slice(0, 2)).toEqual(
      originalSections,
    );
    expect(
      originalSections.map(
        (node) => (node as HTMLElement).dataset.themeSectionId,
      ),
    ).toEqual(["hero", "trust"]);
    expect(
      Array.from(
        templateRoot.querySelectorAll<HTMLElement>(
          '[data-theme-section-id][data-theme-preview-managed="true"]',
        ),
      ).map((node) => node.dataset.themeSectionId),
    ).toEqual(["trust", "hero"]);
    root.remove();
  });

  it("reconciles a newly saved section without leaving its preview copy at the bottom", () => {
    const root = document.createElement("div");
    root.innerHTML =
      '<div data-theme-template="home.default"><div data-theme-section-id="new-hero" data-theme-section-type="hero"><h1>Saved hero</h1></div><div data-theme-section-id="existing" data-theme-section-type="trust"><h2>Existing section</h2></div><div data-theme-section-id="new-hero" data-theme-section-type="hero"><h1>Unsaved preview copy</h1></div></div>';
    document.body.append(root);
    const heroNodes = root.querySelectorAll<HTMLElement>(
      '[data-theme-section-id="new-hero"]',
    );
    const nodes = new Map<string, HTMLElement>([["new-hero", heroNodes[1]]]);

    applyPreviewDocument(
      root,
      "body",
      {
        sections: {
          "new-hero": { type: "hero", settings: { heading: "Saved hero" } },
          existing: {
            type: "trust",
            settings: { heading: "Existing section" },
          },
        },
        order: ["new-hero", "existing"],
      },
      nodes,
    );

    const renderedSections = Array.from(
      root.querySelectorAll<HTMLElement>("[data-theme-section-id]"),
    );
    expect(
      renderedSections.map((section) => section.dataset.themeSectionId),
    ).toEqual(["new-hero", "existing"]);
    expect(renderedSections[0].querySelector("h1")?.textContent).toBe(
      "Saved hero",
    );
    expect(nodes.get("new-hero")).toBe(renderedSections[0]);
    root.remove();
  });

  it("previews header section colors and typography independently from its menu", () => {
    const root = document.createElement("div");
    root.innerHTML =
      '<div data-theme-template="home.default"><div data-theme-section-id="header" data-theme-section-type="theme_header" data-theme-context-kind="home"><header data-theme-header><div data-theme-header-top-row><p>Old promo</p></div><div data-theme-header-main><div class="mx-auto flex"></div><div data-theme-header-search></div></div><nav data-theme-category-row></nav><div data-theme-header-mobile-menu class="md:hidden"></div><div data-theme-header-mobile-search></div><div data-theme-header-logo><div data-theme-brand-logo></div></div><div data-theme-header-account></div><div data-theme-header-actions></div></header></div></div>';
    document.body.append(root);
    const nodes = new Map(
      Array.from(
        root.querySelectorAll<HTMLElement>("[data-theme-section-id]"),
      ).map((node) => [node.dataset.themeSectionId!, node]),
    );

    applyPreviewDocument(
      root,
      "body",
      {
        sections: {
          header: {
            type: "theme_header",
            settings: {
              header_style: "hamburger",
              font: "heading",
              size: "18px",
              text_color: "#123456",
              logo_color: "palette",
              top_header_enabled: "false",
              search_enabled: "false",
              customer_account: "false",
              promo_text: "New promo message",
            },
            blocks: {
              logo: { type: "header_logo", settings: {} },
              menu: {
                type: "header_menu",
                settings: {
                  font: "body",
                  top_level_size: "12px",
                  text_color: "default",
                },
              },
            },
            block_order: ["logo", "menu"],
          },
        },
        order: ["header"],
      },
      nodes,
    );

    const header = root.querySelector<HTMLElement>("[data-theme-header]");
    const navigation = root.querySelector<HTMLElement>(
      "[data-theme-category-row]",
    );
    const logo = root.querySelector<HTMLElement>("[data-theme-brand-logo]");
    const topRow = root.querySelector<HTMLElement>(
      "[data-theme-header-top-row]",
    );
    const mobileMenu = root.querySelector<HTMLElement>(
      "[data-theme-header-mobile-menu]",
    );
    const mobileSearch = root.querySelector<HTMLElement>(
      "[data-theme-header-mobile-search]",
    );
    const desktopSearch = root.querySelector<HTMLElement>(
      "[data-theme-header-search]",
    );
    const account = root.querySelector<HTMLElement>(
      "[data-theme-header-account]",
    );
    expect(header?.dataset.headerStyle).toBe("hamburger");
    expect(mobileMenu).toHaveClass("flex");
    expect(mobileSearch?.style.display).toBe("none");
    expect(desktopSearch?.style.display).toBe("none");
    expect(account?.style.display).toBe("none");
    expect(header?.style.color).toBe("rgb(18, 52, 86)");
    expect(header?.style.fontFamily).toBe("var(--font-display), serif");
    expect(header?.style.fontSize).toBe("18px");
    expect(navigation?.style.display).toBe("none");
    expect(navigation?.style.color).toBe("rgb(18, 52, 86)");
    expect(navigation?.style.fontFamily).toBe("var(--font-sans), sans-serif");
    expect(navigation?.style.fontSize).toBe("12px");
    expect(logo?.style.color).toBe("var(--marketplace-foreground)");
    expect(topRow?.style.display).toBe("none");
    expect(topRow?.querySelector("p")?.textContent).toBe("New promo message");
    root.remove();
  });

  it("applies unsaved Hero media, layout, color, and block changes immediately", () => {
    const root = document.createElement("div");
    root.innerHTML =
      '<div data-theme-template="home.default"><div data-theme-section-id="hero" data-theme-section-type="hero"><div data-theme-hero-section="hero"><section><div data-theme-hero-frame><div data-theme-hero-content><h1>Old title</h1></div><div><div data-theme-hero-media-list><div data-theme-hero-media="1"><img src="https://cdn.example/old.webp"></div></div></div></div></section><div data-theme-block-id="heading-block"><div><h2>Old block title</h2></div></div><div data-theme-block-id="button-block"><a href="/old">Old button</a></div></div></div></div>';
    document.body.append(root);
    const nodes = new Map(
      Array.from(
        root.querySelectorAll<HTMLElement>("[data-theme-section-id]"),
      ).map((node) => [node.dataset.themeSectionId!, node]),
    );
    applyPreviewDocument(
      root,
      "body",
      {
        sections: {
          hero: {
            type: "hero",
            settings: {
              heading: "New title",
              media_1_type: "image",
              media_1_image_url: "https://cdn.example/new.webp",
              direction: "vertical",
              gap: 32,
              background_color: "#f6f1e8",
              padding_top: 44,
              padding_bottom: 28,
              theme_color_scheme: "scheme-2",
              theme_text_color: "#6c315d",
              media_overlay: true,
              overlay_style: "gradient",
              overlay_color: "#121212",
              section_link: "/collections/new",
              open_link_in_new_tab: true,
            },
            block_order: ["heading-block", "button-block"],
            blocks: {
              "heading-block": {
                type: "heading",
                settings: {
                  text: "Live block heading",
                  width: "fill",
                  max_width: "wide",
                  preset: "heading_2",
                  text_color: "#202020",
                  background_enabled: true,
                  background_color: "#ffffff",
                  padding_top: 8,
                },
              },
              "button-block": {
                type: "button",
                settings: {
                  label: "Shop now",
                  link: "/collections/new",
                  open_in_new_tab: true,
                  background_color: "#ffffff",
                  text_color: "#111111",
                  border_color: "#d1d1d1",
                  desktop_width: "fit",
                  mobile_width: "custom",
                },
              },
            },
          },
        },
        order: ["hero"],
      },
      nodes,
    );
    const hero = nodes.get("hero")!;
    expect(
      hero.querySelector("[data-theme-hero-frame]")?.getAttribute("style"),
    ).toContain("gap: 32px");
    expect(
      hero.querySelector("[data-theme-hero-frame]")?.getAttribute("style"),
    ).toContain("padding-top: 44px");
    expect(
      (
        hero.querySelector(
          '[data-theme-hero-media="1"] img',
        ) as HTMLImageElement
      ).getAttribute("src"),
    ).toBe("https://cdn.example/new.webp");
    expect(
      (
        hero.querySelector(
          '[data-theme-hero-media="1"] img',
        ) as HTMLImageElement
      ).style.objectFit,
    ).toBe("contain");
    expect(
      hero.querySelector(
        '[data-theme-hero-media="1"] [data-theme-hero-overlay]',
      ),
    ).not.toBeNull();
    expect(
      hero.querySelector('[data-theme-block-id="heading-block"] h2')
        ?.textContent,
    ).toBe("Live block heading");
    expect(
      hero.querySelector('[data-theme-block-id="button-block"] a')?.textContent,
    ).toBe("Shop now");
    expect(
      (
        hero.querySelector(
          '[data-theme-block-id="button-block"] a',
        ) as HTMLAnchorElement
      ).target,
    ).toBe("_blank");
    root.remove();
  });

  it("renders a newly added Hero and its blocks before the storefront is saved", () => {
    const root = document.createElement("div");
    root.innerHTML = '<div data-theme-template="home.default"></div>';
    document.body.append(root);
    const nodes = new Map<string, HTMLElement>();

    applyPreviewDocument(
      root,
      "body",
      {
        sections: {
          "new-hero": {
            type: "hero",
            settings: {
              media_1_type: "image",
              media_1_image_url: "https://cdn.example/hero.webp",
              direction: "horizontal",
              heading: "Fallback title",
            },
            block_order: ["hero-heading", "hero-button"],
            blocks: {
              "hero-heading": {
                type: "heading",
                settings: { text: "Live hero heading" },
              },
              "hero-button": {
                type: "button",
                settings: { label: "Explore", link: "/collections/all" },
              },
            },
          },
        },
        order: ["new-hero"],
      },
      nodes,
    );

    const hero = nodes.get("new-hero");
    expect(hero?.textContent).not.toContain("after save");
    expect(
      hero?.querySelector<HTMLElement>("[data-theme-hero-frame]")?.style
        .gridTemplateColumns,
    ).toBe("minmax(0, 1fr) minmax(0, 1fr)");
    expect(
      hero?.querySelector("[data-theme-block-id='hero-heading'] h2")
        ?.textContent,
    ).toBe("Live hero heading");
    expect(
      hero?.querySelector("[data-theme-block-id='hero-button'] a")?.textContent,
    ).toBe("Explore");
    expect(
      (
        hero?.querySelector(
          '[data-theme-hero-media="1"] img',
        ) as HTMLImageElement
      )?.src,
    ).toContain("hero.webp");
    expect(
      hero?.querySelector("[data-theme-hero-fallback]")?.getAttribute("style"),
    ).toContain("display: none");
    root.remove();
  });

  it("keeps a media-only Hero full width instead of reserving an empty text column", () => {
    const root = document.createElement("div");
    root.innerHTML = '<div data-theme-template="home.default"></div>';
    document.body.append(root);
    const nodes = new Map<string, HTMLElement>();

    applyPreviewDocument(
      root,
      "body",
      {
        sections: {
          "hero-image-only": {
            type: "hero",
            settings: {
              direction: "horizontal",
              media_1_type: "image",
              media_1_image_url: "https://cdn.example/hero.webp",
            },
            block_order: [],
            blocks: {},
          },
        },
        order: ["hero-image-only"],
      },
      nodes,
    );

    const hero = nodes.get("hero-image-only");
    expect(
      hero?.querySelector<HTMLElement>("[data-theme-hero-frame]")?.style
        .gridTemplateColumns,
    ).toBe("minmax(0, 1fr)");
    expect(
      hero?.querySelector<HTMLImageElement>('[data-theme-hero-media="1"] img')
        ?.src,
    ).toContain("hero.webp");
    root.remove();
  });

  it("shows an Image block with its selected media before saving the Hero", () => {
    const root = document.createElement("div");
    root.innerHTML = '<div data-theme-template="home.default"></div>';
    document.body.append(root);
    const nodes = new Map<string, HTMLElement>();

    applyPreviewDocument(
      root,
      "body",
      {
        sections: {
          hero: {
            type: "hero",
            settings: { direction: "horizontal" },
            block_order: ["image-block", "spacer-block"],
            blocks: {
              "image-block": {
                type: "image",
                settings: {
                  image_url: "https://cdn.example/hero-content.webp",
                  alt: "Handmade gifts",
                },
              },
              "spacer-block": {
                type: "spacer",
                settings: { size: "large" },
              },
            },
          },
        },
        order: ["hero"],
      },
      nodes,
    );

    const image = nodes
      .get("hero")
      ?.querySelector<HTMLImageElement>(
        '[data-theme-block-id="image-block"] img',
      );
    expect(image?.src).toContain("hero-content.webp");
    expect(image?.alt).toBe("Handmade gifts");
    expect(
      nodes
        .get("hero")
        ?.querySelector<HTMLElement>('[data-theme-block-id="spacer-block"]')
        ?.style.height,
    ).toBe("3rem");
    root.remove();
  });

  it("syncs added and edited content blocks into an unsaved product rail preview", () => {
    const root = document.createElement("div");
    root.innerHTML = '<div data-theme-template="home.default"></div>';
    document.body.append(root);
    const nodes = new Map<string, HTMLElement>();
    const productSection = document.createElement("div");
    productSection.dataset.themeSectionId = "products";
    productSection.dataset.themeSectionType = "product_rail";
    productSection.innerHTML =
      '<section data-theme-section-frame="products"><div data-theme-section-content><h2 data-theme-section-heading>Popular gifts</h2><div class="product-grid"></div></div></section>';
    nodes.set("products", productSection);
    const previewDocument: ThemeTemplateDocument = {
      sections: {
        products: {
          type: "product_rail",
          settings: { heading: "Popular gifts" },
          block_order: ["intro"],
          blocks: {
            intro: {
              type: "heading",
              settings: {
                text: "Browse gifts",
                width: "fill",
                max_width: "wide",
                preset: "heading_3",
                text_color: "#123456",
                background_enabled: true,
                background_color: "#f0f0f0",
                padding_top: 8,
              },
            },
          },
        },
      },
      order: ["products"],
    };

    applyPreviewDocument(root, "body", previewDocument, nodes);
    expect(
      nodes.get("products")?.querySelector('[data-theme-block-id="intro"] h2')
        ?.textContent,
    ).toBe("Browse gifts");
    const heading = nodes
      .get("products")
      ?.querySelector<HTMLElement>('[data-theme-block-id="intro"] h2');
    expect(heading?.style.color).toBe("rgb(18, 52, 86)");
    expect(heading?.style.backgroundColor).toBe("rgb(240, 240, 240)");
    expect(heading?.style.paddingTop).toBe("8px");
    expect(heading?.style.width).toBe("100%");
    const sectionContent = nodes
      .get("products")
      ?.querySelector("[data-theme-section-content]");
    expect(
      sectionContent?.querySelector(
        '[data-theme-section-blocks="product_rail"]',
      ),
    ).not.toBeNull();
    expect(
      sectionContent
        ?.querySelector('[data-theme-section-blocks="product_rail"]')
        ?.contains(heading ?? null),
    ).toBe(true);

    const updatedDocument: ThemeTemplateDocument = {
      ...previewDocument,
      sections: {
        ...previewDocument.sections,
        products: {
          ...previewDocument.sections.products,
          blocks: {
            intro: { type: "heading", settings: { text: "New gift picks" } },
          },
        },
      },
    };
    applyPreviewDocument(root, "body", updatedDocument, nodes);
    expect(
      nodes.get("products")?.querySelector('[data-theme-block-id="intro"] h2')
        ?.textContent,
    ).toBe("New gift picks");
    root.remove();
  });

  it("previews section headings, body copy, and editorial media before saving", () => {
    const root = document.createElement("div");
    root.innerHTML = '<div data-theme-template="home.default"></div>';
    document.body.append(root);
    const node = document.createElement("section");
    node.dataset.themeSectionId = "editorial";
    node.dataset.themeSectionType = "editorial";
    node.innerHTML = [
      "<div data-theme-section-header><h2 data-theme-section-heading>Old heading</h2></div>",
      "<p data-theme-section-body hidden>Old body</p>",
      "<div data-theme-section-media hidden>",
      "<img data-theme-section-image hidden>",
      "<img data-theme-section-secondary-image hidden>",
      "</div>",
    ].join("");
    const nodes = new Map([["editorial", node]]);
    const render = (settings: Record<string, unknown>) =>
      applyPreviewDocument(
        root,
        "body",
        {
          sections: { editorial: { type: "editorial", settings } },
          order: ["editorial"],
        },
        nodes,
      );

    render({
      heading: "New heading",
      body: "New body copy",
      image_url: "/uploads/editorial.jpg",
      secondary_image_url: "https://cdn.example.test/detail.jpg",
    });
    expect(
      node.querySelector("[data-theme-section-heading]")?.textContent,
    ).toBe("New heading");
    const body = node.querySelector<HTMLElement>("[data-theme-section-body]");
    expect(body?.textContent).toBe("New body copy");
    expect(body?.hidden).toBe(false);
    expect(
      node.querySelector<HTMLImageElement>("[data-theme-section-image]")?.src,
    ).toContain("/uploads/editorial.jpg");
    expect(
      node.querySelector<HTMLImageElement>(
        "[data-theme-section-secondary-image]",
      )?.src,
    ).toBe("https://cdn.example.test/detail.jpg");
    expect(
      node.querySelector<HTMLElement>("[data-theme-section-media]")?.hidden,
    ).toBe(false);

    render({
      heading: "New heading",
      body: "",
      image_url: "",
      secondary_image_url: "",
    });
    expect(body?.hidden).toBe(true);
    expect(
      node.querySelector<HTMLElement>("[data-theme-section-media]")?.hidden,
    ).toBe(true);
    render({
      heading: "",
      body: "",
      image_url: "",
      secondary_image_url: "",
    });
    expect(
      node.querySelector<HTMLElement>("[data-theme-section-header]")?.style
        .display,
    ).toBe("none");
    root.remove();
  });

  it("previews unsaved collection and category card blocks", () => {
    const root = document.createElement("div");
    root.innerHTML = '<div data-theme-template="home.default"></div>';
    document.body.append(root);
    const nodes = new Map<string, HTMLElement>();
    const card = {
      type: "category_card",
      settings: {
        title: "Handmade ceramics",
        description: "Mugs and tableware",
        card_image_url: "/uploads/ceramics.jpg",
        button_label: "Explore",
        link: "/c/ceramics",
      },
    };

    applyPreviewDocument(
      root,
      "body",
      {
        sections: {
          categories: {
            type: "category_tiles",
            settings: { heading: "Shop by category" },
            block_order: ["ceramics"],
            blocks: { ceramics: card },
          },
        },
        order: ["categories"],
      },
      nodes,
    );

    const categoryNode = nodes.get("categories")!;
    const cardNode = categoryNode.querySelector<HTMLAnchorElement>(
      '[data-theme-tile-block-id="ceramics"]',
    );
    expect(cardNode?.getAttribute("href")).toBe("/c/ceramics");
    expect(cardNode?.textContent).toContain("Handmade ceramics");
    expect(cardNode?.textContent).toContain("Mugs and tableware");
    expect(cardNode?.textContent).toContain("Explore");
    expect(cardNode?.querySelector("img")?.getAttribute("src")).toBe(
      "/uploads/ceramics.jpg",
    );

    applyPreviewDocument(
      root,
      "body",
      {
        sections: {
          collections: {
            type: "collection_tiles",
            settings: {},
            block_order: ["tableware"],
            blocks: {
              tableware: {
                ...card,
                type: "collection_card",
                settings: { ...card.settings, title: "Tableware" },
              },
            },
          },
        },
        order: ["collections"],
      },
      nodes,
    );
    expect(
      nodes
        .get("collections")
        ?.querySelector('[data-theme-tile-block-id="tableware"]')?.textContent,
    ).toContain("Tableware");
    root.remove();
  });

  it("updates gallery images and layout immediately from unsaved settings", () => {
    const root = document.createElement("div");
    root.innerHTML = '<div data-theme-template="home.default"></div>';
    document.body.append(root);
    const node = document.createElement("section");
    node.dataset.themeSectionId = "gallery";
    node.dataset.themeSectionType = "image_gallery";
    node.innerHTML =
      '<div data-theme-image-layout="grid" class="grid"><img src="/old.jpg"></div>';
    const nodes = new Map([["gallery", node]]);
    applyPreviewDocument(
      root,
      "body",
      {
        sections: {
          gallery: {
            type: "image_gallery",
            settings: {
              image_urls: ["/new-1.jpg", "https://cdn.example.test/new-2.jpg"],
              layout: "carousel",
              gap: 20,
              image_ratio: "portrait",
            },
          },
        },
        order: ["gallery"],
      },
      nodes,
    );

    const gallery = node.querySelector<HTMLElement>(
      "[data-theme-image-layout]",
    );
    const images = node.querySelectorAll<HTMLImageElement>("img");
    expect(gallery?.dataset.themeImageLayout).toBe("carousel");
    expect(gallery?.classList.contains("flex")).toBe(true);
    expect(gallery?.style.gap).toBe("20px");
    expect(images).toHaveLength(2);
    expect(images[0]?.src).toContain("/new-1.jpg");
    expect(images[1]?.src).toBe("https://cdn.example.test/new-2.jpg");
    expect(images[0]?.style.aspectRatio).toBe("4 / 5");
    applyPreviewDocument(
      root,
      "body",
      {
        sections: {
          gallery: {
            type: "image_gallery",
            settings: { image_urls: [], layout: "carousel" },
          },
        },
        order: ["gallery"],
      },
      nodes,
    );
    expect(gallery?.hidden).toBe(true);
    root.remove();
  });

  it("shows the first selected images in a newly added image section", () => {
    const root = document.createElement("div");
    root.innerHTML = '<div data-theme-template="home.default"></div>';
    document.body.append(root);
    const nodes = new Map<string, HTMLElement>();
    applyPreviewDocument(
      root,
      "body",
      {
        sections: {
          gallery: {
            type: "image_gallery",
            settings: {
              heading: "Maker stories",
              image_urls: ["/first.jpg", "/second.jpg"],
            },
          },
        },
        order: ["gallery"],
      },
      nodes,
    );

    const node = nodes.get("gallery");
    expect(node?.querySelector("[data-theme-image-layout]")).not.toBeNull();
    expect(node?.querySelector("h2")?.textContent).toBe("Maker stories");
    expect(node?.querySelectorAll("img")).toHaveLength(2);
    expect(node?.querySelector("img")?.getAttribute("src")).toBe("/first.jpg");
    root.remove();
  });

  it("updates image comparison sources and hides incomplete comparisons", () => {
    const root = document.createElement("div");
    root.innerHTML = '<div data-theme-template="home.default"></div>';
    document.body.append(root);
    const node = document.createElement("section");
    node.dataset.themeSectionId = "compare";
    node.dataset.themeSectionType = "image_comparison";
    node.innerHTML =
      "<div data-theme-comparison><img data-theme-comparison-before><img data-theme-comparison-after></div>";
    const nodes = new Map([["compare", node]]);
    const render = (before: string, after: string) =>
      applyPreviewDocument(
        root,
        "body",
        {
          sections: {
            compare: {
              type: "image_comparison",
              settings: {
                before_image_url: before,
                after_image_url: after,
              },
            },
          },
          order: ["compare"],
        },
        nodes,
      );

    render("/before.jpg", "https://cdn.example.test/after.jpg");
    const comparison = node.querySelector<HTMLElement>(
      "[data-theme-comparison]",
    );
    expect(comparison?.hidden).toBe(false);
    expect(
      node.querySelector("[data-theme-comparison-before]")?.getAttribute("src"),
    ).toBe("/before.jpg");
    expect(
      node.querySelector("[data-theme-comparison-after]")?.getAttribute("src"),
    ).toBe("https://cdn.example.test/after.jpg");
    render("/before.jpg", "");
    expect(comparison?.hidden).toBe(true);
    root.remove();
  });

  it("requests a storefront render after an existing section is saved", () => {
    const root = document.createElement("div");
    root.innerHTML = '<div data-theme-template="home.default"></div>';
    const section = document.createElement("section");
    section.dataset.themeSectionId = "gallery";
    section.dataset.themeSectionType = "image_gallery";
    const nodes = new Map([["gallery", section]]);

    const needsSavedRender = applyPreviewDocument(
      root,
      "body",
      {
        sections: {
          gallery: {
            type: "image_gallery",
            settings: { layout: "masonry", image_ratio: "portrait" },
          },
        },
        order: ["gallery"],
      },
      nodes,
    );

    expect(needsSavedRender).toBe(true);
    root.remove();
  });

  it("updates featured collection layout and nested product card blocks before save", () => {
    const root = document.createElement("div");
    root.innerHTML = '<div data-theme-template="home.default"></div>';
    document.body.append(root);
    const nodes = new Map<string, HTMLElement>();
    const previewDocument: ThemeTemplateDocument = {
      sections: {
        featured: {
          type: "featured_collection",
          settings: {
            type: "carousel",
            carousel_on_mobile: true,
            columns: 3,
            mobile_columns: "2",
            product_count: 1,
            horizontal_gap: 12,
            vertical_gap: 18,
            padding_top: 36,
            padding_bottom: 42,
            background_color: "#123456",
            alignment: "center",
          },
          block_order: ["collection-header", "card"],
          blocks: {
            "collection-header": {
              type: "collection_header",
              settings: { gap: 16, direction: "vertical", alignment: "center" },
            },
            title: {
              type: "collection_title",
              parent_id: "collection-header",
              settings: {
                text: "Fresh picks",
                text_color: "#abcdef",
                padding_top: 5,
              },
            },
            view: {
              type: "view_all_button",
              parent_id: "collection-header",
              settings: { label: "Browse all", open_in_new_tab: true },
            },
            card: {
              type: "product_card",
              settings: {
                vertical_gap: 9,
                background_color: "#f0f0f0",
                border_style: "solid",
              },
            },
            media: {
              type: "media",
              parent_id: "card",
              settings: {
                aspect_ratio: "square",
                border_style: "solid",
                corner_radius: 8,
              },
            },
            productTitle: {
              type: "product_title",
              parent_id: "card",
              settings: {
                text_color: "#ff0000",
                alignment: "center",
                padding_top: 6,
              },
            },
            price: {
              type: "price",
              parent_id: "card",
              settings: { installments: true, tax_information: false },
            },
            reviews: { type: "review_stars", parent_id: "card", settings: {} },
            sku: { type: "sku", parent_id: "card", settings: {} },
            swatches: { type: "swatches", parent_id: "card", settings: {} },
            buy: {
              type: "buy_buttons",
              parent_id: "card",
              settings: { quick_add: false },
            },
          },
        },
      },
      order: ["featured"],
    };
    const previewHtml =
      '<section data-featured-collection="featured"><div class="mx-auto"><div class="featured-collection-header"><div data-theme-block-id="title"><h2>Old title</h2></div><a data-theme-block-id="view" data-slot="button">View all</a></div><div id="items" class="featured-collection-grid"><article data-theme-product-card><div data-theme-product-part="media"><a class="aspect-[4/5]"></a></div><h3 data-theme-product-part="product_title">Old product</h3><div data-theme-product-part="price">$10</div><p data-theme-product-part="price-installments"></p><p data-theme-product-part="price-tax-information"></p><p data-theme-product-part="review_stars"></p><p data-theme-product-part="sku"></p><div data-theme-product-part="swatches"></div><div data-theme-product-part="buy_buttons"></div></article><article data-theme-product-card></article></div><nav data-theme-carousel-navigation></nav></div></section>';
    const template = root.querySelector<HTMLElement>("[data-theme-template]")!;
    template.innerHTML = `<div id="featured" data-theme-section-id="featured">${previewHtml}</div>`;
    nodes.set("featured", template.firstElementChild as HTMLElement);

    applyPreviewDocument(root, "body", previewDocument, nodes);

    const section = nodes
      .get("featured")
      ?.querySelector<HTMLElement>("[data-featured-collection]");
    const list = section?.querySelector<HTMLElement>(
      ".featured-collection-carousel",
    );
    const card = section?.querySelector<HTMLElement>(
      "[data-theme-product-card]",
    );
    expect(section?.style.backgroundColor).toBe("rgb(18, 52, 86)");
    expect(section?.style.paddingTop).toBe("36px");
    expect(list?.classList.contains("featured-mobile-carousel")).toBe(true);
    expect(list?.style.getPropertyValue("--featured-columns")).toBe("3");
    expect(
      list?.children.item(1) &&
        (list.children.item(1) as HTMLElement).style.display,
    ).toBe("none");
    expect(section?.querySelector("h2")?.textContent).toBe("Fresh picks");
    expect(
      section?.querySelector<HTMLAnchorElement>(".featured-collection-header a")
        ?.textContent,
    ).toBe("Browse all");
    expect(
      section?.querySelector<HTMLAnchorElement>(".featured-collection-header a")
        ?.target,
    ).toBe("_blank");
    expect(card?.style.backgroundColor).toBe("rgb(240, 240, 240)");
    expect(card?.style.rowGap).toBe("9px");
    expect(
      card?.querySelector<HTMLElement>(
        "[data-theme-product-part='product_title']",
      )?.style.color,
    ).toBe("rgb(255, 0, 0)");
    expect(
      card?.querySelector<HTMLElement>(
        "[data-theme-product-part='price-installments']",
      )?.style.display,
    ).toBe("");
    expect(
      card?.querySelector<HTMLElement>(
        "[data-theme-product-part='buy_buttons']",
      )?.style.display,
    ).toBe("none");
    expect(
      section?.querySelector<HTMLElement>("[data-theme-carousel-navigation]")
        ?.style.display,
    ).toBe("");
    root.remove();
  });

  it("builds and updates a new Featured collection in the unsaved preview", () => {
    const root = document.createElement("div");
    root.innerHTML = '<div data-theme-template="home.default"></div>';
    document.body.append(root);
    const nodes = new Map<string, HTMLElement>();
    const documentState: ThemeTemplateDocument = {
      sections: {
        featured: {
          type: "featured_collection",
          settings: {
            type: "grid",
            product_count: 4,
            columns: 3,
            mobile_columns: "2",
            horizontal_gap: 10,
            vertical_gap: 20,
            padding_top: 36,
          },
          block_order: [
            "header",
            "title",
            "view",
            "card",
            "media",
            "product-title",
            "price",
          ],
          blocks: {
            header: { type: "collection_header", settings: { gap: 12 } },
            title: {
              type: "collection_title",
              parent_id: "header",
              settings: { text: "Fresh picks" },
            },
            view: {
              type: "view_all_button",
              parent_id: "header",
              settings: { label: "Browse all" },
            },
            card: { type: "product_card", settings: { vertical_gap: 8 } },
            media: { type: "media", parent_id: "card", settings: {} },
            "product-title": {
              type: "product_title",
              parent_id: "card",
              settings: {},
            },
            price: { type: "price", parent_id: "card", settings: {} },
          },
        },
      },
      order: ["featured"],
    };

    applyPreviewDocument(root, "body", documentState, nodes);

    const section = nodes
      .get("featured")
      ?.querySelector<HTMLElement>("[data-featured-collection]");
    const list = section?.querySelector<HTMLElement>(
      ".featured-collection-grid",
    );
    expect(section).toBeTruthy();
    expect(section?.querySelector("h2")?.textContent).toBe("Fresh picks");
    expect(section?.querySelectorAll("[data-theme-product-card]")).toHaveLength(
      8,
    );
    expect(section?.style.paddingTop).toBe("36px");
    expect(list?.style.gridTemplateColumns).toBe("repeat(3, minmax(0, 1fr))");
    expect(list?.children[4]).toHaveProperty("style.display", "none");

    documentState.sections!.featured!.settings!.type = "carousel";
    documentState.sections!.featured!.settings!.carousel_on_mobile = true;
    applyPreviewDocument(root, "body", documentState, nodes);

    const carousel = section?.querySelector<HTMLElement>(
      ".featured-collection-carousel",
    );
    expect(carousel?.style.gridAutoFlow).toBe("column");
    expect(carousel?.style.overflowX).toBe("auto");
    expect(
      section?.querySelector<HTMLElement>("[data-theme-carousel-navigation]")
        ?.style.display,
    ).toBe("");
    root.remove();
  });

  it("previews shared storefront section frame settings before saving", () => {
    const root = document.createElement("div");
    root.innerHTML =
      '<div data-theme-template="home.default"><div id="rail" data-theme-section-id="rail" data-theme-section-type="product_rail"><section data-theme-section-frame="rail"><div data-theme-section-content></div></section></div></div>';
    document.body.append(root);
    const node = root.querySelector<HTMLElement>("#rail")!;
    const nodes = new Map([["rail", node]]);
    applyPreviewDocument(
      root,
      "body",
      {
        sections: {
          rail: {
            type: "product_rail",
            settings: {
              background_color: "#102030",
              text_color: "#abcdef",
              padding_top: 18,
              padding_bottom: 36,
              gap: 14,
              width: "full",
            },
            block_order: [],
            blocks: {},
          },
        },
        order: ["rail"],
      },
      nodes,
    );
    const frame = node.querySelector<HTMLElement>("[data-theme-section-frame]");
    const content = node.querySelector<HTMLElement>(
      "[data-theme-section-content]",
    );
    expect(frame?.style.backgroundColor).toBe("rgb(16, 32, 48)");
    expect(content?.style.color).toBe("rgb(171, 205, 239)");
    expect(content?.style.paddingTop).toBe(
      "calc(18px * var(--cms-section-spacing-scale, 1))",
    );
    expect(content?.style.paddingBottom).toBe(
      "calc(36px * var(--cms-section-spacing-scale, 1))",
    );
    expect(content?.style.gap).toBe("14px");
    expect(content?.style.maxWidth).toBe("none");
    root.remove();
  });

  it("limits a product rail and switches it to a grid in the live preview", () => {
    const root = document.createElement("div");
    root.innerHTML =
      '<div data-theme-template="home.default"><div id="rail" data-theme-section-id="rail" data-theme-section-type="product_rail"><section data-theme-section-frame="rail"><div data-theme-section-content><div data-theme-section-header><h2>Comfort</h2><a>View all</a></div><div data-theme-carousel-navigation><button type="button">Previous</button><button type="button">Next</button><div class="swiper-wrapper"><div class="swiper-slide"></div><div class="swiper-slide"></div><div class="swiper-slide"></div></div></div></div></section></div></div>';
    document.body.append(root);
    const node = root.querySelector<HTMLElement>("#rail")!;
    applyPreviewDocument(
      root,
      "body",
      {
        sections: {
          rail: {
            type: "product_rail",
            settings: { heading: "Comfort", layout: "grid", limit: 2 },
            block_order: [],
            blocks: {},
          },
        },
        order: ["rail"],
      },
      new Map([["rail", node]]),
    );
    const slides = [...node.querySelectorAll<HTMLElement>(".swiper-slide")];
    const wrapper = node.querySelector<HTMLElement>(".swiper-wrapper");
    expect(slides.map((slide) => slide.style.display)).toEqual([
      "",
      "",
      "none",
    ]);
    expect(wrapper?.style.display).toBe("grid");
    expect(
      node.querySelector<HTMLElement>("[data-theme-section-header] a")?.style
        .display,
    ).toBe("none");
    expect(
      node.querySelector<HTMLElement>("[data-theme-carousel-navigation] button")
        ?.style.display,
    ).toBe("none");
    root.remove();
  });

  it("previews every titled payment icons block in the footer", () => {
    const root = document.createElement("div");
    root.innerHTML =
      '<div data-theme-section-group="footer"><div id="footer" data-theme-section-id="footer" data-theme-section-type="theme_footer"><footer data-theme-footer><div data-theme-footer-content><div data-theme-footer-layout></div><div data-theme-footer-bottom><div data-theme-footer-region></div><div data-theme-footer-payment-icons></div></div></div></footer></div></div>';
    document.body.append(root);
    const node = root.querySelector<HTMLElement>("#footer")!;
    const nodes = new Map([["footer", node]]);

    applyPreviewDocument(
      root,
      "footer",
      {
        sections: {
          footer: {
            type: "theme_footer",
            settings: {
              footer_blocks_initialized: true,
              footer_show_payment_icons: true,
            },
            block_order: ["payments", "more-payments"],
            blocks: {
              payments: {
                type: "footer_payment_icons",
                settings: {
                  title: "We accept",
                  payment_methods: "Visa, PayPal",
                },
              },
              "more-payments": {
                type: "footer_payment_icons",
                settings: {
                  title: "More ways to pay",
                  payment_methods: "Klarna",
                },
              },
            },
          },
        },
        order: ["footer"],
      },
      nodes,
    );

    const paymentGroups = node.querySelectorAll<HTMLElement>(
      "[data-theme-footer-payment-block-id]",
    );
    expect(paymentGroups).toHaveLength(2);
    expect(paymentGroups[0].textContent).toContain("We accept");
    expect(
      paymentGroups[0].querySelector("ul")?.getAttribute("aria-label"),
    ).toBe("We accept");
    expect(
      paymentGroups[0].querySelector("li[aria-label='Visa']"),
    ).toBeInTheDocument();
    expect(
      paymentGroups[0].querySelector("li[aria-label='PayPal']"),
    ).toBeInTheDocument();
    expect(paymentGroups[1].textContent).toContain("More ways to pay");
    expect(
      paymentGroups[1].querySelector("li[aria-label='Klarna']"),
    ).toBeInTheDocument();
    root.remove();
  });

  it("applies footer colors, spotlight content, and visibility settings", () => {
    const root = document.createElement("div");
    root.innerHTML =
      '<div data-theme-section-group="footer"><div id="footer" data-theme-section-id="footer"><footer data-theme-footer data-theme-base-path="/us/en"><div data-theme-footer-spotlight><div><h2 data-theme-footer-spotlight-title>Default message</h2><a data-theme-footer-spotlight-link href="/us/en/products">Default action<svg></svg></a></div></div><div data-theme-footer-content><div data-theme-footer-layout></div></div><div data-theme-footer-bottom><div data-theme-footer-region></div><div data-theme-footer-social-links></div><div data-theme-footer-copyright></div><div data-theme-footer-payment-icons></div></div></footer></div></div>';
    document.body.append(root);
    const node = root.querySelector<HTMLElement>("#footer")!;

    applyPreviewDocument(
      root,
      "footer",
      {
        sections: {
          footer: {
            type: "theme_footer",
            settings: {
              background_color: "#102030",
              text_color: "#f0e0d0",
              padding_bottom: 22,
              footer_spotlight_text: "A thoughtful find.",
              footer_spotlight_link_label: "Browse gifts",
              footer_spotlight_link: "/gifts",
              footer_spotlight_background_color: "#f26432",
              footer_spotlight_text_color: "#251e24",
              footer_spotlight_button_background_color: "#251e24",
              footer_spotlight_button_text_color: "#ffffff",
              footer_show_region_selector: false,
              footer_show_social_links: false,
              footer_show_copyright: false,
            },
            blocks: {},
            block_order: [],
          },
        },
        order: ["footer"],
      },
      new Map([["footer", node]]),
    );

    const footer = node.querySelector<HTMLElement>("[data-theme-footer]")!;
    const spotlight = node.querySelector<HTMLElement>(
      "[data-theme-footer-spotlight]",
    )!;
    expect(footer.style.backgroundColor).toBe("rgb(16, 32, 48)");
    expect(footer.style.color).toBe("rgb(240, 224, 208)");
    expect(footer.style.getPropertyValue("--footer-pad-bottom")).toBe("22px");
    expect(
      node.querySelector("[data-theme-footer-spotlight-title]")?.textContent,
    ).toBe("A thoughtful find.");
    const action = node.querySelector<HTMLAnchorElement>(
      "[data-theme-footer-spotlight-link]",
    )!;
    expect(action.textContent).toContain("Browse gifts");
    expect(action.getAttribute("href")).toBe("/us/en/gifts");
    expect(spotlight.style.backgroundColor).toBe("rgb(242, 100, 50)");
    expect(
      node.querySelector<HTMLElement>("[data-theme-footer-region]")?.style
        .display,
    ).toBe("none");
    expect(
      node.querySelector<HTMLElement>("[data-theme-footer-social-links]")?.style
        .display,
    ).toBe("none");
    expect(
      node.querySelector<HTMLElement>("[data-theme-footer-copyright]")?.style
        .display,
    ).toBe("none");
    root.remove();
  });

  it("builds block and section selection payloads", () => {
    const postMessage = vi.fn();
    window.parent = { postMessage } as unknown as Window;
    sendThemeBuilderSelection("https://admin.example", "hero", "title");
    expect(postMessage).toHaveBeenCalledWith(
      {
        type: "THEME_BUILDER_SELECT",
        payload: {
          entity: "block",
          id: "title",
          sectionId: "hero",
          blockId: "title",
        },
      },
      "https://admin.example",
    );
    sendThemeBuilderSelection("https://admin.example", "hero");
    expect(postMessage).toHaveBeenLastCalledWith(
      {
        type: "THEME_BUILDER_SELECT",
        payload: { entity: "section", id: "hero", sectionId: "hero" },
      },
      "https://admin.example",
    );
  });
});
