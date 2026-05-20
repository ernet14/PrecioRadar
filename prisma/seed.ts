import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

type DbRecord = {
  id: string;
  [key: string]: unknown;
};

type StoreSeed = {
  name: string;
  slug: string;
  baseUrl: string;
  active: boolean;
  isDemo: boolean;
  hasAffiliate: boolean;
  affiliateEnabled: boolean;
};

type CategorySeed = {
  name: string;
  slug: string;
  description: string;
  featured: boolean;
};

type OfferSeed = {
  storeSlug: string;
  externalId: string;
  title: string;
  price: number;
  productUrl: string;
};

type ProductSeed = {
  name: string;
  slug: string;
  brand: string;
  model: string;
  categorySlug: string;
  normalizedName: string;
  offers: OfferSeed[];
};

type BankPromoSeed = {
  categorySlug?: string | null;
  commerceChannel: string;
  dayOfWeek: number[];
  discountPct: number;
  entity: string;
  entitySlug: string;
  installments?: number | null;
  maxAmount?: number | null;
  paymentType: string;
  promoType: string;
  storeSlug?: string | null;
};

function getDatabaseUrl() {
  return process.env.DATABASE_URL ?? process.env.DIRECT_URL ?? "";
}

const prisma = new PrismaClient({
  adapter: new PrismaPg(getDatabaseUrl()),
});

const categories: CategorySeed[] = [
  {
    name: "Celulares",
    slug: "celulares",
    description: "Smartphones y accesorios principales.",
    featured: true,
  },
  {
    name: "Notebooks",
    slug: "notebooks",
    description: "Notebooks para trabajo, estudio y gaming.",
    featured: true,
  },
  {
    name: "Componentes de PC",
    slug: "componentes-pc",
    description: "Placas de video, procesadores, memorias y almacenamiento.",
    featured: true,
  },
  {
    name: "Televisores",
    slug: "televisores",
    description: "Smart TVs y pantallas para el hogar.",
    featured: true,
  },
  {
    name: "Audio",
    slug: "audio",
    description: "Auriculares, parlantes y equipos de sonido.",
    featured: true,
  },
  {
    name: "Consolas y videojuegos",
    slug: "consolas-videojuegos",
    description: "Consolas, juegos y accesorios.",
    featured: true,
  },
  {
    name: "Electrodom\u00e9sticos",
    slug: "electrodomesticos",
    description: "Electrodom\u00e9sticos populares para el hogar.",
    featured: true,
  },
  {
    name: "Herramientas",
    slug: "herramientas",
    description: "Herramientas el\u00e9ctricas y manuales.",
    featured: true,
  },
];

const stores: StoreSeed[] = [
  {
    name: "MercadoLibre",
    slug: "mercadolibre",
    baseUrl: "https://www.mercadolibre.com.ar",
    active: true,
    isDemo: false,
    hasAffiliate: true,
    affiliateEnabled: false,
  },
  {
    name: "Fr\u00e1vega",
    slug: "fravega",
    baseUrl: "https://www.fravega.com",
    active: true,
    isDemo: true,
    hasAffiliate: false,
    affiliateEnabled: false,
  },
  {
    name: "Musimundo",
    slug: "musimundo",
    baseUrl: "https://www.musimundo.com",
    active: true,
    isDemo: true,
    hasAffiliate: false,
    affiliateEnabled: false,
  },
  {
    name: "Cetrogar",
    slug: "cetrogar",
    baseUrl: "https://www.cetrogar.com.ar",
    active: true,
    isDemo: true,
    hasAffiliate: false,
    affiliateEnabled: false,
  },
  {
    name: "Megatone",
    slug: "megatone",
    baseUrl: "https://www.megatone.net",
    active: true,
    isDemo: true,
    hasAffiliate: false,
    affiliateEnabled: false,
  },
  {
    name: "TiendaMia",
    slug: "tiendamia",
    baseUrl: "https://tiendamia.com/ar",
    active: false,
    isDemo: false,
    hasAffiliate: false,
    affiliateEnabled: false,
  },
  {
    name: "Temu",
    slug: "temu",
    baseUrl: "https://www.temu.com",
    active: false,
    isDemo: false,
    hasAffiliate: false,
    affiliateEnabled: false,
  },
];

const bankPromoValidFrom = new Date("2026-05-01T00:00:00");
const bankPromoValidUntil = new Date("2026-12-31T23:59:59.999");
const bankPromoSeedNote =
  "Seed inicial Etapa 13; validar fuente oficial antes de publicar.";

const bankPromos: BankPromoSeed[] = [
  { entity: "Banco Nacion", entitySlug: "banco-nacion", dayOfWeek: [1, 3], discountPct: 25, promoType: "refund", maxAmount: 12000, storeSlug: null, categorySlug: null, commerceChannel: "online", paymentType: "credito" },
  { entity: "Galicia", entitySlug: "galicia", dayOfWeek: [2], discountPct: 20, promoType: "refund", maxAmount: 10000, storeSlug: "mercadolibre", categorySlug: null, commerceChannel: "online", paymentType: "credito" },
  { entity: "Macro", entitySlug: "macro", dayOfWeek: [4], discountPct: 15, promoType: "refund", maxAmount: 8000, storeSlug: null, categorySlug: "electrodomesticos", commerceChannel: "both", paymentType: "credito" },
  { entity: "Santander", entitySlug: "santander", dayOfWeek: [3], discountPct: 10, promoType: "percentage", maxAmount: 7000, storeSlug: null, categorySlug: "celulares", commerceChannel: "online", paymentType: "credito" },
  { entity: "BBVA", entitySlug: "bbva", dayOfWeek: [5], discountPct: 18, promoType: "refund", maxAmount: 9000, storeSlug: null, categorySlug: null, commerceChannel: "online", paymentType: "credito" },
  { entity: "ICBC", entitySlug: "icbc", dayOfWeek: [2, 4], discountPct: 15, promoType: "refund", maxAmount: 8500, storeSlug: null, categorySlug: "notebooks", commerceChannel: "online", paymentType: "credito" },
  { entity: "Comafi", entitySlug: "comafi", dayOfWeek: [1], discountPct: 10, promoType: "refund", maxAmount: 6000, storeSlug: null, categorySlug: null, commerceChannel: "both", paymentType: "debito" },
  { entity: "Credicoop", entitySlug: "credicoop", dayOfWeek: [6], discountPct: 20, promoType: "refund", maxAmount: 7500, storeSlug: null, categorySlug: "herramientas", commerceChannel: "online", paymentType: "credito" },
  { entity: "Supervielle", entitySlug: "supervielle", dayOfWeek: [0], discountPct: 12, promoType: "refund", maxAmount: 6500, storeSlug: null, categorySlug: null, commerceChannel: "online", paymentType: "credito" },
  { entity: "Banco Ciudad", entitySlug: "banco-ciudad", dayOfWeek: [3], discountPct: 25, promoType: "refund", maxAmount: 11000, storeSlug: null, categorySlug: "audio", commerceChannel: "both", paymentType: "credito" },
  { entity: "Columbia", entitySlug: "columbia", dayOfWeek: [4], discountPct: 10, promoType: "refund", maxAmount: 5000, storeSlug: null, categorySlug: null, commerceChannel: "online", paymentType: "credito" },
  { entity: "Bancor", entitySlug: "bancor", dayOfWeek: [2], discountPct: 20, promoType: "refund", maxAmount: 9000, storeSlug: null, categorySlug: "televisores", commerceChannel: "online", paymentType: "credito" },
  { entity: "Mercado Pago", entitySlug: "mercado-pago", dayOfWeek: [], discountPct: 5, promoType: "percentage", maxAmount: 4000, storeSlug: "mercadolibre", categorySlug: null, commerceChannel: "online", paymentType: "prepago" },
  { entity: "Uala", entitySlug: "uala", dayOfWeek: [1, 5], discountPct: 15, promoType: "refund", maxAmount: 6000, storeSlug: null, categorySlug: null, commerceChannel: "online", paymentType: "prepago" },
  { entity: "Personal Pay", entitySlug: "personal-pay", dayOfWeek: [3], discountPct: 20, promoType: "refund", maxAmount: 7000, storeSlug: null, categorySlug: null, commerceChannel: "online", paymentType: "prepago" },
  { entity: "Naranja X", entitySlug: "naranja-x", dayOfWeek: [2, 3], discountPct: 0, promoType: "installments", installments: 6, maxAmount: null, storeSlug: null, categorySlug: null, commerceChannel: "online", paymentType: "credito" },
  { entity: "MODO", entitySlug: "modo", dayOfWeek: [3, 4], discountPct: 30, promoType: "refund", maxAmount: 15000, storeSlug: null, categorySlug: null, commerceChannel: "online", paymentType: "modo" },
];

const products: ProductSeed[] = [
  {
    name: "Samsung Galaxy A55 5G 256GB",
    slug: "samsung-galaxy-a55-5g-256gb",
    brand: "Samsung",
    model: "Galaxy A55",
    categorySlug: "celulares",
    normalizedName: "samsung galaxy a55 5g 256gb",
    offers: [
      {
        storeSlug: "mercadolibre",
        externalId: "mock-ml-a55-256",
        title: "Samsung Galaxy A55 5G 256GB",
        price: 619999,
        productUrl: "https://www.mercadolibre.com.ar/demo/samsung-galaxy-a55",
      },
      {
        storeSlug: "fravega",
        externalId: "mock-fr-a55-256",
        title: "Celular Samsung Galaxy A55 256GB",
        price: 649999,
        productUrl: "https://www.fravega.com/demo/samsung-galaxy-a55",
      },
      {
        storeSlug: "musimundo",
        externalId: "mock-mu-a55-256",
        title: "Samsung Galaxy A55 5G 256GB",
        price: 639999,
        productUrl: "https://www.musimundo.com/demo/samsung-galaxy-a55",
      },
    ],
  },
  {
    name: "Placa de video NVIDIA GeForce RTX 5070 12GB",
    slug: "nvidia-geforce-rtx-5070-12gb",
    brand: "NVIDIA",
    model: "GeForce RTX 5070",
    categorySlug: "componentes-pc",
    normalizedName: "nvidia geforce rtx 5070 12gb",
    offers: [
      {
        storeSlug: "mercadolibre",
        externalId: "mock-ml-rtx-5070",
        title: "Placa de video GeForce RTX 5070 12GB",
        price: 1129999,
        productUrl: "https://www.mercadolibre.com.ar/demo/rtx-5070",
      },
      {
        storeSlug: "megatone",
        externalId: "mock-me-rtx-5070",
        title: "NVIDIA RTX 5070 12GB GDDR7",
        price: 1199999,
        productUrl: "https://www.megatone.net/demo/rtx-5070",
      },
    ],
  },
  {
    name: "Notebook Lenovo IdeaPad Slim 5 Ryzen 7",
    slug: "notebook-lenovo-ideapad-slim-5-ryzen-7",
    brand: "Lenovo",
    model: "IdeaPad Slim 5",
    categorySlug: "notebooks",
    normalizedName: "notebook lenovo ideapad slim 5 ryzen 7",
    offers: [
      {
        storeSlug: "mercadolibre",
        externalId: "mock-ml-lenovo-slim-5",
        title: "Notebook Lenovo IdeaPad Slim 5 Ryzen 7 16GB 512GB",
        price: 899999,
        productUrl: "https://www.mercadolibre.com.ar/demo/lenovo-ideapad-slim-5",
      },
      {
        storeSlug: "fravega",
        externalId: "mock-fr-lenovo-slim-5",
        title: "Notebook Lenovo IdeaPad Slim 5 16GB SSD",
        price: 945999,
        productUrl: "https://www.fravega.com/demo/lenovo-ideapad-slim-5",
      },
      {
        storeSlug: "musimundo",
        externalId: "mock-mu-lenovo-slim-5",
        title: "Lenovo IdeaPad Slim 5 Ryzen 7",
        price: 929999,
        productUrl: "https://www.musimundo.com/demo/lenovo-ideapad-slim-5",
      },
    ],
  },
  {
    name: "Smart TV Samsung Crystal UHD 55 pulgadas",
    slug: "smart-tv-samsung-crystal-uhd-55",
    brand: "Samsung",
    model: "Crystal UHD 55",
    categorySlug: "televisores",
    normalizedName: "smart tv samsung crystal uhd 55 pulgadas",
    offers: [
      {
        storeSlug: "mercadolibre",
        externalId: "mock-ml-tv-samsung-55",
        title: "Smart TV Samsung Crystal UHD 55 pulgadas 4K",
        price: 759999,
        productUrl: "https://www.mercadolibre.com.ar/demo/samsung-tv-55",
      },
      {
        storeSlug: "fravega",
        externalId: "mock-fr-tv-samsung-55",
        title: "Smart TV Samsung 55 Crystal UHD",
        price: 789999,
        productUrl: "https://www.fravega.com/demo/samsung-tv-55",
      },
      {
        storeSlug: "cetrogar",
        externalId: "mock-ce-tv-samsung-55",
        title: "TV Samsung 55 pulgadas 4K",
        price: 779999,
        productUrl: "https://www.cetrogar.com.ar/demo/samsung-tv-55",
      },
    ],
  },
  {
    name: "Auriculares Bluetooth JBL Tune 520BT",
    slug: "auriculares-bluetooth-jbl-tune-520bt",
    brand: "JBL",
    model: "Tune 520BT",
    categorySlug: "audio",
    normalizedName: "auriculares bluetooth jbl tune 520bt",
    offers: [
      {
        storeSlug: "mercadolibre",
        externalId: "mock-ml-jbl-520bt",
        title: "Auriculares Bluetooth JBL Tune 520BT",
        price: 89999,
        productUrl: "https://www.mercadolibre.com.ar/demo/jbl-tune-520bt",
      },
      {
        storeSlug: "musimundo",
        externalId: "mock-mu-jbl-520bt",
        title: "JBL Tune 520BT Bluetooth",
        price: 94999,
        productUrl: "https://www.musimundo.com/demo/jbl-tune-520bt",
      },
      {
        storeSlug: "fravega",
        externalId: "mock-fr-jbl-520bt",
        title: "Auriculares JBL 520BT",
        price: 97999,
        productUrl: "https://www.fravega.com/demo/jbl-tune-520bt",
      },
    ],
  },
  {
    name: "Sony PlayStation 5 Slim Digital",
    slug: "sony-playstation-5-slim-digital",
    brand: "Sony",
    model: "PlayStation 5 Slim Digital",
    categorySlug: "consolas-videojuegos",
    normalizedName: "sony playstation 5 slim digital",
    offers: [
      {
        storeSlug: "mercadolibre",
        externalId: "mock-ml-ps5-slim-digital",
        title: "Sony PlayStation 5 Slim Digital",
        price: 1099999,
        productUrl: "https://www.mercadolibre.com.ar/demo/playstation-5-slim",
      },
      {
        storeSlug: "megatone",
        externalId: "mock-me-ps5-slim-digital",
        title: "Consola Sony PlayStation 5 Slim Digital",
        price: 1129999,
        productUrl: "https://www.megatone.net/demo/playstation-5-slim",
      },
      {
        storeSlug: "musimundo",
        externalId: "mock-mu-ps5-slim-digital",
        title: "PlayStation 5 Slim Digital Edition",
        price: 1149999,
        productUrl: "https://www.musimundo.com/demo/playstation-5-slim",
      },
    ],
  },
  {
    name: "Taladro inal\u00e1mbrico Bosch GSR 120-LI",
    slug: "taladro-inalambrico-bosch-gsr-120-li",
    brand: "Bosch",
    model: "GSR 120-LI",
    categorySlug: "herramientas",
    normalizedName: "taladro inalambrico bosch gsr 120 li",
    offers: [
      {
        storeSlug: "mercadolibre",
        externalId: "mock-ml-bosch-gsr-120",
        title: "Taladro inal\u00e1mbrico Bosch GSR 120-LI",
        price: 159999,
        productUrl: "https://www.mercadolibre.com.ar/demo/bosch-gsr-120",
      },
      {
        storeSlug: "cetrogar",
        externalId: "mock-ce-bosch-gsr-120",
        title: "Taladro Bosch GSR 120-LI",
        price: 169999,
        productUrl: "https://www.cetrogar.com.ar/demo/bosch-gsr-120",
      },
      {
        storeSlug: "megatone",
        externalId: "mock-me-bosch-gsr-120",
        title: "Bosch GSR 120-LI inal\u00e1mbrico",
        price: 164999,
        productUrl: "https://www.megatone.net/demo/bosch-gsr-120",
      },
    ],
  },
  {
    name: "Lavarropas Drean Next 8.14 Eco 8kg",
    slug: "lavarropas-drean-next-814-eco-8kg",
    brand: "Drean",
    model: "Next 8.14 Eco",
    categorySlug: "electrodomesticos",
    normalizedName: "lavarropas drean next 8 14 eco 8kg",
    offers: [
      {
        storeSlug: "mercadolibre",
        externalId: "mock-ml-drean-next-814",
        title: "Lavarropas Drean Next 8.14 Eco 8kg",
        price: 699999,
        productUrl: "https://www.mercadolibre.com.ar/demo/drean-next-814",
      },
      {
        storeSlug: "fravega",
        externalId: "mock-fr-drean-next-814",
        title: "Lavarropas Drean Next 8.14 Eco",
        price: 729999,
        productUrl: "https://www.fravega.com/demo/drean-next-814",
      },
      {
        storeSlug: "cetrogar",
        externalId: "mock-ce-drean-next-814",
        title: "Drean Next 8.14 Eco 8kg",
        price: 719999,
        productUrl: "https://www.cetrogar.com.ar/demo/drean-next-814",
      },
    ],
  },
];

function toPrice(value: number) {
  return value.toFixed(2);
}

function historicalPrice(currentPrice: number, daysAgo: number) {
  if (daysAgo === 0) {
    return currentPrice;
  }

  const wave = Math.sin(daysAgo / 6) * 0.045;
  const olderPremium = daysAgo > 45 ? 0.035 : 0;
  const recentDrop = daysAgo < 14 ? -0.018 : 0;
  const rawPrice = currentPrice * (1 + wave + olderPremium + recentDrop);

  return Math.max(1000, Math.round(rawPrice / 100) * 100);
}

function historyRows(input: {
  productId: string;
  storeId: string;
  offerId: string;
  currentPrice: number;
}) {
  const now = new Date();

  return Array.from({ length: 90 }, (_, index) => {
    const daysAgo = 89 - index;
    const recordedAt = new Date(now);
    recordedAt.setDate(now.getDate() - daysAgo);
    recordedAt.setHours(10, 0, 0, 0);

    return {
      productId: input.productId,
      storeId: input.storeId,
      offerId: input.offerId,
      price: toPrice(historicalPrice(input.currentPrice, daysAgo)),
      currency: "ARS",
      source: "seed:mock",
      isDemo: true,
      recordedAt,
    };
  });
}

async function main() {
  const categoryBySlug = new Map<string, DbRecord>();
  const storeBySlug = new Map<string, DbRecord>();

  for (const category of categories) {
    const savedCategory = await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        description: category.description,
        active: true,
        featured: category.featured,
      },
      create: {
        ...category,
        active: true,
      },
    });

    categoryBySlug.set(category.slug, savedCategory);
  }

  for (const store of stores) {
    const savedStore = await prisma.store.upsert({
      where: { slug: store.slug },
      update: store,
      create: store,
    });

    storeBySlug.set(store.slug, savedStore);
  }

  await prisma.priceHistory.deleteMany({
    where: {
      source: "seed:mock",
      isDemo: true,
    },
  });

  for (const product of products) {
    const category = categoryBySlug.get(product.categorySlug);

    if (!category) {
      throw new Error(`Missing category for slug: ${product.categorySlug}`);
    }

    const savedProduct = await prisma.product.upsert({
      where: { slug: product.slug },
      update: {
        name: product.name,
        brand: product.brand,
        model: product.model,
        categoryId: category.id,
        normalizedName: product.normalizedName,
        isDemo: true,
      },
      create: {
        name: product.name,
        slug: product.slug,
        brand: product.brand,
        model: product.model,
        categoryId: category.id,
        normalizedName: product.normalizedName,
        isDemo: true,
      },
    });

    for (const offer of product.offers) {
      const store = storeBySlug.get(offer.storeSlug);

      if (!store) {
        throw new Error(`Missing store for slug: ${offer.storeSlug}`);
      }

      const savedOffer = await prisma.productOffer.upsert({
        where: {
          storeId_externalId: {
            storeId: store.id,
            externalId: offer.externalId,
          },
        },
        update: {
          productId: savedProduct.id,
          title: offer.title,
          price: toPrice(offer.price),
          currency: "ARS",
          productUrl: offer.productUrl,
          available: true,
          condition: "NEW",
          isDemo: true,
          lastCheckedAt: new Date(),
        },
        create: {
          productId: savedProduct.id,
          storeId: store.id,
          externalId: offer.externalId,
          title: offer.title,
          price: toPrice(offer.price),
          currency: "ARS",
          productUrl: offer.productUrl,
          available: true,
          condition: "NEW",
          isDemo: true,
          lastCheckedAt: new Date(),
        },
      });

      if (offer.storeSlug === "mercadolibre") {
        await prisma.priceHistory.createMany({
          data: historyRows({
            productId: savedProduct.id,
            storeId: store.id,
            offerId: savedOffer.id,
            currentPrice: offer.price,
          }),
        });
      }
    }
  }

  await prisma.bankPromo.deleteMany({
    where: {
      notes: bankPromoSeedNote,
    },
  });

  for (const promo of bankPromos) {
    await prisma.bankPromo.create({
      data: {
        ...promo,
        active: true,
        notes: bankPromoSeedNote,
        sourceUrl: null,
        validFrom: bankPromoValidFrom,
        validUntil: bankPromoValidUntil,
      },
    });
  }

  console.log(
    `Seed prepared ${categories.length} categories, ${stores.length} stores, ${products.length} demo products, ${bankPromos.length} bank promos, and ${products.length * 90} demo price history rows.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

export {};
