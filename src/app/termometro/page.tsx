import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Card } from "@/components/ui/Card";
import { DealQualityBadge } from "@/components/product/DealQualityBadge";
import { formatCurrencyARS, formatDate } from "@/lib/utils";
import { getAbsoluteUrl } from "@/lib/seo/site";
import { getRelevantEvent } from "@/data/commercialEvents";
import {
  getDealThermometer,
  getVerdictPercent,
  type ThermometerEntry,
} from "@/services/thermometerService";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Termómetro de ofertas: cuántas son reales en Argentina",
  description:
    "Medimos qué porcentaje de las ofertas tiene un descuento real comparando el precio actual contra el promedio de los últimos 60 días. Datos verificables, sin opiniones.",
  alternates: { canonical: getAbsoluteUrl("/termometro") },
};

function StatCard({
  emoji,
  label,
  percent,
  count,
  className,
}: {
  emoji: string;
  label: string;
  percent: number;
  count: number;
  className: string;
}) {
  return (
    <Card className={`p-5 ${className}`}>
      <p className="text-3xl">{emoji}</p>
      <p className="mt-2 text-4xl font-bold tracking-tight">{percent}%</p>
      <p className="mt-1 text-sm font-semibold">{label}</p>
      <p className="mt-1 text-xs opacity-80">{count} productos</p>
    </Card>
  );
}

function ExampleRow({ entry }: { entry: ThermometerEntry }) {
  return (
    <Link
      className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 transition hover:border-blue-300 hover:bg-blue-50"
      href={`/producto/${entry.slug}`}
    >
      <div className="min-w-0">
        <p className="line-clamp-1 text-sm font-semibold text-slate-950">
          {entry.name}
        </p>
        <p className="mt-0.5 text-xs text-slate-500">
          {entry.storeName} · {formatCurrencyARS(entry.price)}
        </p>
      </div>
      <DealQualityBadge dealQuality={entry.dealQuality} />
    </Link>
  );
}

export default async function TermometroPage() {
  const summary = await getDealThermometer();
  const event = getRelevantEvent();
  const today = new Date();

  const realPercent = getVerdictPercent(summary, "REAL");
  const minorPercent = getVerdictPercent(summary, "MINOR");
  const inflatedPercent = getVerdictPercent(summary, "INFLATED");
  const noDataPercent = getVerdictPercent(summary, "NO_DATA");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "Termómetro de ofertas PrecioRadar",
    description:
      "Porcentaje de ofertas con descuento real, descuento menor u oferta inflada, medido contra el promedio de precios de los últimos 60 días.",
    creator: { "@type": "Organization", name: "PrecioRadar" },
    dateModified: today.toISOString(),
    url: getAbsoluteUrl("/termometro"),
  };

  return (
    <main className="bg-[#f4f7fb] py-10 text-slate-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Container className="space-y-8">
        <section className="rounded-3xl bg-slate-950 p-6 text-white shadow-[0_24px_60px_rgba(15,23,42,0.18)] md:p-8">
          <p className="text-sm font-semibold text-emerald-200">
            Actualizado {formatDate(today)}
            {event ? ` · ${event.name}` : ""}
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
            Termómetro de ofertas
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
            Comparamos el precio actual de cada producto contra el promedio de
            los últimos 60 días. Así medimos cuántas &quot;ofertas&quot; tienen
            un descuento real y cuántas están infladas. Solo datos verificables.
          </p>
        </section>

        {summary.evaluated > 0 ? (
          <>
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                emoji="✅"
                label="Oferta real"
                percent={realPercent}
                count={summary.counts.REAL}
                className="border-emerald-200 bg-emerald-50 text-emerald-900"
              />
              <StatCard
                emoji="⚠️"
                label="Descuento menor"
                percent={minorPercent}
                count={summary.counts.MINOR}
                className="border-amber-200 bg-amber-50 text-amber-900"
              />
              <StatCard
                emoji="🚫"
                label="Oferta inflada"
                percent={inflatedPercent}
                count={summary.counts.INFLATED}
                className="border-red-200 bg-red-50 text-red-900"
              />
              <StatCard
                emoji="🔹"
                label="Sin datos suficientes"
                percent={noDataPercent}
                count={summary.counts.NO_DATA}
                className="border-slate-200 bg-slate-100 text-slate-700"
              />
            </section>

            <p className="text-sm text-slate-500">
              Sobre {summary.total} productos analizados, {summary.evaluated}{" "}
              tienen historial suficiente (mínimo 14 capturas en 60 días) para
              evaluar la oferta.
            </p>

            <section className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-3">
                <h2 className="text-xl font-semibold text-slate-950">
                  🚫 Ofertas infladas detectadas
                </h2>
                {summary.inflatedExamples.length > 0 ? (
                  summary.inflatedExamples.map((entry) => (
                    <ExampleRow entry={entry} key={entry.slug} />
                  ))
                ) : (
                  <p className="text-sm text-slate-500">
                    No detectamos ofertas infladas en este momento.
                  </p>
                )}
              </div>
              <div className="space-y-3">
                <h2 className="text-xl font-semibold text-slate-950">
                  ✅ Bajas reales destacadas
                </h2>
                {summary.realExamples.length > 0 ? (
                  summary.realExamples.map((entry) => (
                    <ExampleRow entry={entry} key={entry.slug} />
                  ))
                ) : (
                  <p className="text-sm text-slate-500">
                    Todavía no encontramos bajas reales significativas.
                  </p>
                )}
              </div>
            </section>
          </>
        ) : (
          <Card className="border-dashed border-slate-200 p-6 text-sm leading-6 text-slate-600">
            <p className="font-semibold text-slate-950">
              Termómetro en construcción
            </p>
            <p className="mt-2">
              Estamos acumulando historial real de precios. Necesitamos al menos
              14 capturas por producto en 60 días para evaluar una oferta sin
              inventar datos. Volvé en unos días.
            </p>
            <Link
              className="mt-3 inline-flex font-semibold text-blue-700 hover:underline"
              href="/buscar"
            >
              Mientras tanto, comparar precios
            </Link>
          </Card>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm leading-6 text-slate-600">
          <h2 className="text-lg font-semibold text-slate-950">Metodología</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            <li>
              <strong>✅ Oferta real:</strong> el precio está por debajo del
              promedio de 60 días más allá del umbral de su categoría.
            </li>
            <li>
              <strong>⚠️ Descuento menor:</strong> hay descuento, pero menor al
              esperado para la categoría.
            </li>
            <li>
              <strong>🚫 Oferta inflada:</strong> el precio actual está por
              encima del promedio de 60 días, o subió fuerte en los días previos
              a un evento comercial.
            </li>
            <li>
              <strong>🔹 Sin datos suficientes:</strong> menos de 14 capturas en
              60 días. No emitimos un veredicto sin respaldo.
            </li>
          </ul>
          <p className="mt-3 text-xs text-slate-400">
            Comparamos precios y patrones, no vendedores individuales. Datos
            verificables sujetos a corrección.
          </p>
        </section>
      </Container>
    </main>
  );
}
