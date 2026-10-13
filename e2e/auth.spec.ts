import { expect, test } from "@playwright/test";
import {
  BASE_PATH,
  formWithButton,
  signIn,
  signUp,
  waitForHydration,
} from "./support";

test.describe("sign up and sign in", () => {
  test("a new customer signs up, signs out and signs back in", async ({
    page,
  }) => {
    const { email, password } = await signUp(page, {
      firstName: "Ada",
      lastName: "Lovelace",
    });
    const sidebar = page.getByRole("complementary");
    await expect(sidebar.getByText("Ada Lovelace")).toBeVisible();
    await expect(sidebar.getByText(email)).toBeVisible();

    const signOut = page.getByRole("button", { name: "Sign Out" });
    await waitForHydration(signOut);
    await signOut.click();
    await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible({
      timeout: 30_000,
    });

    await page.goto(`${BASE_PATH}/account`);
    await signIn(page, email, password);
    await expect(
      page.getByRole("heading", { name: "Account Overview" }),
    ).toBeVisible({ timeout: 30_000 });
  });

  test("a wrong password is refused", async ({ page }) => {
    const { email } = await signUp(page);
    await page.context().clearCookies();

    await page.goto(`${BASE_PATH}/account`);
    await signIn(page, email, "not-the-password");
    await expect(page.getByText("Invalid email or password")).toBeVisible({
      timeout: 30_000,
    });
  });

  test("an account page sends a guest to sign in and back", async ({
    page,
  }) => {
    const { email, password } = await signUp(page);
    await page.context().clearCookies();

    await page.goto(`${BASE_PATH}/account/orders`);
    await expect(page).toHaveURL(/\/account\?redirect=/);
    await signIn(page, email, password);
    await expect(
      page.getByRole("heading", { level: 1, name: "Order History" }),
    ).toBeVisible({ timeout: 30_000 });
  });

  test("sign up refuses passwords that do not match", async ({ page }) => {
    await page.goto(`${BASE_PATH}/account/register`);
    await waitForHydration(formWithButton(page, "Create Account"));
    await page.getByRole("textbox", { name: "First name" }).fill("E2E");
    await page.getByRole("textbox", { name: "Last name" }).fill("Customer");
    await page
      .getByRole("textbox", { name: "Email" })
      .fill(`e2e-mismatch-${Date.now()}@example.com`);
    await page
      .getByRole("textbox", { name: "Password", exact: true })
      .fill("spree123!");
    await page
      .getByRole("textbox", { name: "Confirm Password" })
      .fill("different123!");
    await page.getByRole("checkbox", { name: /i agree/i }).check();
    await page.getByRole("button", { name: "Create Account" }).click();

    await expect(page.getByText("Passwords do not match")).toBeVisible();
    await expect(page).toHaveURL(/\/account\/register$/);
  });
});
