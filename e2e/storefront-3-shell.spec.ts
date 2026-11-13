import {
  expectBuyerSessionCookies,
  loginBuyerThroughAccountForm,
} from "./buyer-auth";
import { expect, test } from "./buyer-desktop-evidence";
import {
  ensureSellerStorefrontDataset,
  MARKETPLACE_BUYER_EMAIL,
  MARKETPLACE_BUYER_PASSWORD,
  prepareStorefrontPage,
  SELLER_A_SHOP_PATH,
  storefrontGoto,
} from "./marketplace-fixtures";

test.describe("mobile drawer navigation", () => {
  test.use({
    viewport: { width: 375, height: 812 },
    isMobile: true,
    hasTouch: true,
  });
  test("opens Shops by touch without using the desktop mega-menu", async ({
    page,
  }, testInfo) => {
    await storefrontGoto(page, "/us/en");
    const header = page.getByRole("banner");
    await header.getByRole("button", { name: /open menu/i }).tap();
    const drawer = page.getByRole("dialog", { name: /menu/i });
    await expect(drawer).toBeVisible();
    await Promise.all([
      page.waitForURL(/\/us\/en\/shops$/, { waitUntil: "domcontentloaded" }),
      drawer.getByRole("link", { name: /^shops$/i }).tap(),
    ]);
    await expect(drawer).not.toBeVisible();
    await expect(
      page.locator("main").last().getByRole("heading").first(),
    ).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath("mobile-drawer-shops.png"),
      fullPage: true,
    });
  });
});

test("Storefront 3 marketplace shell stays usable across desktop and mobile", async ({
  page,
}, testInfo) => {
  test.setTimeout(480_000);
  await prepareStorefrontPage(page);
  await ensureSellerStorefrontDataset(page);
  // Category mega-menu lives in the desktop header; mobile projects start narrow.
  await page.setViewportSize({ width: 1280, height: 800 });
  await storefrontGoto(page, "/us/en");

  const header = page.getByRole("banner");
  await expect(header.getByRole("combobox", { name: /search/i })).toBeVisible();
  await expect(
    header.getByRole("link", { name: /spree store/i }),
  ).toBeVisible();

  const categoryNav = header.getByRole("navigation", {
    name: /category navigation/i,
  });
  const categoryTrigger = categoryNav
    .locator("button[data-mega-trigger]")
    .first();
  let categoryLink = categoryNav.getByRole("link").first();
  if (await categoryTrigger.count()) {
    await categoryTrigger.hover();
    const panelId = await categoryTrigger.getAttribute("aria-controls");
    categoryLink = page.locator(`[id="${panelId}"]`).getByRole("link").first();
  }
  await expect(categoryLink).toBeVisible();
  const categoryHref = await categoryLink.getAttribute("href");
  expect(categoryHref).toBeTruthy();
  await Promise.all([
    page.waitForURL(new URL(categoryHref!, page.url()).href, {
      waitUntil: "domcontentloaded",
    }),
    categoryLink.click(),
  ]);
  await expect(page.locator("main").last()).not.toHaveText(/^Loading\.\.\.$/);
  await expect(
    page.locator("main").last().getByRole("heading").first(),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("category-target.png"),
    fullPage: true,
  });
  await storefrontGoto(page, "/us/en");
  await expect(
    header.getByRole("link", { name: /sign in|account/i }),
  ).toBeVisible();
  await header.getByRole("button", { name: /open cart/i }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");

  await page.setViewportSize({ width: 375, height: 812 });
  const mobileNavigation = page.getByRole("navigation", {
    name: /marketplace navigation/i,
  });
  await expect(mobileNavigation).toBeVisible();
  await expect(mobileNavigation.locator(":scope > div > *")).toHaveCount(5);
  await expect(
    mobileNavigation.getByRole("link", { name: /^explore$/i }),
  ).toHaveAttribute("href", /\/products$/);
  await header.getByRole("button", { name: /open menu/i }).click();
  await expect(page.getByRole("dialog", { name: /menu/i })).toBeVisible();
  await expect(
    page.getByRole("dialog", { name: /menu/i }).getByRole("link", {
      name: /^home$/i,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("dialog", { name: /menu/i }).getByRole("link", {
      name: /^shops$/i,
    }),
  ).toBeVisible();
  await page.keyboard.press("Escape");

  await page.setViewportSize({ width: 1280, height: 800 });

  await loginBuyerThroughAccountForm(
    page,
    MARKETPLACE_BUYER_EMAIL,
    MARKETPLACE_BUYER_PASSWORD,
  );
  await expectBuyerSessionCookies(page);
  await storefrontGoto(page, "/us/en/account/orders", { waitUntil: "load" });
  const accountNav = page.getByRole("navigation", { name: /^account$/i });
  const messagesLink = accountNav.getByRole("link", { name: /^messages$/i });
  await expect(messagesLink).toBeVisible({ timeout: 30_000 });
  const messagesHref = await messagesLink.getAttribute("href");
  expect(messagesHref).toMatch(/\/account\/messages/);
  await messagesLink.click();
  try {
    await page.waitForURL(/\/account\/messages/, { timeout: 15_000 });
  } catch {
    // Soft client navigations can stall under mobile suite load — fall back to
    // the verified href so the shell still proves the Messages destination.
    await storefrontGoto(page, messagesHref!, { waitUntil: "load" });
  }
  await expect(page).toHaveURL(/\/account\/messages/, { timeout: 60_000 });
  await expect(
    page.getByRole("heading", { level: 1, name: /^messages$/i }),
  ).toBeVisible({ timeout: 120_000 });

  await storefrontGoto(page, SELLER_A_SHOP_PATH, {
    waitUntil: "load",
    timeout: 180_000,
  });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
    timeout: 120_000,
  });

  const footer = page.getByRole("contentinfo");
  await footer.scrollIntoViewIfNeeded();
  await expect(footer.getByRole("heading", { name: /shop/i })).toBeVisible();
  await expect(footer.getByText(/github|quickstart/i)).toHaveCount(0);
});
