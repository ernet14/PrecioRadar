import { test, expect } from "@playwright/test";

const PRODUCT_SLUG = "samsung-galaxy-a55-5g-256gb";

test("product page renders name, price and offers table", async ({ page }) => {
  await page.goto(`/producto/${PRODUCT_SLUG}`);

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Samsung Galaxy A55");

  await expect(page.getByText(/MercadoLibre/i).first()).toBeVisible();

  await expect(page.locator("main").getByText(/\$\s*[\d.]+/).first()).toBeVisible();
});

test("product page separates purchase timing from discount validation", async ({
  page,
}) => {
  await page.goto(`/producto/${PRODUCT_SLUG}`);

  await expect(page.getByText("Momento de compra", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Validación del descuento", { exact: true }),
  ).toBeVisible();
});

test("product page has JSON-LD structured data", async ({ page }) => {
  await page.goto(`/producto/${PRODUCT_SLUG}`);

  const jsonLdScripts = page.locator('script[type="application/ld+json"]');
  const count = await jsonLdScripts.count();
  expect(count).toBeGreaterThanOrEqual(2);

  const productLd = JSON.parse(await jsonLdScripts.nth(0).textContent() ?? "{}");
  expect(productLd["@type"]).toBe("Product");
});

test("unknown product slug shows not-found state", async ({ page }) => {
  await page.goto("/producto/producto-que-no-existe-xyz");

  await expect(page.getByText(/no encontramos/i)).toBeVisible();
});

test("product page back link goes to search", async ({ page }) => {
  await page.goto(`/producto/${PRODUCT_SLUG}`);

  const backLink = page.getByRole("link", { name: /volver/i });
  await expect(backLink).toBeVisible();
  await expect(backLink).toHaveAttribute("href", "/buscar");
});
