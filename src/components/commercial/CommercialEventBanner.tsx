import Link from "next/link";
import { getRelevantEvent } from "@/data/commercialEvents";

const dayMs = 24 * 60 * 60 * 1000;

function parseLocalDate(value: string, endOfDay = false) {
  return new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`);
}

function getEventStatus(now: Date) {
  const event = getRelevantEvent(now);
  if (!event) return null;

  const start = parseLocalDate(event.start);
  const end = parseLocalDate(event.end, true);
  const active = now >= start && now <= end;
  const daysUntilStart = Math.max(
    0,
    Math.ceil((start.getTime() - now.getTime()) / dayMs),
  );

  return { active, daysUntilStart, event };
}

export function CommercialEventBanner({ now = new Date() }: { now?: Date }) {
  const status = getEventStatus(now);
  if (!status) return null;

  const { active, event } = status;

  return (
    <section className="border-y border-amber-200 bg-amber-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:py-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
            {active ? "Evento activo" : "Evento próximo"}
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-950 sm:text-base">
            {active
              ? `${event.name}: oportunidades destacadas, con precios e historial verificados.`
              : `${event.name}: oportunidades destacadas para comprar con más contexto.`}
          </p>
        </div>
        <Link
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
          href="/promos-hoy"
        >
          Ver promos destacadas
        </Link>
      </div>
    </section>
  );
}
