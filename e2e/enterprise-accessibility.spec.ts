import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { expectBuyerAccountShell } from "./buyer-auth";
import {
  MARKETPLACE_PRODUCT_A,
  requireLabStoreApiUrl,
  storefrontGoto,
} from "./marketplace-fixtures";
import { addProductToCart } from "./pdp-helpers";
import { fetchStoreCart } from "./store-cart";

const RUN = process.env.ENTERPRISE_A11Y_E2E === "1";
type Surface = {
  name: string;
  path: string;
  needsAuth?: boolean;
};

const SURFACES: Surface[] = [
  { name: "homepage", path: "/us/en" },
  { name: "search", path: "/us/en/products?q=walnut" },
  { name: "category", path: "/us/en/c/dev-merch-fixtures" },
  { name: "collection", path: "/us/en/collections/personalized-favorites" },
  { name: "product", path: MARKETPLACE_PRODUCT_A },
  { name: "seller", path: "/us/en/sellers/dev-seller-01" },
  { name: "cart", path: "/us/en/cart", needsAuth: true },
  { name: "checkout", path: "/us/en/checkout", needsAuth: true },
  { name: "account", path: "/us/en/account", needsAuth: true },
];

async function dismissDevOverlay(page: import("@playwright/test").Page) {
  await page.evaluate(() => {
    document
      .querySelectorAll("nextjs-portal, [data-nextjs-dev-overlay]")
      .forEach((node) => {
        node.remove();
      });
  });
}

async function settleEntranceAnimations(page: import("@playwright/test").Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    // Published chrome can stream and start its entrance fade after the main
    // content. Once those effects finish, axe can audit the intended colors.
    const transitions = document
      .getAnimations()
      .filter(
        (animation) =>
          animation.playState === "running" &&
          Number.isFinite(animation.effect?.getComputedTiming().endTime),
      );
    await Promise.allSettled(
      transitions.map((animation) => animation.finished),
    );
  });
}

test.describe("enterprise storefront accessibility", () => {
  test.beforeAll(() => {
    requireLabStoreApiUrl();
  });

  test.skip(
    !RUN,
    "Set ENTERPRISE_A11Y_E2E=1 to run axe against the live storefront",
  );

  for (const surface of SURFACES) {
    test(`${surface.name} has no serious axe violations`, async ({ page }) => {
      if (surface.name === "checkout") {
        await addProductToCart(page, MARKETPLACE_PRODUCT_A);
        const cart = await fetchStoreCart(page);
        await storefrontGoto(page, `/us/en/checkout/${cart.id}`);
        await expect(page).toHaveURL(/\/checkout\//, { timeout: 90_000 });
      } else {
        await storefrontGoto(page, surface.path);
      }
      if (surface.name === "account") {
        await expectBuyerAccountShell(page);
      }

      await dismissDevOverlay(page);
      const main = page.getByRole("main");
      await expect(main).toBeVisible({ timeout: 90_000 });
      if (surface.name === "product") {
        await expect(main.getByRole("heading", { level: 1 })).toBeVisible();
      }
      if (surface.name === "checkout") {
        await expect(main.locator("#checkout-section-address")).toBeVisible();
      }
      await settleEntranceAnimations(page);

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .exclude("nextjs-portal")
        .exclude("[data-nextjs-dev-overlay]")
        .analyze();

      const serious = results.violations.filter(
        (violation) =>
          violation.impact === "serious" || violation.impact === "critical",
      );
      if (serious.length > 0) {
        test.info().attach(`${surface.name}-axe.json`, {
          body: JSON.stringify(
            { surface: surface.name, violations: serious },
            null,
            2,
          ),
          contentType: "application/json",
        });
      }
      expect(serious, formatViolations(surface.name, serious)).toEqual([]);
    });
  }
});

function formatViolations(
  name: string,
  violations: Array<{
    id: string;
    impact?: string;
    help: string;
    nodes: unknown[];
  }>,
) {
  return violations
    .map(
      (violation) =>
        `${name}: ${violation.id} (${violation.impact}) — ${violation.help} — ${violation.nodes.length} node(s)`,
    )
    .join("\n");
}
