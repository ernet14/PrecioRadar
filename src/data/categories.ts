export type CategoryDescriptor = {
  slug: string;
  name: string;
  description: string;
};

type CategoryAlias = {
  rawSlugs: string[];
  keywords: string[];
  slug: string;
};

export const mvpCategoryDescriptors: CategoryDescriptor[] = [
  {
    slug: "celulares",
    name: "Celulares",
    description: "Comparamos celulares Samsung, Motorola, Xiaomi y Apple por precio real, historial y cuotas.",
  },
  {
    slug: "notebooks",
    name: "Notebooks",
    description: "Notebooks Lenovo, HP, Asus y Dell con seguimiento de precio para comprar al mejor momento.",
  },
  {
    slug: "componentes-pc",
    name: "Componentes de PC",
    description: "Placas de video, procesadores, memorias y SSD con historial real de precio.",
  },
  {
    slug: "televisores",
    name: "Televisores",
    description: "Smart TVs Samsung, LG y TCL en distintas pulgadas con comparativa de precios en Argentina.",
  },
  {
    slug: "audio",
    name: "Audio",
    description: "Auriculares, parlantes y barras de sonido con seguimiento del mejor precio.",
  },
  {
    slug: "consolas-videojuegos",
    name: "Consolas y videojuegos",
    description: "PlayStation, Xbox, Nintendo y videojuegos f\u00edsicos con alertas de precio.",
  },
  {
    slug: "electrodomesticos",
    name: "Electrodom\u00e9sticos",
    description: "Lavarropas, heladeras y aires acondicionados con comparativa entre tiendas argentinas.",
  },
  {
    slug: "herramientas",
    name: "Herramientas",
    description: "Taladros, atornilladores y herramientas Bosch, DeWalt y Black & Decker comparadas.",
  },
];

export const mvpCategories = mvpCategoryDescriptors.map((descriptor) => descriptor.name);

const CATEGORY_ALIASES: CategoryAlias[] = [
  {
    slug: "celulares",
    rawSlugs: ["celulares", "telefonia", "tecnologia", "electro-y-tecnologia"],
    keywords: ["celular", "smartphone", "iphone", "galaxy", "motorola", "xiaomi", "redmi", "moto"],
  },
  {
    slug: "notebooks",
    rawSlugs: ["notebooks", "informatica", "tecnologia", "electro-y-tecnologia"],
    keywords: ["notebook", "laptop", "ideapad", "thinkpad", "macbook", "ryzen", "intel core"],
  },
  {
    slug: "componentes-pc",
    rawSlugs: ["componentes-pc", "informatica", "tecnologia"],
    keywords: ["geforce", "rtx", "radeon", "ssd", "procesador", "mother", "memoria ram"],
  },
  {
    slug: "televisores",
    rawSlugs: [
      "televisores",
      "tv-y-video",
      "audio-tv-y-video",
      "tv-audio-y-video",
      "electro",
      "electro-y-tecnologia",
      "tecnologia",
    ],
    keywords: ["televisor", "smart tv", "qled", "oled", "uhd", "crystal uhd", "4k", "pulgadas"],
  },
  {
    slug: "audio",
    rawSlugs: ["audio", "audio-tv-y-video", "tv-audio-y-video", "tecnologia"],
    keywords: ["auricular", "auriculares", "parlante", "soundbar", "barra de sonido", "jbl", "bluetooth"],
  },
  {
    slug: "consolas-videojuegos",
    rawSlugs: ["consolas-videojuegos", "gaming", "tecnologia"],
    keywords: ["playstation", "xbox", "nintendo", "consola", "videojuego"],
  },
  {
    slug: "electrodomesticos",
    rawSlugs: ["electrodomesticos", "electro", "electro-y-tecnologia"],
    keywords: [
      "aire acondicionado",
      "anafe",
      "cocina",
      "freezer",
      "heladera",
      "horno",
      "lavarropas",
      "microondas",
      "secarropas",
    ],
  },
  {
    slug: "herramientas",
    rawSlugs: ["herramientas", "ferreteria"],
    keywords: ["taladro", "atornillador", "bosch", "dewalt", "black decker", "herramienta"],
  },
];

const RAW_CATEGORY_SLUGS_BY_CURATED = new Map<string, string[]>(
  mvpCategoryDescriptors.map((descriptor) => {
    const rawSlugs = CATEGORY_ALIASES
      .filter((alias) => alias.slug === descriptor.slug)
      .flatMap((alias) => alias.rawSlugs);
    return [descriptor.slug, Array.from(new Set([descriptor.slug, ...rawSlugs]))];
  }),
);

function normalizeForMatch(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function hasKeyword(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(normalizeForMatch(keyword)));
}

export function getCategoryDescriptorBySlug(slug: string): CategoryDescriptor | null {
  return mvpCategoryDescriptors.find((descriptor) => descriptor.slug === slug) ?? null;
}

export function getCategoryQuerySlugs(categorySlug: string): string[] {
  return RAW_CATEGORY_SLUGS_BY_CURATED.get(categorySlug) ?? [categorySlug];
}

export function normalizeCategorySlug(input: {
  name?: string | null;
  slug?: string | null;
}): string | null {
  const rawSlug = input.slug ? normalizeForMatch(input.slug).replace(/\s+/g, "-") : null;
  const text = normalizeForMatch(`${input.slug ?? ""} ${input.name ?? ""}`);

  for (const descriptor of mvpCategoryDescriptors) {
    if (rawSlug === descriptor.slug) return descriptor.slug;
  }

  for (const alias of CATEGORY_ALIASES) {
    if (rawSlug && !alias.rawSlugs.includes(rawSlug)) continue;
    if (hasKeyword(text, alias.keywords)) return alias.slug;
  }

  return rawSlug;
}
