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

test("sitemap.xml is accessible and contains indexable public URLs", async ({ request }) => {
  const response = await request.get("/sitemap.xml");
  expect(response.status()).toBe(200);

  const body = await response.text();
  expect(body).toContain("<urlset");
  expect(body).toContain("/indice");
  expect(body).toContain("/categoria/");
  expect(body).not.toMatch(/<loc>[^<]+\/buscar<\/loc>/);
});

test("search results are not indexable", async ({ page }) => {
  await page.goto("/buscar?q=Samsung");

  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/i,
  );
});

test("product page has correct og:title meta tag", async ({ page }) => {
  await page.goto("/producto/samsung-galaxy-a55-5g-256gb");

  const ogTitle = page.locator('meta[property="og:title"]');
  await expect(ogTitle).toHaveAttribute("content", /Samsung Galaxy A55/i);
});

test("product Open Graph image is generated successfully", async ({
  page,
  request,
}) => {
  await page.goto("/producto/samsung-galaxy-a55-5g-256gb");

  const imageUrl = await page
    .locator('meta[property="og:image"]')
    .getAttribute("content");
  expect(imageUrl).toBeTruthy();

  const parsedImageUrl = new URL(imageUrl as string);
  const response = await request.get(
    `${parsedImageUrl.pathname}${parsedImageUrl.search}`,
  );
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("image/png");
});

test("product page has canonical link tag", async ({ page }) => {
  await page.goto("/producto/samsung-galaxy-a55-5g-256gb");

  const canonical = page.locator('link[rel="canonical"]');
  await expect(canonical).toHaveAttribute(
    "href",
    /\/producto\/samsung-galaxy-a55-5g-256gb/,
  );
});

test("unmatched routes render the global 404", async ({ page }) => {
  const response = await page.goto("/ruta-que-no-existe-xyz");

  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { name: "No encontramos esta página" }),
  ).toBeVisible();
});
