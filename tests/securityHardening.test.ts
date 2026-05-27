import assert from "node:assert/strict";
import test from "node:test";
import { isAdmin, getUserRole } from "../src/lib/supabase/auth";
import {
  isAllowedImageUrl,
  isAllowedOutboundUrl,
  isAllowedSearchUrl,
} from "../src/lib/utils/input";

const originalAdminEmails = process.env.ADMIN_EMAILS;
const originalNodeEnv = process.env.NODE_ENV;

test.afterEach(() => {
  restoreEnv("ADMIN_EMAILS", originalAdminEmails);
  restoreEnv("NODE_ENV", originalNodeEnv);
});

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}

test("admin role ignores user-editable metadata", () => {
  const user = {
    app_metadata: {},
    email: "owner@example.com",
    user_metadata: { role: "ADMIN" },
  };

  assert.equal(getUserRole(user as never), "USER");
  assert.equal(isAdmin(user as never), false);
});

test("admin access requires allowlisted email when allowlist is configured", () => {
  process.env.ADMIN_EMAILS = "owner@example.com";

  assert.equal(
    isAdmin({
      app_metadata: { role: "ADMIN" },
      email: "owner@example.com",
      user_metadata: {},
    } as never),
    true,
  );
  assert.equal(
    isAdmin({
      app_metadata: { role: "ADMIN" },
      email: "other@example.com",
      user_metadata: {},
    } as never),
    false,
  );
});

test("production admin access fails closed without ADMIN_EMAILS", () => {
  process.env.NODE_ENV = "production";
  delete process.env.ADMIN_EMAILS;

  assert.equal(
    isAdmin({
      app_metadata: { role: "ADMIN" },
      email: "owner@example.com",
      user_metadata: {},
    } as never),
    false,
  );
});

test("outbound and image URL validators reject arbitrary hosts", () => {
  assert.equal(isAllowedSearchUrl("https://example.com/producto"), false);
  assert.equal(isAllowedOutboundUrl("https://example.com/phish"), false);
  assert.equal(isAllowedImageUrl("https://example.com/image.jpg"), false);
  assert.equal(isAllowedOutboundUrl("https://www.mercadolibre.com.ar/oferta"), true);
  assert.equal(isAllowedImageUrl("https://cdn.vtexassets.com/asset.jpg"), true);
});
