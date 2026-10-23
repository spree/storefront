import { expect, test } from "@playwright/test";
import { signUp, waitForHydration } from "./support";

test.describe("customer account", () => {
  test.beforeEach(async ({ page }) => {
    await signUp(page, { firstName: "Grace", lastName: "Hopper" });
  });

  test("the account navigation reaches every section", async ({ page }) => {
    const nav = page.getByRole("complementary").getByRole("navigation");
    const sections = [
      { link: "Orders", heading: "Order History", empty: "No orders yet" },
      {
        link: "Payment Methods",
        heading: "Payment Methods",
        empty: "No payment methods saved",
      },
      { link: "Gift Cards", heading: "Gift Cards", empty: "No gift cards" },
      { link: "Addresses", heading: "Addresses", empty: "No saved addresses" },
    ];

    for (const section of sections) {
      const link = nav.getByRole("link", { name: section.link });
      await waitForHydration(link);
      await link.click();
      await expect(
        page.getByRole("heading", { level: 1, name: section.heading }),
      ).toBeVisible({ timeout: 30_000 });
      await expect(
        page.getByRole("heading", { name: section.empty }),
      ).toBeVisible();
    }
  });

  test("a customer adds and deletes an address", async ({ page }) => {
    await page
      .getByRole("complementary")
      .getByRole("link", { name: "Addresses" })
      .click();
    const addFirst = page.getByRole("button", {
      name: "Add Your First Address",
    });
    await waitForHydration(addFirst);
    await addFirst.click();

    const dialog = page.getByRole("dialog", { name: "Add New Address" });
    await dialog
      .getByRole("combobox", { name: "Country" })
      .selectOption({ label: "United States" });
    await dialog
      .getByRole("textbox", { name: "Address", exact: true })
      .fill("42 Analytical Engine Way");
    await dialog.getByRole("textbox", { name: "City" }).fill("New York");
    await dialog
      .getByRole("textbox", { name: "ZIP / Postal code" })
      .fill("10001");
    // With the United States selected the state becomes a list, enabled once
    // the country's states have loaded.
    await dialog
      .getByRole("combobox", { name: /state/i })
      .selectOption({ label: "New York" });
    await dialog.getByRole("button", { name: "Save Address" }).click();

    await expect(dialog).toBeHidden({ timeout: 30_000 });
    await expect(page.getByText("42 Analytical Engine Way")).toBeVisible();

    // The list refreshes once more after the save, and that closes a confirm
    // dialog opened just before it.
    const confirmDelete = page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Delete" });
    await expect(async () => {
      if (!(await confirmDelete.isVisible())) {
        await page
          .getByRole("button", { name: "Delete" })
          .first()
          .click({ timeout: 3_000 });
      }
      await confirmDelete.click({ timeout: 3_000 });
    }).toPass({ timeout: 30_000 });
    await expect(
      page.getByRole("heading", { name: "No saved addresses" }),
    ).toBeVisible({ timeout: 30_000 });
  });

  test("a customer updates their name", async ({ page }) => {
    await page
      .getByRole("complementary")
      .getByRole("link", { name: "Profile" })
      .click();
    const firstName = page.getByRole("textbox", { name: "First Name" });
    await expect(firstName).toHaveValue("Grace", { timeout: 30_000 });
    await waitForHydration(firstName);

    await firstName.fill("Amazing Grace");
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(page.getByText("Profile updated successfully!")).toBeVisible({
      timeout: 30_000,
    });

    await page.reload();
    await expect(page.getByRole("textbox", { name: "First Name" })).toHaveValue(
      "Amazing Grace",
      { timeout: 30_000 },
    );
  });
});
