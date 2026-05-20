// Etapa 9 (tarea 3) — cohortes de newsletter. El usuario elige a qué listas
// suscribirse; cada lista se envía con un criterio distinto.

export type NewsletterSegment = {
  slug: string;
  name: string;
  description: string;
};

export const newsletterSegments: NewsletterSegment[] = [
  {
    slug: "cazadores-ofertas",
    name: "Cazadores de ofertas",
    description: "Resumen semanal con las 10 mayores bajas de precio reales.",
  },
  {
    slug: "tecno-fan",
    name: "Tecno fan",
    description: "Aviso cuando hay una baja real en celulares, notebooks o tech.",
  },
  {
    slug: "hot-sale-tracker",
    name: "Hot Sale tracker",
    description: "Alertas estacionales durante Hot Sale y CyberMonday.",
  },
];

const validSlugs = new Set(newsletterSegments.map((segment) => segment.slug));

/** Filtra a slugs válidos y deduplica. */
export function normalizeSegments(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => validSlugs.has(value))));
}
