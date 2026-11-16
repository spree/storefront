import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { storefrontGoto } from "./marketplace-fixtures";
import { completeRequiredPersonalization } from "./pdp-helpers";
import { fetchStoreCart, findLineByProductSku } from "./store-cart";

const APPROVED_SLUG = "m38-lab-approved";
const REJECTED_SLUG = "m38-lab-rejected";
const APPROVED_PATH = `/us/en/products/${APPROVED_SLUG}`;
const screenshotRoot = join(
  process.cwd(),
  "..",
  "docs",
  "evidence",
  "oddkeeps-handmade",
  "screenshots",
);
const repoRoot = join(process.cwd(), "..");

function dockerRailsRunner(scriptName: string) {
  const localPath = join(repoRoot, "scripts", "contract-closure", scriptName);
  const scriptBody = readFileSync(localPath, "utf8");
  execSync(
    `docker exec -i spree-unified-marketplace-web sh -c "cat > /rails/tmp/${scriptName}"`,
    { input: scriptBody, stdio: ["pipe", "inherit", "inherit"] },
  );
  execSync(
    `docker exec spree-unified-marketplace-web bash -lc "cd /rails && bin/rails runner tmp/${scriptName}"`,
    { stdio: "inherit", timeout: 300_000 },
  );
}

async function labAddProductToCart(
  page: import("@playwright/test").Page,
  path: string,
) {
  const productSlug = path.replace(/\/$/, "").split("/").pop() ?? path;
  await storefrontGoto(page, path);
  await completeRequiredPersonalization(page);
  const add = page
    .getByRole("main")
    .getByRole("button", { name: /add to cart/i });
  await expect(add).toBeEnabled({ timeout: 30_000 });
  await add.click();
  const cartDialog = page.getByRole("dialog", { name: /cart/i });
  if (!(await cartDialog.isVisible().catch(() => false))) {
    await page.getByRole("button", { name: /open cart/i }).click();
  }
  await expect(cartDialog).toBeVisible({ timeout: 30_000 });
  await expect
    .poll(
      async () => {
        try {
          const cart = await fetchStoreCart(page);
          return Boolean(findLineByProductSku(cart, productSlug));
        } catch {
          return false;
        }
      },
      { timeout: 120_000 },
    )
    .toBe(true);
  await page.keyboard.press("Escape");
}

function shot(page: import("@playwright/test").Page, name: string) {
  return page.screenshot({
    path: join(screenshotRoot, name),
    fullPage: true,
  });
}

async function fillGuestCheckoutAddress(page: import("@playwright/test").Page) {
  const email = page.getByPlaceholder(/email address/i);
  await expect(email).toHaveCount(1, { timeout: 30_000 });
  await email.fill("m39-storefront-buyer@oddkeeps-test.example");

  await page.getByLabel(/country/i).selectOption({ label: "United States" });
  await page
    .getByLabel(/first name/i)
    .first()
    .fill("M39");
  await page
    .getByLabel(/last name/i)
    .first()
    .fill("Storefront");
  await page
    .getByLabel(/^address$/i)
    .first()
    .fill("123 Test Lane");
  await page.getByLabel(/city/i).first().fill("New York");
  await page
    .getByLabel(/zip|postal code/i)
    .first()
    .fill("10001");
  await page.getByLabel(/phone/i).first().fill("5555550100");
  await page
    .getByLabel(/state|province/i)
    .first()
    .selectOption({ label: "New York" });
}

async function waitForLabCartAddressSaved(
  page: import("@playwright/test").Page,
) {
  await page.getByRole("heading", { name: /shipping address/i }).click();
  await page.getByRole("heading", { name: /shipping method/i }).click();
  await expect
    .poll(
      async () => {
        const cart = await fetchStoreCart(page);
        return cart.shipping_address?.address1 === "123 Test Lane";
      },
      { timeout: 120_000 },
    )
    .toBe(true);
}

async function dismissStripeDeveloperTools(
  page: import("@playwright/test").Page,
) {
  await page.evaluate(() => {
    for (const frame of document.querySelectorAll(
      'iframe[title="Stripe developer tools frame"]',
    )) {
      frame.remove();
    }
  });
}

function placeOrderButton(
  page: import("@playwright/test").Page,
  isMobile: boolean,
) {
  if (isMobile) {
    return page
      .locator("[data-checkout-mobile-action]")
      .getByRole("button", { name: /place order|pay now/i });
  }
  return page.getByRole("button", { name: /place order|pay now/i });
}

test.describe("M3.9 lab authenticity storefront", () => {
  test.beforeAll(() => {
    dockerRailsRunner("m39-enable-lab-enforcement.rb");
    dockerRailsRunner("m39-lab-bootstrap.rb");
    dockerRailsRunner("m39-lab-storefront-payment-prep.rb");
  });

  test.afterAll(() => {
    dockerRailsRunner("m39-lab-bootstrap.rb");
    dockerRailsRunner("m39-restore-lab-enforcement.rb");
  });

  test("eligible catalog, PDP, checkout, and blocked slug", async ({
    page,
  }, testInfo) => {
    test.setTimeout(600_000);
    const tag = testInfo.project.name.includes("mobile")
      ? "m39-mobile"
      : "m39-desktop";

    await page.goto("/us/en/products");
    await expect(page.getByText(/m38 approved listing/i).first()).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByText(/m38 lab rejected/i)).toHaveCount(0);
    await shot(page, `${tag}-01-products.png`);

    await labAddProductToCart(page, APPROVED_PATH);
    await shot(page, `${tag}-02-pdp-approved.png`);
    await page.goto("/us/en/cart");
    await expect(page.getByText(/m38 approved listing/i).first()).toBeVisible({
      timeout: 60_000,
    });
    await shot(page, `${tag}-03-cart.png`);

    const checkout = page
      .getByRole("link", { name: /proceed to checkout|checkout/i })
      .first();
    await expect(checkout).toBeVisible({ timeout: 30_000 });
    const href = await checkout.getAttribute("href");
    expect(href).toMatch(/\/checkout\/cart_/);
    await page.goto(href!);
    await shot(page, `${tag}-04-checkout-shell.png`);

    const isMobile = testInfo.project.name.includes("mobile");
    await fillGuestCheckoutAddress(page);
    await waitForLabCartAddressSaved(page);

    const shippingSection = page.locator("#checkout-section-shipping");
    const shippingRate = shippingSection.getByRole("radio").first();
    await expect(shippingRate).toBeVisible({ timeout: 120_000 });
    await shippingRate.check();
    await shot(page, `${tag}-05-shipping.png`);

    const paymentSection = page.locator("#checkout-section-payment");
    await paymentSection.scrollIntoViewIfNeeded();
    await expect(paymentSection.getByText(/m39 lab check/i)).toBeVisible({
      timeout: 60_000,
    });
    const checkMethod = paymentSection.getByRole("radio", {
      name: /m39 lab check/i,
    });
    if ((await checkMethod.count()) > 0) {
      await checkMethod.check();
    }
    await expect(paymentSection.locator("iframe")).toHaveCount(0);

    const policy = page.getByRole("checkbox", { name: /i agree/i });
    await policy.scrollIntoViewIfNeeded();
    await expect(policy).toBeVisible({ timeout: 15_000 });
    await policy.check();

    const placeOrder = placeOrderButton(page, isMobile);
    await expect(async () => {
      await dismissStripeDeveloperTools(page);
      await placeOrder.scrollIntoViewIfNeeded();
      await expect(placeOrder).toBeEnabled({ timeout: 15_000 });
      await placeOrder.click({ timeout: 15_000 });
      await page.waitForURL(/order-placed/, { timeout: 90_000 });
    }).toPass({ timeout: isMobile ? 240_000 : 180_000 });
    await expect(page.getByText(/thanks for your order/i)).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(/R\d+/).first()).toBeVisible();
    await shot(page, `${tag}-06-order-placed.png`);
  });

  test("rejected slug is not a purchasable PDP", async ({ page }, testInfo) => {
    const tag = testInfo.project.name.includes("mobile")
      ? "m39-mobile"
      : "m39-desktop";
    await page.goto(`/us/en/products/${REJECTED_SLUG}`);
    await expect(
      page.getByRole("heading", { name: /page not found/i }),
    ).toBeVisible({ timeout: 30_000 });
    await shot(page, `${tag}-07-rejected-pdp.png`);
  });
});
