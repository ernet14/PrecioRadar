import { test, expect } from "@playwright/test";

test("robots.txt is accessible and blocks private routes", async ({ request }) => {
  const response = await request.get("/robots.txt");
  expect(response.status()).toBe(200);

  const body = await response.text();
  expect(body).toContain("User-Agent");
  expect(body).toContain("/dashboard");
  expect(body).toContain("/admin");
  expect(body).toContain("Sitemap");
});

test("sitemap.xml is accessible and contains product URLs", async ({ request }) => {
  const response = await request.get("/sitemap.xml");
  expect(response.status()).toBe(200);

  const body = await response.text();
  expect(body).toContain("<urlset");
  expect(body).toContain("/producto/");
});

test("product page has correct og:title meta tag", async ({ page }) => {
  await page.goto("/producto/samsung-galaxy-a55-5g-256gb");

  const ogTitle = page.locator('meta[property="og:title"]');
  await expect(ogTitle).toHaveAttribute("content", /Samsung Galaxy A55/i);
});

test("product page has canonical link tag", async ({ page }) => {
  await page.goto("/producto/samsung-galaxy-a55-5g-256gb");

  const canonical = page.locator('link[rel="canonical"]');
  await expect(canonical).toHaveAttribute(
    "href",
    /\/producto\/samsung-galaxy-a55-5g-256gb/,
  );
});
