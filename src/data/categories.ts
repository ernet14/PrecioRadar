export type CategoryDescriptor = {
  slug: string;
  name: string;
  description: string;
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

export function getCategoryDescriptorBySlug(slug: string): CategoryDescriptor | null {
  return mvpCategoryDescriptors.find((descriptor) => descriptor.slug === slug) ?? null;
}

