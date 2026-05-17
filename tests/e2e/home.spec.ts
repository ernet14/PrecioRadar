import { test, expect } from "@playwright/test";

test("home page renders search input and categories", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/PrecioRadar/);

  const searchInput = page.getByRole("textbox");
  await expect(searchInput).toBeVisible();

  await expect(page.getByRole("link", { name: /buscar/i }).first()).toBeVisible();
});

test("home page has working navigation to search", async ({ page }) => {
  await page.goto("/");

  const searchInput = page.getByRole("textbox");
  await searchInput.fill("Samsung");
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/\/buscar\?q=Samsung/);
});
