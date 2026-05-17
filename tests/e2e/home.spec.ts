import { test, expect } from "@playwright/test";

test("home page renders search input and categories", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/Comparador de precios/);

  const searchInput = page.getByRole("searchbox", { name: /buscar producto/i });
  await expect(searchInput).toBeVisible();

  await expect(page.getByRole("link", { name: /buscar/i }).first()).toBeVisible();
});

test("home page has working navigation to search", async ({ page }) => {
  await page.goto("/");

  const searchInput = page.getByRole("searchbox", { name: /buscar producto/i });
  await searchInput.fill("Samsung");
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/\/buscar\?q=Samsung/);
});
