import AxeBuilder from "@axe-core/playwright";
import playwright from "@playwright/test";

const { expect, test } = playwright;

type AxeIssue = {
  id: string;
  impact: string | null;
  description: string;
  nodes: Array<{
    target: string[];
    html: string;
    failureSummary?: string;
    any: Array<{ data?: unknown }>;
  }>;
};

const VIEWPORTS = [
  { width: 375, height: 812 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
] as const;

const STAR_SELLER = "/us/en/sellers/dev-badge-art-preview";
const VERIFIED = "/us/en/sellers/dev-badge-verified";
const MARKETPLACE_PICK = "/us/en/sellers/dev-badge-marketplace-pick";
const NO_BADGES = "/us/en/sellers/dev-badge-no-badges";
const PRODUCT =
  "/us/en/products/dev-dataset-dev-badge-art-preview-badge-fixture-product";

async function expectNoSeriousAxeViolations(page: any, surface: string) {
  await page.evaluate(() => {
    for (const animation of document.getAnimations()) {
      if (animation.effect?.getTiming().iterations !== Infinity) {
        animation.finish();
      }
    }
  });
  const results = await new AxeBuilder({ page }).include(surface).analyze();
  const seriousViolations = (results as { violations: AxeIssue[] }).violations
    .filter((violation) =>
      ["critical", "serious"].includes(violation.impact ?? ""),
    )
    .map(({ id, impact, description, nodes }) => ({
      id,
      impact,
      description,
      nodes: nodes.map((node) => ({
        target: node.target,
        html: node.html,
        failureSummary: node.failureSummary,
        checks: node.any.map((check) => check.data),
      })),
    }));

  expect(seriousViolations, `${surface} axe violations`).toEqual([]);
}

test.describe("seller recognition badges", () => {
  test("seller storefront displays earned badges and explains them accessibly", async ({
    page,
  }: {
    page: any;
  }) => {
    await page.goto(STAR_SELLER);
    const row = page
      .locator('[data-seller-badge-row="seller_shop"]')
      .filter({ has: page.locator('[data-seller-badge="highly_rated"]') });
    const highlyRated = row.locator('[data-seller-badge="highly_rated"]');

    await expect(row).toBeVisible();
    await expect(highlyRated).toBeVisible();

    const trigger = row.locator('[data-seller-badge-trigger="highly_rated"]');
    await expect(trigger).toBeVisible();
    await expect(trigger).toHaveAccessibleName(/highly rated/i);
    await trigger.focus();
    await page.keyboard.press("Enter");
    const popover = page.locator("[data-slot=popover-content]");
    await expect(popover).toBeVisible();
    await expect(popover).toContainText(
      "Consistently strong ratings from buyers.",
    );
    await page.keyboard.press("Escape");
    await expect(popover).toBeHidden();
    await expect(trigger).toBeFocused();

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize(viewport);
      await expect(row).toBeVisible();
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      );
      expect(overflow, `horizontal overflow at ${viewport.width}px`).toBe(
        false,
      );
    }
  });

  test("a seller without awards has no recognition row", async ({
    page,
  }: {
    page: any;
  }) => {
    await page.goto(NO_BADGES);
    await expect(page.locator("[data-seller-badge-row]")).toHaveCount(0);
  });

  test("verified and operator-picked awards match live seller records", async ({
    page,
  }: {
    page: any;
  }) => {
    await page.goto(VERIFIED);
    await expect(
      page.locator('[data-seller-badge="verified_seller"]').first(),
    ).toBeVisible();
    await expect(
      page.locator('[data-seller-badge-row] [data-seller-badge="star_seller"]'),
    ).toHaveCount(0);

    await page.goto(MARKETPLACE_PICK);
    await expect(
      page.locator('[data-seller-badge="marketplace_pick"]').first(),
    ).toBeVisible();
  });

  test("PDP buy box shows Star Seller on the avatar only", async ({
    page,
  }: {
    page: any;
  }) => {
    await page.goto(PRODUCT);
    await expect(
      page.locator("[data-star-seller-avatar='true']").first(),
    ).toBeVisible();
    await expect(page.locator('[data-seller-badge-row="pdp"]')).toHaveCount(0);
    await expect(
      page.locator('[data-merchandising-pdp-signal="top_shop"]'),
    ).toHaveCount(0);

    await page.goto(`${STAR_SELLER}?tab=products`);
    await expect(
      page.locator("[data-star-seller-avatar='true']").first(),
    ).toBeVisible();
    await expect(page.locator("[data-seller-badge-trust]")).toHaveCount(0);
    await expect(
      page.locator('[data-merchandising-signal="top_shop"]'),
    ).toHaveCount(0);
  });

  for (const width of [375, 1440]) {
    test(`badge surfaces have no serious axe violations at ${width}px`, async ({
      page,
    }: {
      page: any;
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(STAR_SELLER);
      const shopRow = page
        .locator('[data-seller-badge-row="seller_shop"]')
        .filter({ has: page.locator('[data-seller-badge="highly_rated"]') });
      await expect(shopRow).toBeVisible();
      await expectNoSeriousAxeViolations(
        page,
        '[data-seller-badge-row="seller_shop"]',
      );

      const shopTrigger = shopRow.locator(
        '[data-seller-badge-trigger="highly_rated"]',
      );
      await shopTrigger.focus();
      await page.keyboard.press("Enter");
      const explanation = page.getByRole("dialog");
      await expect(explanation).toBeVisible();
      await expect(explanation).toHaveCSS("opacity", "1");
      await expectNoSeriousAxeViolations(page, '[role="dialog"]');
      await page.keyboard.press("Escape");
      await expect(shopTrigger).toBeFocused();

      await page.goto(PRODUCT);
      const pdpRow = page
        .locator('[data-seller-badge-row="pdp"]')
        .filter({ has: page.locator('[data-seller-badge="highly_rated"]') })
        .first();
      await expect(pdpRow).toBeVisible();
      await expectNoSeriousAxeViolations(page, '[data-seller-badge-row="pdp"]');

      await page.goto(`${STAR_SELLER}?tab=products`);
      await expect(
        page.locator("[data-seller-badge-trust]").first(),
      ).toBeVisible();
      await expectNoSeriousAxeViolations(page, "[data-seller-badge-trust]");
    });
  }
});
