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
    description: "Taladros, atornilladores, herramientas Bosch, DeWalt y Black & Decker, ferretería y jardín comparadas.",
  },
  {
    slug: "pequenos-electrodomesticos",
    name: "Pequeños electrodomésticos",
    description: "Cafeteras, licuadoras, freidoras de aire y planchas con seguimiento de precio entre tiendas.",
  },
  {
    slug: "hogar",
    name: "Hogar y muebles",
    description: "Colchones, sillas, escritorios, iluminación y deco con comparativa de precios en Argentina.",
  },
  {
    slug: "deportes",
    name: "Deportes",
    description: "Zapatillas, botines, indumentaria deportiva y fitness de marcas comparadas por precio.",
  },
  {
    slug: "indumentaria",
    name: "Indumentaria",
    description: "Ropa, calzado y accesorios para toda la familia con seguimiento del mejor precio.",
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
    rawSlugs: [
      "herramientas",
      "ferreteria",
      "construccion",
      "jardin",
      "pinturas",
      "pinturería",
      "ferreteria-y-construccion",
    ],
    keywords: [
      "taladro",
      "atornillador",
      "amoladora",
      "sierra",
      "soldadora",
      "compresor",
      "hidrolavadora",
      "pintura",
      "rodillo",
      "manguera",
      "cortadora de cesped",
      "bordeadora",
      "motosierra",
      "desmalezadora",
      "parrilla",
      "asador",
      "escalera",
      "generador",
      "carretilla",
      "bosch",
      "dewalt",
      "black decker",
      "makita",
      "stanley",
      "einhell",
      "lusqtoff",
      "herramienta",
    ],
  },
  {
    slug: "pequenos-electrodomesticos",
    rawSlugs: [
      "pequenos-electrodomesticos",
      "pequenos-electro",
      "electro-cocina",
      "electrodomesticos",
      "electro",
      "electro-y-tecnologia",
    ],
    keywords: [
      "cafetera",
      "licuadora",
      "batidora",
      "procesadora",
      "multiprocesadora",
      "juguera",
      "exprimidor",
      "sandwichera",
      "tostadora",
      "pava electrica",
      "hervidor",
      "plancha",
      "plancha de pelo",
      "secador de pelo",
      "afeitadora",
      "aspiradora",
      "robot aspirador",
      "freidora de aire",
      "freidora",
      "mini horno",
      "vaporera",
      "calefactor",
      "purificador",
    ],
  },
  {
    slug: "hogar",
    rawSlugs: [
      "hogar",
      "muebles",
      "muebles-y-deco",
      "deco",
      "decoracion",
      "dormitorio",
      "colchones",
      "bazar",
      "textil-hogar",
    ],
    keywords: [
      "colchon",
      "sommier",
      "almohada",
      "acolchado",
      "sabanas",
      "juego de sabanas",
      "silla",
      "escritorio",
      "sillon",
      "sofa",
      "mesa",
      "comedor",
      "biblioteca",
      "lampara",
      "ventilador de techo",
      "ventilador de pie",
      "cortinas",
      "organizador",
      "perchero",
      "espejo",
      "repisa",
      "mesa de luz",
      "placard",
      "ropero",
      "comoda",
      "alfombra",
      "mueble",
    ],
  },
  {
    slug: "deportes",
    rawSlugs: [
      "deportes",
      "calzado",
      "calzado-deportivo",
      "indumentaria-deportiva",
      "fitness",
      "running",
      "futbol",
    ],
    keywords: [
      "zapatillas",
      "botines",
      "ojotas",
      "nike",
      "adidas",
      "puma",
      "topper",
      "reebok",
      "fila",
      "new balance",
      "under armour",
      "asics",
      "umbro",
      "deportiv",
      "camiseta futbol",
      "pelota",
      "mancuernas",
      "pesas",
      "bicicleta",
      "guantes boxeo",
      "colchoneta yoga",
      "soga saltar",
    ],
  },
  {
    slug: "indumentaria",
    rawSlugs: [
      "indumentaria",
      "ropa",
      "moda",
      "vestimenta",
      "calzado",
      "accesorios",
      "mujer",
      "hombre",
      "ninos",
      "bebes",
    ],
    keywords: [
      "remera",
      "camiseta",
      "musculosa",
      "camisa",
      "blusa",
      "buzo",
      "sweater",
      "cardigan",
      "campera",
      "tapado",
      "chaleco",
      "jean",
      "pantalon",
      "calza",
      "jogging",
      "short",
      "bermuda",
      "pollera",
      "falda",
      "vestido",
      "ropa interior",
      "bombacha",
      "calzoncillo",
      "corpino",
      "medias",
      "pijama",
      "camison",
      "bikini",
      "malla",
      "zapatos",
      "botas",
      "borcegos",
      "sandalias",
      "pantuflas",
      "cartera",
      "mochila",
      "rinonera",
      "billetera",
      "cinturon",
      "gorra",
      "bufanda",
      "guantes",
      "gorro",
    ],
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

// Palabras de alimentos/almacén para excluir comida del catálogo (sin alimentos
// por ahora). Match por TOKEN exacto para no romper palabras como "cafetera"
// (que contiene "cafe") o "pantalla". Los súper (Día/Vea/Jumbo/Carrefour/Más
// Online) devuelven comida y esta guarda evita que entre por búsqueda en vivo.
const FOOD_WORDS = new Set(
  [
    "leche",
    "yerba",
    "mate cocido",
    "arroz",
    "fideos",
    "fideo",
    "aceite",
    "azucar",
    "harina",
    "polenta",
    "galletitas",
    "galleta",
    "gaseosa",
    "gaseosas",
    "agua mineral",
    "cerveza",
    "vino",
    "fernet",
    "whisky",
    "yogur",
    "queso",
    "jamon",
    "fiambre",
    "salchichas",
    "manteca",
    "huevos",
    "carne",
    "pollo",
    "pescado",
    "milanesa",
    "milanesas",
    "hamburguesa",
    "hamburguesas",
    "snack",
    "snacks",
    "golosina",
    "golosinas",
    "chocolate",
    "alfajor",
    "alfajores",
    "caramelos",
    "mermelada",
    "dulce de leche",
    "atun",
    "arvejas",
    "lentejas",
    "garbanzos",
    "puré",
    "pure de tomate",
    "salsa de tomate",
    "ketchup",
    "mayonesa",
    "mostaza",
    "cafe molido",
    "cafe instantaneo",
    "infusiones",
    "cereal",
    "cereales",
    "avena",
    "papas fritas",
    "helado",
    "pizza",
    "empanadas",
    "verdura",
    "verduras",
    "fruta",
    "frutas",
    "pan lactal",
    "facturas",
    "gelatina",
    "flan",
    "condimento",
    "condimentos",
    "especias",
    "alimento balanceado",
    "alimento para perros",
    "alimento para gatos",
  ].map(normalizeForMatch),
);

// True si el nombre del producto parece comida/almacén. Tokeniza y exige
// coincidencia de token completo (o frase completa para términos multi-palabra).
export function isFoodProduct(name: string | null | undefined): boolean {
  if (!name) return false;
  const text = normalizeForMatch(name);
  const tokens = new Set(text.split(" "));

  for (const word of FOOD_WORDS) {
    if (word.includes(" ")) {
      if (text.includes(word)) return true;
    } else if (tokens.has(word)) {
      return true;
    }
  }
  return false;
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

  // Fallback solo-por-keyword: ignora el rawSlug. Necesario para tiendas nuevas
  // (deportivas/moda/construcción) cuya categoría cruda VTEX no figura en los
  // rawSlugs conocidos, pero cuyo nombre sí trae una keyword clara.
  for (const alias of CATEGORY_ALIASES) {
    if (hasKeyword(text, alias.keywords)) return alias.slug;
  }

  return rawSlug;
}
