import { test, expect } from "@playwright/test";

test("login page renders email and password fields", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByLabel(/email/i)).toBeVisible();
  await expect(page.getByLabel(/contrase/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /ingresar/i })).toBeVisible();
});

test("register page renders name, email and password fields", async ({ page }) => {
  await page.goto("/registro");

  await expect(page.getByLabel(/nombre/i)).toBeVisible();
  await expect(page.getByLabel(/email/i)).toBeVisible();
  await expect(page.getByLabel(/contrase/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /crear/i })).toBeVisible();
});

test("login form shows error on empty submission", async ({ page }) => {
  await page.goto("/login");

  await page.getByRole("button", { name: /ingresar/i }).click();

  await expect(page.getByText(/email|contrase/i).first()).toBeVisible();
});
