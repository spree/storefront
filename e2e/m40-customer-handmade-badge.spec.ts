import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { loginBuyerViaApi } from "./buyer-auth";
import { requireLabStoreApiUrl, storefrontGoto } from "./marketplace-fixtures";

const APPROVED_SLUG = "m38-lab-approved";
const REJECTED_SLUG = "m38-lab-rejected";
const SIBLING_SLUG = "m38-lab-submitted";
const APPROVED_PATH = `/us/en/products/${APPROVED_SLUG}`;
const REJECTED_PATH = `/us/en/products/${REJECTED_SLUG}`;
const SIBLING_PATH = `/us/en/products/${SIBLING_SLUG}`;
const CATEGORY_PATH = "/us/en/c/m40-handmade";
const COLLECTION_PATH = "/us/en/collections/m40-handmade";
const SELLER_PATH = "/us/en/sellers/dev-seller-01?tab=products";
const SEARCH_PATH = "/us/en/products?q=M38+Approved";
const BUYER_EMAIL = "m40-handmade-buyer@oddkeeps-test.example";
const BUYER_PASSWORD = "spree123";

const screenshotRoot = join(
  process.cwd(),
  "..",
  "docs",
  "evidence",
  "oddkeeps-handmade",
  "screenshots",
);
const repoRoot = join(process.cwd(), "..");
requireLabStoreApiUrl();

function dockerRailsRunner(
  scriptName: string,
  extraEnv?: Record<string, string>,
) {
  const localPath = join(repoRoot, "scripts", "contract-closure", scriptName);
  const scriptBody = readFileSync(localPath, "utf8");
  execSync(
    `docker exec -i spree-unified-marketplace-web sh -c "cat > /rails/tmp/${scriptName}"`,
    { input: scriptBody, stdio: ["pipe", "inherit", "inherit"] },
  );
  const envFlags = Object.entries(extraEnv ?? {})
    .map(([key, value]) => `-e ${key}=${value}`)
    .join(" ");
  execSync(
    `docker exec ${envFlags} spree-unified-marketplace-web bash -lc "cd /rails && bin/rails runner tmp/${scriptName}"`,
    { stdio: "inherit", timeout: 600_000 },
  );
}

async function revalidateApprovedListing() {
  const port = process.env.STOREFRONT_M40_E2E_PORT || "3310";
  const secret =
    process.env.STOREFRONT_REVALIDATE_SECRET ||
    "oddkeeps-lab-revalidate-dev-only";
  const response = await fetch(
    `http://127.0.0.1:${port}/api/internal/revalidate-product`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ slug: APPROVED_SLUG }),
    },
  );
  if (!response.ok) {
    throw new Error(`Storefront revalidation failed: ${response.status}`);
  }
}

async function openStorefront(
  page: import("@playwright/test").Page,
  path: string,
) {
  await storefrontGoto(page, path);
  await expect(page.locator("main:visible").first()).toBeVisible({
    timeout: 90_000,
  });
}

function projectTag(testInfo: import("@playwright/test").TestInfo) {
  return testInfo.project.name.includes("mobile") ? "mobile" : "desktop";
}

function approvedCard(page: import("@playwright/test").Page) {
  return page
    .locator("article")
    .filter({
      has: page.locator(`a[href*="/products/${APPROVED_SLUG}"]`),
    })
    .first();
}

async function expectVerifiedBadge(
  page: import("@playwright/test").Page,
  visible: boolean,
) {
  const badge = page
    .locator("[data-theme-product-sticky-info]")
    .locator('[data-handmade-verified="true"]');
  if (visible) {
    await expect(badge.first()).toBeVisible();
    await expect(badge.first()).toContainText(/verified handmade/i);
  } else {
    await expect(badge).toHaveCount(0);
  }
}

function shot(
  page: import("@playwright/test").Page,
  name: string,
  testInfo: import("@playwright/test").TestInfo,
) {
  return page.screenshot({
    path: join(screenshotRoot, `m40-${name}-${projectTag(testInfo)}.png`),
    fullPage: true,
  });
}

test.describe("M40 customer handmade certification", () => {
  test.beforeAll(() => {
    dockerRailsRunner("m40-lab-restore-approved.rb");
    dockerRailsRunner("m40-lab-surfaces.rb");
  });

  test.afterAll(() => {
    dockerRailsRunner("m40-lab-restore-approved.rb");
  });

  test("badge is visible on product details, cards, search, category, collection, seller, and recommendations", async ({
    page,
  }, testInfo) => {
    await openStorefront(page, APPROVED_PATH);
    await expect(
      page.getByRole("heading", { name: /m38 approved listing/i }),
    ).toBeVisible();
    await expectVerifiedBadge(page, true);
    await shot(page, "pdp-approved", testInfo);

    await openStorefront(page, SEARCH_PATH);
    await expect(approvedCard(page)).toBeVisible();
    await expect(
      approvedCard(page).locator('[data-handmade-verified="true"]'),
    ).toBeVisible();
    await shot(page, "search-approved", testInfo);

    await openStorefront(page, "/us/en/products");
    await expect(approvedCard(page)).toBeVisible();
    await expect(
      approvedCard(page).locator('[data-handmade-verified="true"]'),
    ).toBeVisible();
    await shot(page, "products-grid", testInfo);

    await openStorefront(page, CATEGORY_PATH);
    await expect(approvedCard(page)).toBeVisible();
    await expect(
      approvedCard(page).locator('[data-handmade-verified="true"]'),
    ).toBeVisible();
    await shot(page, "category", testInfo);

    await openStorefront(page, COLLECTION_PATH);
    await expect(approvedCard(page)).toBeVisible();
    await expect(
      approvedCard(page).locator('[data-handmade-verified="true"]'),
    ).toBeVisible();
    await shot(page, "collection", testInfo);

    await openStorefront(page, SELLER_PATH);
    await expect(approvedCard(page)).toBeVisible();
    await expect(
      approvedCard(page).locator('[data-handmade-verified="true"]'),
    ).toBeVisible();
    await shot(page, "seller-storefront", testInfo);

    await openStorefront(page, SIBLING_PATH);
    await expect(
      page.getByRole("heading", { name: /more from this maker/i }),
    ).toBeVisible();
    await expect(approvedCard(page)).toBeVisible();
    await expect(
      approvedCard(page).locator('[data-handmade-verified="true"]'),
    ).toBeVisible();
    await shot(page, "recommendations", testInfo);

    await openStorefront(page, REJECTED_PATH);
    await expect(
      page.getByRole("heading", { name: /m38 rejected review/i }),
    ).toBeVisible();
    await expectVerifiedBadge(page, false);
    await shot(page, "pdp-rejected", testInfo);
  });

  test("guest is prompted to sign in before reporting authenticity", async ({
    page,
  }) => {
    await page.context().clearCookies();
    await openStorefront(page, APPROVED_PATH);
    await expect(
      page.getByRole("link", {
        name: /sign in to report an authenticity concern/i,
      }),
    ).toBeVisible();
  });

  test("authenticated buyer submits an authenticity concern and can see the favorite badge", async ({
    page,
  }, testInfo) => {
    await loginBuyerViaApi(page, BUYER_EMAIL, BUYER_PASSWORD);
    await openStorefront(page, APPROVED_PATH);
    await page
      .getByRole("button", { name: /report an authenticity concern/i })
      .click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog
      .getByLabel(/what looks wrong/i)
      .fill("M40 browser authenticity concern for this listing.");
    await dialog.getByRole("button", { name: /submit report/i }).click();
    await expect(dialog.getByText(/we received your report/i)).toBeVisible({
      timeout: 30_000,
    });
    await shot(page, "authenticity-report", testInfo);

    await openStorefront(page, APPROVED_PATH);
    const detailsSave = page
      .locator("[data-theme-product-sticky-info]")
      .getByRole("button", { name: /favorites/i });
    if (!(await detailsSave.isVisible())) {
      await openStorefront(page, SEARCH_PATH);
    }
    const save = (await detailsSave.isVisible())
      ? detailsSave
      : approvedCard(page).getByRole("button", { name: /favorites/i });
    await expect(save).toBeEnabled();
    const saved = page.waitForResponse(
      (response) => response.request().method() === "POST",
    );
    await save.click();
    await saved;
    await expect(save).toHaveAccessibleName(/remove from favorites/i);
    await openStorefront(page, "/us/en/account/favorites");
    await expect(approvedCard(page)).toBeVisible();
    await expect(
      approvedCard(page).locator('[data-handmade-verified="true"]'),
    ).toBeVisible();
    await shot(page, "favorites", testInfo);
  });

  test("revoking certification drops the badge on the product page, search, and cards", async ({
    page,
  }) => {
    const port = process.env.STOREFRONT_M40_E2E_PORT || "3310";
    const secret =
      process.env.STOREFRONT_REVALIDATE_SECRET ||
      "oddkeeps-lab-revalidate-dev-only";
    const env = {
      STOREFRONT_REVALIDATE_URL: `http://host.docker.internal:${port}`,
      STOREFRONT_REVALIDATE_SECRET: secret,
    };

    await openStorefront(page, APPROVED_PATH);
    await expectVerifiedBadge(page, true);

    dockerRailsRunner("m40-lab-revoke-and-revalidate.rb", env);
    await revalidateApprovedListing();
    await openStorefront(page, `${APPROVED_PATH}?m40=${Date.now()}`);
    await expectVerifiedBadge(page, false);
    await openStorefront(page, SEARCH_PATH);
    await expect(approvedCard(page)).toBeVisible();
    await expect(
      approvedCard(page).locator('[data-handmade-verified="true"]'),
    ).toHaveCount(0);
    await openStorefront(page, "/us/en/products");
    await expect(
      approvedCard(page).locator('[data-handmade-verified="true"]'),
    ).toHaveCount(0);

    dockerRailsRunner("m40-lab-restore-approved.rb", env);
    await revalidateApprovedListing();
    await openStorefront(page, `${APPROVED_PATH}?m40=${Date.now()}`);
    await expectVerifiedBadge(page, true);
    await openStorefront(page, SEARCH_PATH);
    await expect(
      approvedCard(page).locator('[data-handmade-verified="true"]'),
    ).toBeVisible();
  });
});
