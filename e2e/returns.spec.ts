import { expect, test } from "@playwright/test";
import { BASE_PATH, signIn, waitForHydration } from "./support";

test.describe("returns portal", () => {
  // The answer never says whether the details matched: the link only ever
  // goes to the order's own address.
  test("a guest asks for a link to their order", async ({ page }) => {
    await page.goto(`${BASE_PATH}/orders/find?number=R000000000`);
    const form = page.locator("form").filter({
      has: page.getByRole("button", { name: "Email me a link" }),
    });
    await waitForHydration(form);

    await expect(page.getByLabel("Order number")).toHaveValue("R000000000");
    await page.getByLabel("Email").fill("nobody@example.com");
    await page.getByRole("button", { name: "Email me a link" }).click();

    await expect(
      page.getByText(/if we found an order for these details/i),
    ).toBeVisible({ timeout: 30_000 });
  });

  test("a guest link that does not open an order offers a new one", async ({
    page,
  }) => {
    await page.goto(`${BASE_PATH}/orders/or_missing?token=wrong`);

    await expect(
      page.getByRole("heading", { name: "Order not found" }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Find your order" }).click();
    await expect(
      page.getByRole("heading", { name: "Find your order" }),
    ).toBeVisible();
  });

  // Needs a customer with a shipped order the released backend image cannot
  // seed; runs where the fixture is provided (the worktree QA environment).
  test("a customer returns an item and withdraws the request", async ({
    page,
  }) => {
    const email = process.env.E2E_RETURNS_EMAIL;
    const password = process.env.E2E_RETURNS_PASSWORD;
    const orderId = process.env.E2E_RETURNS_ORDER_ID;
    test.skip(
      !email || !password || !orderId,
      "needs a customer with a shipped order",
    );

    await page.goto(`${BASE_PATH}/account`);
    await signIn(page, email as string, password as string);
    await expect(
      page.getByRole("heading", { name: "Account Overview" }),
    ).toBeVisible({ timeout: 30_000 });

    await page.goto(`${BASE_PATH}/account/orders/${orderId}`);
    await expect(
      page.getByRole("heading", { name: "Returns & exchanges" }),
    ).toBeVisible();
    await expect(
      page.getByText(/you can withdraw from this purchase until/i),
    ).toBeVisible();
    await page.getByRole("link", { name: "Return or exchange items" }).click();

    await expect(
      page.getByRole("heading", { name: "Return or exchange items" }),
    ).toBeVisible();
    const quantity = page.getByLabel("Quantity").first();
    await waitForHydration(quantity);
    await quantity.selectOption("1");
    await page.getByRole("button", { name: "Continue" }).click();

    await page.getByLabel("Reason").selectOption({ index: 1 });
    await page.getByLabel(/anything we should know/i).fill("Too small");
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(
      page.getByText(/refunds go back to the payment method/i),
    ).toBeVisible();
    await page.getByRole("button", { name: "Send request" }).click();
    await expect(
      page.getByRole("heading", { name: "Request sent" }),
    ).toBeVisible({ timeout: 30_000 });

    const confirmation = await page
      .getByText(/your request number/i)
      .textContent();
    const number = confirmation?.match(/RET\w+/)?.[0] ?? "";
    expect(number).not.toBe("");

    await page
      .getByRole("link", { name: "See your request on the order" })
      .click();
    const request = page
      .getByRole("listitem")
      .filter({ hasText: `Return ${number}` });
    await expect(request.getByText("Requested")).toBeVisible();

    page.once("dialog", (dialog) => dialog.accept());
    await request.getByRole("button", { name: "Withdraw request" }).click();
    await expect(request.getByText("Withdrawn")).toBeVisible({
      timeout: 30_000,
    });
  });
});
