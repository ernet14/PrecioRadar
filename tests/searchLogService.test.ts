import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import {
  getSearchLogCategorySlug,
  recordSearchLog,
} from "../src/services/searchLogService";
import type { SearchResult } from "../src/types";

const originalDatabaseUrl = process.env.DATABASE_URL;
const originalDirectUrl = process.env.DIRECT_URL;

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}

function createSearchResult(categoryId: string): SearchResult {
  return {
    detectedType: "text",
    exactMatches: [
      {
        matchType: "exact",
        product: {
          categoryId,
          id: "product-a55",
          imageUrl: null,
          isDemo: false,
          name: "Samsung Galaxy A55",
          normalizedName: "samsung galaxy a55",
          offers: [],
          slug: "samsung-galaxy-a55",
        },
        score: 100,
      },
    ],
    query: "Samsung A55",
    searchedAt: new Date("2026-05-15T00:00:00.000Z"),
    similarMatches: [],
    status: "ready",
    total: 1,
    usedDemoFallback: false,
  };
}

afterEach(() => {
  restoreEnv("DATABASE_URL", originalDatabaseUrl);
  restoreEnv("DIRECT_URL", originalDirectUrl);
});

test("extracts the first non-demo category slug from search results", () => {
  assert.equal(getSearchLogCategorySlug(createSearchResult("celulares")), "celulares");
  assert.equal(getSearchLogCategorySlug(createSearchResult("demo")), null);
});

test("skips search log writes when database is unavailable", async () => {
  delete process.env.DATABASE_URL;
  delete process.env.DIRECT_URL;

  const result = await recordSearchLog({
    detectedType: "text",
    query: "Samsung A55",
  });

  assert.equal(result.status, "skipped");
});
