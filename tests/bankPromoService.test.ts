import assert from "node:assert/strict";
import test from "node:test";
import type { BankPromo } from "../src/generated/prisma/client";
import type { ProviderProduct } from "../src/providers/stores";
import {
  calculateBankPromoEffectivePrice,
  calculateBankPromoSavings,
  getTopBankPromoOptionsForOffers,
  isPromoEligibleOnDate,
} from "../src/services/bankPromoService";

function makePromo(overrides: Partial<BankPromo> = {}): BankPromo {
  return {
    active: true,
    categorySlug: null,
    commerceChannel: "online",
    createdAt: new Date("2026-05-01T00:00:00.000Z"),
    dayOfWeek: [],
    discountPct: 10,
    entity: "Banco Test",
    entitySlug: "banco-test",
    id: "promo-test",
    installments: null,
    maxAmount: null,
    notes: null,
    paymentType: "credito",
    promoType: "percentage",
    sourceUrl: null,
    storeSlug: null,
    updatedAt: new Date("2026-05-01T00:00:00.000Z"),
    validFrom: new Date("2026-05-01T00:00:00.000Z"),
    validUntil: null,
    ...overrides,
  };
}

function makeOffer(overrides: Partial<ProviderProduct> = {}): ProviderProduct {
  return {
    available: true,
    brand: "Marca",
    categorySlug: "celulares",
    condition: "NEW",
    currency: "ARS",
    externalId: "offer-test",
    imageUrl: null,
    isDemo: false,
    lastCheckedAt: new Date("2026-05-20T12:00:00.000Z"),
    model: null,
    name: "Producto Test",
    normalizedName: "producto test",
    price: 100000,
    productUrl: "https://example.com/producto",
    provider: "mercadolibre",
    slug: "producto-test",
    storeName: "MercadoLibre",
    storeSlug: "mercadolibre",
    title: "Producto Test",
    ...overrides,
  };
}

test("checks weekday eligibility for a specific date", () => {
  const wednesday = new Date("2026-05-20T12:00:00");

  assert.equal(isPromoEligibleOnDate(makePromo({ dayOfWeek: [3] }), wednesday), true);
  assert.equal(isPromoEligibleOnDate(makePromo({ dayOfWeek: [2] }), wednesday), false);
  assert.equal(isPromoEligibleOnDate(makePromo({ dayOfWeek: [] }), wednesday), true);
});

test("calculates capped effective price", () => {
  const promo = makePromo({ discountPct: 20, maxAmount: 15000 });

  assert.equal(calculateBankPromoSavings(100000, promo), 15000);
  assert.equal(calculateBankPromoEffectivePrice(100000, promo), 85000);
});

test("ranks applicable bank promos by effective price", () => {
  const date = new Date("2026-05-20T12:00:00");
  const options = getTopBankPromoOptionsForOffers({
    date,
    offers: [
      makeOffer({ externalId: "ml", price: 100000, storeSlug: "mercadolibre" }),
      makeOffer({ externalId: "fr", price: 90000, storeName: "Fravega", storeSlug: "fravega" }),
    ],
    promos: [
      makePromo({ discountPct: 10, entity: "Banco General", id: "general" }),
      makePromo({ discountPct: 40, entity: "Solo Fisica", commerceChannel: "physical", id: "physical" }),
      makePromo({ discountPct: 30, entity: "Solo ML", id: "ml", storeSlug: "mercadolibre" }),
      makePromo({ categorySlug: "notebooks", discountPct: 50, entity: "Otra categoria", id: "cat" }),
    ],
  });

  assert.equal(options[0].promo.id, "ml");
  assert.equal(options[0].offer.storeSlug, "mercadolibre");
  assert.equal(options[0].effectivePrice, 70000);
  assert.equal(options.some((option) => option.promo.id === "physical"), false);
  assert.equal(options.some((option) => option.promo.id === "cat"), false);
});

test("includes interest-free installments as a payment benefit", () => {
  const [option] = getTopBankPromoOptionsForOffers({
    offers: [makeOffer()],
    promos: [
      makePromo({
        discountPct: 0,
        installments: 6,
        promoType: "installments",
      }),
    ],
  });

  assert.equal(option.effectivePrice, 100000);
  assert.equal(option.savingsAmount, 0);
  assert.equal(option.promo.installments, 6);
});
