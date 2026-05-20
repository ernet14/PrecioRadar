// Calendario de eventos comerciales AR (ver roadmap Etapa 12 — "infla antes del evento").
// Las fechas se usan para detectar inflación de precios en los días previos a un evento.

export type CommercialEvent = {
  slug: string;
  name: string;
  /** Inicio del evento (inclusive), ISO date YYYY-MM-DD. */
  start: string;
  /** Fin del evento (inclusive), ISO date YYYY-MM-DD. */
  end: string;
};

// Fuente: roadmap "Calendario de eventos comerciales AR 2026".
export const commercialEvents: CommercialEvent[] = [
  { slug: "hot-sale-2026", name: "Hot Sale 2026", start: "2026-05-11", end: "2026-05-17" },
  { slug: "dia-del-padre-2026", name: "Día del Padre 2026", start: "2026-06-08", end: "2026-06-15" },
  { slug: "dia-del-nino-2026", name: "Día del Niño 2026", start: "2026-08-10", end: "2026-08-17" },
  { slug: "cybermonday-2026", name: "CyberMonday 2026", start: "2026-11-02", end: "2026-11-08" },
  { slug: "black-friday-2026", name: "Black Friday 2026", start: "2026-11-27", end: "2026-11-29" },
  { slug: "navidad-2026", name: "Navidad 2026", start: "2026-12-15", end: "2026-12-24" },
];

const DAY_MS = 24 * 60 * 60 * 1000;

function parseDate(value: string): number {
  // Mediodía UTC para evitar corrimientos por zona horaria.
  return new Date(`${value}T12:00:00.000Z`).getTime();
}

/**
 * Devuelve el evento comercial relevante para una fecha dada: activo, o que
 * comienza dentro de `windowDays`. Es la ventana en la que un vendedor podría
 * inflar precios antes de "rebajarlos".
 */
export function getRelevantEvent(
  now: Date = new Date(),
  windowDays = 21,
): CommercialEvent | null {
  const nowMs = now.getTime();

  for (const event of commercialEvents) {
    const start = parseDate(event.start);
    const end = parseDate(event.end) + DAY_MS; // fin inclusive

    const isActive = nowMs >= start && nowMs <= end;
    const startsSoon = start >= nowMs && start - nowMs <= windowDays * DAY_MS;

    if (isActive || startsSoon) {
      return event;
    }
  }

  return null;
}
