import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { expect, type Page, test } from "@playwright/test";

const PHASE = process.env.STOREFRONT_VISUAL_PHASE || "audit";
const EVIDENCE_ROOT = resolve(
  process.cwd(),
  "..",
  "docs",
  "evidence",
  "storefront-visual",
  PHASE,
);
const BUYER_EMAIL =
  process.env.STOREFRONT_VISUAL_BUYER_EMAIL || "dev-buyer-001@example.com";
const BUYER_PASSWORD =
  process.env.STOREFRONT_VISUAL_BUYER_PASSWORD || "spree123";
const PRODUCT_SLUG =
  process.env.STOREFRONT_VISUAL_PRODUCT ||
  "chef-s-walnut-cutting-board-deluxe-edition";
const SELLER_SLUG = process.env.STOREFRONT_VISUAL_SELLER || "dev-seller-01";
const CATEGORY = process.env.STOREFRONT_VISUAL_CATEGORY || "dev-merch-fixtures";
const COLLECTION =
  process.env.STOREFRONT_VISUAL_COLLECTION || "personalized-favorites";

type PageResult = {
  name: string;
  path: string;
  status: number | null;
  finalUrl: string;
  overflowPx: number;
  overflowOffenders: string[];
  imagesMissingAlt: number;
  brokenImages: number;
  h1Count: number;
  consoleErrors: string[];
  screenshot: string;
};

async function settle(page: Page) {
  await page.waitForLoadState("domcontentloaded");
  await page
    .waitForLoadState("networkidle", { timeout: 20_000 })
    .catch(() => undefined);
  await page.evaluate(async () => {
    const step = Math.max(400, Math.floor(window.innerHeight * 0.8));
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((done) => setTimeout(done, 120));
    }
    window.scrollTo(0, 0);
  });
  await page
    .waitForLoadState("networkidle", { timeout: 10_000 })
    .catch(() => undefined);
  await page.waitForTimeout(600);
}

async function inspect(page: Page) {
  return page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const overflowPx = Math.max(
      0,
      document.documentElement.scrollWidth - viewportWidth,
    );
    const offenders: string[] = [];
    if (overflowPx > 0) {
      for (const element of Array.from(
        document.body.querySelectorAll<HTMLElement>("*"),
      )) {
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 || rect.right <= viewportWidth + 1) continue;
        const style = getComputedStyle(element);
        if (style.position === "fixed") continue;
        let clipped = false;
        for (
          let parent = element.parentElement;
          parent;
          parent = parent.parentElement
        ) {
          const overflowX = getComputedStyle(parent).overflowX;
          if (
            overflowX === "hidden" ||
            overflowX === "auto" ||
            overflowX === "scroll" ||
            overflowX === "clip"
          ) {
            clipped = parent.getBoundingClientRect().right <= viewportWidth + 1;
            if (clipped) break;
          }
        }
        if (clipped) continue;
        const id = element.id ? `#${element.id}` : "";
        const classes = (element.getAttribute("class") || "")
          .split(/\s+/)
          .slice(0, 4)
          .join(".");
        offenders.push(
          `${element.tagName.toLowerCase()}${id}${classes ? `.${classes}` : ""} right=${Math.round(rect.right)}`,
        );
        if (offenders.length >= 8) break;
      }
    }
    const images = Array.from(document.images);
    return {
      overflowPx,
      overflowOffenders: offenders,
      imagesMissingAlt: images.filter((image) => !image.hasAttribute("alt"))
        .length,
      brokenImages: images.filter(
        (image) =>
          image.complete && image.naturalWidth === 0 && image.currentSrc,
      ).length,
      h1Count: document.querySelectorAll("h1").length,
    };
  });
}

async function capture(
  page: Page,
  viewport: string,
  name: string,
  path: string,
  results: PageResult[],
) {
  const consoleErrors: string[] = [];
  const onConsole = (message: { type(): string; text(): string }) => {
    if (message.type() === "error")
      consoleErrors.push(message.text().slice(0, 240));
  };
  page.on("console", onConsole);
  let status: number | null = null;
  try {
    const response = await page.goto(path, {
      waitUntil: "domcontentloaded",
      timeout: 120_000,
    });
    status = response?.status() ?? null;
    await settle(page);
  } catch (error) {
    consoleErrors.push(
      `navigation: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  const directory = join(EVIDENCE_ROOT, viewport);
  mkdirSync(directory, { recursive: true });
  const screenshot = join(directory, `${name}.png`);
  await page
    .screenshot({ path: screenshot, fullPage: true, timeout: 120_000 })
    .catch(async () => {
      await page.screenshot({ path: screenshot, timeout: 60_000 });
    });
  const details = await inspect(page).catch(() => ({
    overflowPx: -1,
    overflowOffenders: [],
    imagesMissingAlt: -1,
    brokenImages: -1,
    h1Count: -1,
  }));
  page.off("console", onConsole);
  results.push({
    name,
    path,
    status,
    finalUrl: page.url(),
    ...details,
    consoleErrors: consoleErrors.slice(0, 6),
    screenshot: screenshot
      .replace(resolve(process.cwd(), "..") + "\\", "")
      .replaceAll("\\", "/"),
  });
}

async function signIn(page: Page) {
  await page.goto("/us/en/account", { waitUntil: "domcontentloaded" });
  const email = page.getByLabel(/^email$/i);
  const overview = page.getByRole("heading", { name: /account overview/i });
  await expect(email.or(overview)).toBeVisible({ timeout: 120_000 });
  if (await overview.isVisible().catch(() => false)) return;
  await email.fill(BUYER_EMAIL);
  await page.getByLabel(/^password$/i).fill(BUYER_PASSWORD);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await expect(overview).toBeVisible({ timeout: 120_000 });
}

async function firstHref(page: Page, pattern: RegExp): Promise<string | null> {
  const hrefs = await page
    .locator("a[href]")
    .evaluateAll((anchors) =>
      anchors.map((anchor) => anchor.getAttribute("href") || ""),
    );
  return hrefs.find((href) => pattern.test(href)) ?? null;
}

test("storefront visual gallery", async ({ page }, testInfo) => {
  const viewport = testInfo.project.name;
  const results: PageResult[] = [];
  const base = "/us/en";

  const publicPages: Array<[string, string]> = [
    ["home", `${base}`],
    ["search", `${base}/products?q=walnut`],
    ["search-empty", `${base}/products?q=zzzznomatchzzzz`],
    ["products", `${base}/products`],
    ["category", `${base}/c/${CATEGORY}`],
    ["collection", `${base}/collections/${COLLECTION}`],
    ["product", `${base}/products/${PRODUCT_SLUG}`],
    ["shops", `${base}/shops`],
    ["seller-shop", `${base}/sellers/${SELLER_SLUG}`],
    ["seller-shop-reviews", `${base}/sellers/${SELLER_SLUG}?tab=reviews`],
    ["seller-shop-about", `${base}/sellers/${SELLER_SLUG}?tab=about`],
    ["not-found", `${base}/this-route-does-not-exist`],
    ["product-not-found", `${base}/products/this-product-does-not-exist`],
    ["cart-guest", `${base}/cart`],
    ["sign-in", `${base}/account`],
    ["register", `${base}/account/register`],
  ];
  for (const [name, path] of publicPages) {
    await capture(page, viewport, name, path, results);
  }

  await signIn(page);
  const accountPages: Array<[string, string]> = [
    ["account-overview", `${base}/account`],
    ["account-orders", `${base}/account/orders`],
    ["account-favorites", `${base}/account/favorites`],
    ["account-followed-shops", `${base}/account/followed-shops`],
    ["account-messages", `${base}/account/messages`],
    ["account-reviews", `${base}/account/reviews`],
    ["account-custom-orders", `${base}/account/custom-orders`],
    ["account-settings-profile", `${base}/account/settings/account`],
    ["account-settings-privacy", `${base}/account/settings/privacy`],
    ["account-settings-security", `${base}/account/settings/security`],
    ["account-addresses", `${base}/account/settings/addresses`],
  ];
  for (const [name, path] of accountPages) {
    await capture(page, viewport, name, path, results);
  }

  await page.goto(`${base}/account/orders`, { waitUntil: "domcontentloaded" });
  await settle(page);
  const orderHref = await firstHref(page, /\/account\/orders\/[^/?#]+$/);
  if (orderHref)
    await capture(page, viewport, "account-order-detail", orderHref, results);

  await page.goto(`${base}/account/messages`, {
    waitUntil: "domcontentloaded",
  });
  await settle(page);
  const threadHref = await firstHref(page, /\/account\/messages\/[^/?#]+$/);
  if (threadHref)
    await capture(
      page,
      viewport,
      "account-message-thread",
      threadHref,
      results,
    );

  await capture(page, viewport, "cart-signed-in", `${base}/cart`, results);
  const checkoutLink = page.getByRole("link", { name: /checkout/i }).first();
  if (await checkoutLink.isVisible().catch(() => false)) {
    const href = await checkoutLink.getAttribute("href");
    if (href) await capture(page, viewport, "checkout", href, results);
  }

  mkdirSync(EVIDENCE_ROOT, { recursive: true });
  writeFileSync(
    join(EVIDENCE_ROOT, `${viewport}.json`),
    `${JSON.stringify(results, null, 2)}\n`,
  );

  const overflowing = results.filter((result) => result.overflowPx > 0);
  testInfo.annotations.push({
    type: "overflow",
    description:
      overflowing
        .map((result) => `${result.name}:${result.overflowPx}px`)
        .join(", ") || "none",
  });
});
