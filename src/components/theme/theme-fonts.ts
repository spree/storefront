const SYSTEM_FONT_STACKS: Record<string, string> = {
  "SF Mono":
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
  Helvetica: "Helvetica, Arial, sans-serif",
  "New York":
    '"New York", "Iowan Old Style", Palatino, "Palatino Linotype", Georgia, serif',
  system_ui: "system-ui, sans-serif",
};

const SAFE_FONT_FAMILY = /^[\p{L}\p{N}][\p{L}\p{N} .'-]{0,80}$/u;
const FONT_WEIGHTS = new Set(["300", "400", "500", "600", "700", "800"]);

export function themeFontStack(family: unknown): string | undefined {
  if (typeof family !== "string") return undefined;
  const name = family.trim();
  if (!name) return undefined;
  const system = SYSTEM_FONT_STACKS[name];
  if (system) return system;
  if (!SAFE_FONT_FAMILY.test(name)) return undefined;
  return `"${name}", sans-serif`;
}

export function themeFontWeight(weight: unknown): string | undefined {
  return typeof weight === "string" && FONT_WEIGHTS.has(weight)
    ? weight
    : undefined;
}

const TYPOGRAPHY_SCALE_KEY =
  /^(?:heading_[1-6]_|paragraph_|(?:body|heading|subheading|accent)_(?:family|weight|size)$)/;

/**
 * Whether the merchant configured the typography scale. Without it, headings
 * and paragraphs keep their component sizes instead of one global scale.
 */
export function themeTypographyScaleCustomized(
  typography: Record<string, unknown> | undefined,
): boolean {
  return Object.entries(typography ?? {}).some(
    ([key, value]) =>
      TYPOGRAPHY_SCALE_KEY.test(key) && value != null && value !== "",
  );
}

export function applyNamedThemeFonts(
  style: Record<string, string>,
  typography: Record<string, unknown> | undefined,
) {
  const bodyStack = themeFontStack(typography?.body_family);
  const headingStack = themeFontStack(typography?.heading_family);
  const subheadingStack = themeFontStack(typography?.subheading_family);
  const accentStack = themeFontStack(typography?.accent_family);
  const bodyWeight = themeFontWeight(typography?.body_weight);
  const subheadingWeight = themeFontWeight(typography?.subheading_weight);
  const headingWeight = themeFontWeight(typography?.heading_weight);
  const accentWeight = themeFontWeight(typography?.accent_weight);
  if (bodyStack) style["--marketplace-body-font"] = bodyStack;
  if (subheadingStack) style["--marketplace-subheading-font"] = subheadingStack;
  if (headingStack) style["--marketplace-heading-font"] = headingStack;
  if (accentStack) style["--marketplace-accent-font"] = accentStack;
  if (bodyWeight) {
    style["--marketplace-body-font-weight"] = bodyWeight;
    style.fontWeight = bodyWeight;
  }
  if (subheadingWeight)
    style["--marketplace-subheading-font-weight"] = subheadingWeight;
  if (headingWeight) style["--marketplace-heading-font-weight"] = headingWeight;
  if (accentWeight) style["--marketplace-accent-font-weight"] = accentWeight;
  applyTypographyScale(style, typography);
}

const FONT_PIXEL_SIZES = new Set([
  "12",
  "13",
  "14",
  "15",
  "16",
  "18",
  "20",
  "24",
  "28",
  "32",
  "36",
  "40",
  "48",
  "56",
  "64",
  "72",
]);

const TEXT_SCALES: Record<string, string> = { s: "0.85", m: "1", l: "1.2" };
const LINE_HEIGHTS: Record<string, string> = {
  tight: "1.15",
  normal: "1.5",
  loose: "1.75",
};
const LETTER_SPACINGS: Record<string, string> = {
  tight: "-0.02em",
  normal: "0em",
  wide: "0.04em",
};
const HEADING_BASES: Record<string, string> = {
  heading_1: "2.5rem",
  heading_2: "2rem",
  heading_3: "1.5rem",
  heading_4: "1.25rem",
  heading_5: "1.125rem",
  heading_6: "1rem",
};
const FONT_ROLES: Record<string, string> = {
  main: "var(--marketplace-body-font)",
  subheading:
    "var(--marketplace-subheading-font, var(--marketplace-body-font))",
  heading: "var(--marketplace-heading-font)",
  accent: "var(--marketplace-accent-font, var(--marketplace-body-font))",
};
const FONT_ROLE_WEIGHTS: Record<string, string> = {
  main: "var(--marketplace-body-font-weight, 400)",
  subheading: "var(--marketplace-subheading-font-weight, 400)",
  heading: "var(--marketplace-heading-font-weight, 400)",
  accent: "var(--marketplace-accent-font-weight, 400)",
};

function choice(
  value: unknown,
  allowed: Record<string, string>,
  fallback: string,
) {
  return typeof value === "string" && allowed[value]
    ? allowed[value]
    : fallback;
}

function applyTypographyScale(
  style: Record<string, string>,
  typography: Record<string, unknown> | undefined,
) {
  const textSize = (key: string, fallback: string) => {
    const value = typography?.[key];
    const size =
      value === "custom"
        ? typography?.[`${key.replace(/_size$/, "")}_custom_size`]
        : value;
    if (typeof size === "string" && /^\d+(?:\.\d+)?$/.test(size)) {
      const pixels = Number(size);
      if (pixels >= 8 && pixels <= 120) return `${pixels}px`;
    }
    return fallback;
  };
  const pixel = (key: string) => {
    const value = typography?.[key];
    return typeof value === "string" && FONT_PIXEL_SIZES.has(value)
      ? `${value}px`
      : undefined;
  };
  const bodySize = pixel("body_size");
  const subheadingSize = pixel("subheading_size");
  const headingSize = pixel("heading_size");
  const accentSize = pixel("accent_size");
  if (bodySize) style["--marketplace-body-size"] = bodySize;
  if (subheadingSize) style["--marketplace-subheading-size"] = subheadingSize;
  if (headingSize) style["--marketplace-heading-size"] = headingSize;
  if (accentSize) style["--marketplace-accent-size"] = accentSize;
  const palette = typography?.palette_color;
  if (typeof palette === "string" && /^#[0-9a-fA-F]{6}$/.test(palette))
    style["--marketplace-inverse-foreground"] = palette;

  const styleDefaults: Record<string, { size: string; line: string }> = {
    paragraph: { size: "m", line: "normal" },
    heading_1: { size: "m", line: "normal" },
    heading_2: { size: "m", line: "normal" },
    heading_3: { size: "m", line: "normal" },
    heading_4: { size: "s", line: "loose" },
    heading_5: { size: "s", line: "loose" },
    heading_6: { size: "s", line: "loose" },
  };
  const paragraphScale = choice(
    typography?.paragraph_size,
    TEXT_SCALES,
    TEXT_SCALES[styleDefaults.paragraph.size],
  );
  style["--marketplace-paragraph-font"] = choice(
    typography?.paragraph_font,
    FONT_ROLES,
    FONT_ROLES.main,
  );
  style["--marketplace-paragraph-size"] = textSize(
    "paragraph_size",
    `calc(1rem * ${paragraphScale})`,
  );
  style["--marketplace-paragraph-line-height"] = choice(
    typography?.paragraph_line_height,
    LINE_HEIGHTS,
    LINE_HEIGHTS[styleDefaults.paragraph.line],
  );
  style["--marketplace-paragraph-letter-spacing"] = choice(
    typography?.paragraph_letter_spacing,
    LETTER_SPACINGS,
    LETTER_SPACINGS.normal,
  );

  for (const [level, base] of Object.entries(HEADING_BASES)) {
    const fallback = styleDefaults[level] ?? { size: "m", line: "normal" };
    const scale = choice(
      typography?.[`${level}_size`],
      TEXT_SCALES,
      TEXT_SCALES[fallback.size],
    );
    style[`--marketplace-${level.replace("_", "")}-font`] = choice(
      typography?.[`${level}_font`],
      FONT_ROLES,
      FONT_ROLES.main,
    );
    style[`--marketplace-${level.replace("_", "")}-size`] = textSize(
      `${level}_size`,
      `calc(${base} * ${scale})`,
    );
    style[`--marketplace-${level.replace("_", "")}-line-height`] = choice(
      typography?.[`${level}_line_height`],
      LINE_HEIGHTS,
      LINE_HEIGHTS[fallback.line],
    );
    style[`--marketplace-${level.replace("_", "")}-letter-spacing`] = choice(
      typography?.[`${level}_letter_spacing`],
      LETTER_SPACINGS,
      LETTER_SPACINGS.normal,
    );
    const textCase = typography?.[`${level}_case`];
    if (textCase === "uppercase" || textCase === "default")
      style[`--marketplace-${level.replace("_", "")}-case`] =
        textCase === "uppercase" ? "uppercase" : "none";
    const role =
      typeof typography?.[`${level}_font`] === "string"
        ? typography[`${level}_font`]
        : "main";
    style[`--marketplace-${level.replace("_", "")}-weight`] =
      FONT_ROLE_WEIGHTS[String(role)] || FONT_ROLE_WEIGHTS.main;
  }
}

export function themeGoogleFontStylesheets(
  typography: Record<string, unknown> | undefined,
): string[] {
  const byFamily = new Map<string, Set<string>>();
  for (const role of ["body", "subheading", "heading", "accent"] as const) {
    const raw = typography?.[`${role}_family`];
    if (typeof raw !== "string") continue;
    const name = raw.trim();
    if (!name || SYSTEM_FONT_STACKS[name] || !SAFE_FONT_FAMILY.test(name))
      continue;
    const weight = themeFontWeight(typography?.[`${role}_weight`]) || "400";
    const weights = byFamily.get(name) ?? new Set<string>();
    weights.add(weight);
    byFamily.set(name, weights);
  }
  return [...byFamily.entries()].map(([family, weights]) => {
    const name = encodeURIComponent(family).replace(/%20/g, "+");
    return `https://fonts.googleapis.com/css2?family=${name}:wght@${[...weights].sort().join(";")}&display=swap`;
  });
}
