import { test, expect } from "@playwright/test";

test("search returns mock results for known product", async ({ page }) => {
  await page.goto("/buscar?q=Samsung+Galaxy");

  await expect(page.getByText(/Samsung Galaxy/i).first()).toBeVisible({ timeout: 10_000 });
});

test("search shows empty state for unknown query", async ({ page }) => {
  await page.goto("/buscar?q=productoquenoexistexyz123");

  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByText(/Samsung Galaxy/i)).not.toBeVisible();
});

test("search page without query renders search form", async ({ page }) => {
  await page.goto("/buscar");

  const form = page.getByRole("search").or(page.locator("form")).first();
  await expect(form).toBeVisible();
});
