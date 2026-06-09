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

test("mobile menu moves focus and restores it on Escape", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const trigger = page.getByRole("button", { name: "Abrir menú" });
  await trigger.click();

  await expect(
    page
      .getByRole("navigation", { name: "Navegación principal" })
      .getByRole("link", { name: "Buscar", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");

  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
});
