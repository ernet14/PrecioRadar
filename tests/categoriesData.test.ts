import assert from "node:assert/strict";
import test from "node:test";
import {
  getCategoryDescriptorBySlug,
  getCategoryQuerySlugs,
  mvpCategoryDescriptors,
  normalizeCategorySlug,
} from "../src/data/categories";

test("category descriptors have unique slugs", () => {
  const slugs = mvpCategoryDescriptors.map((d) => d.slug);
  const unique = new Set(slugs);
  assert.equal(unique.size, slugs.length);
});

test("category descriptors have non-empty name and description", () => {
  for (const descriptor of mvpCategoryDescriptors) {
    assert.ok(descriptor.name.length > 0, `name empty for ${descriptor.slug}`);
    assert.ok(
      descriptor.description.length > 20,
      `description too short for ${descriptor.slug}`,
    );
  }
});

test("category slugs are URL-safe", () => {
  for (const descriptor of mvpCategoryDescriptors) {
    assert.match(
      descriptor.slug,
      /^[a-z0-9-]+$/,
      `slug ${descriptor.slug} contains invalid characters`,
    );
  }
});

test("getCategoryDescriptorBySlug finds known slug", () => {
  const descriptor = getCategoryDescriptorBySlug("celulares");
  assert.ok(descriptor);
  assert.equal(descriptor?.slug, "celulares");
  assert.equal(descriptor?.name, "Celulares");
});

test("getCategoryDescriptorBySlug returns null for unknown slug", () => {
  assert.equal(getCategoryDescriptorBySlug("inexistente-xyz"), null);
});

test("normalizeCategorySlug maps raw VTEX TV categories by product name", () => {
  assert.equal(
    normalizeCategorySlug({
      name: "Samsung Smart TV QLED 55 Q6FAA 4K",
      slug: "audio-tv-y-video",
    }),
    "televisores",
  );
});

test("normalizeCategorySlug maps raw electro products by product name", () => {
  assert.equal(
    normalizeCategorySlug({
      name: "Heladera Samsung No Frost RT38",
      slug: "electro-y-tecnologia",
    }),
    "electrodomesticos",
  );
});

test("normalizeCategorySlug keeps broad raw categories when product name is ambiguous", () => {
  assert.equal(
    normalizeCategorySlug({ name: "Producto generico", slug: "tecnologia" }),
    "tecnologia",
  );
});

test("getCategoryQuerySlugs includes raw aliases for curated category pages", () => {
  assert.ok(getCategoryQuerySlugs("televisores").includes("tv-y-video"));
  assert.ok(getCategoryQuerySlugs("electrodomesticos").includes("electro-y-tecnologia"));
});
