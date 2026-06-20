import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Card } from "@/components/ui/Card";
import { computePriceIndex, type PriceIndexResult } from "@/services/priceIndexService";
import { getAbsoluteUrl, getSiteUrl } from "@/lib/seo/site";
import { safeJsonLd } from "@/lib/seo/safeJsonLd";

export const revalidate = 3600;

const canonical = getAbsoluteUrl("/indice");
const title = "Índice de precios Argentina — PrecioRadar";
const description =
  "Seguí la evolución de los precios de electrónica y tecnología en Argentina. Índice encadenado Jevons calculado diariamente sobre precios reales de retailers, sin precios de lista.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical },
  openGraph: {
    title,
    description,
    url: canonical,
    siteName: "PrecioRadar",
    locale: "es_AR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

function PriceChart({ points }: { points: PriceIndexResult["points"] }) {
  if (points.length === 0) return null;

  const values = points.map((p) => p.index);
  const max = Math.max(...values, 100);
  const min = Math.min(...values, 100);
  const span = max - min || 1;

  // Show date labels every N points so they don't overlap.
  const labelStep = points.length <= 14 ? 1 : points.length <= 30 ? 3 : 7;

  return (
    <div className="mt-2 overflow-x-auto">
      <div className="min-w-[360px]">
        <div className="flex items-end gap-0.5" style={{ height: 120 }}>
          {points.map((point) => (
            <div
              className="flex flex-1 flex-col items-center"
              key={point.date}
              title={`${point.date}: ${point.index} (n=${point.sampleSize})`}
            >
              <div
                className="w-full rounded-t bg-blue-500/70 transition-all hover:bg-blue-600"
                style={{ height: `${16 + ((point.index - min) / span) * 88}px` }}
              />
            </div>
          ))}
        </div>
        <div className="mt-1 flex items-start gap-0.5">
          {points.map((point, i) => (
            <div className="flex flex-1 justify-center" key={point.date}>
              {i % labelStep === 0 ? (
                <span className="text-[10px] leading-3 text-slate-400">
                  {point.date.slice(5)}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function IndicePage() {
  const index = await computePriceIndex();

  const mature = index.days >= 30;
  const hasData = index.points.length > 0;

  const changeTone =
    index.totalChangePct === null
      ? "text-slate-950"
      : index.totalChangePct > 0
        ? "text-rose-700"
        : "text-emerald-700";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "Índice de precios de electrónica y tecnología — Argentina (PrecioRadar)",
    description:
      "Índice encadenado tipo Jevons calculado diariamente sobre la mediana de precios reales de retailers VTEX en Argentina. Base 100 en el primer día con datos.",
    url: canonical,
    inLanguage: "es-AR",
    creator: {
      "@type": "Organization",
      name: "PrecioRadar",
      url: getSiteUrl(),
    },
    temporalCoverage: index.baseDate && index.latestDate
      ? `${index.baseDate}/${index.latestDate}`
      : undefined,
    spatialCoverage: {
      "@type": "Place",
      name: "Argentina",
    },
    isPartOf: {
      "@type": "WebSite",
      url: getSiteUrl(),
      name: "PrecioRadar",
    },
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: getSiteUrl() },
      { "@type": "ListItem", position: 2, name: "Índice de precios", item: canonical },
    ],
  };

  return (
    <main className="bg-[#f4f7fb] py-10 text-slate-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbLd) }}
      />

      <Container className="space-y-8">
        <nav className="text-sm text-slate-500">
          <Link className="hover:text-slate-900" href="/">Inicio</Link>
          <span className="mx-2">/</span>
          <span className="text-slate-900">Índice de precios</span>
        </nav>

        <section>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Índice de precios · Argentina
            </h1>
            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                mature
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-amber-200 bg-amber-50 text-amber-800"
              }`}
            >
              {mature ? "serie activa" : "construyendo serie"}
            </span>
          </div>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
            Seguimos la evolución real de los precios de electrónica y tecnología
            en Argentina, calculando un índice diario sobre precios efectivos de
            retailers — sin precios de lista, sin valores de tarjeta.
          </p>
        </section>

        {!mature && hasData ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
            <strong>Serie en construcción:</strong> llevamos{" "}
            {index.days} día{index.days === 1 ? "" : "s"} de historia. El índice
            gana representatividad con ~30+ días acumulados; por ahora refleja
            tendencia, no inflación estadísticamente robusta.
          </div>
        ) : null}

        {!hasData ? (
          <Card className="border-dashed border-slate-300 p-8 text-center shadow-none">
            <p className="text-base font-semibold text-slate-950">
              Construyendo la base de datos histórica
            </p>
            <p className="mt-2 text-sm text-slate-500">
              El índice arranca cuando el bot acumula su primera semana de precios
              reales. Volvé pronto.
            </p>
          </Card>
        ) : (
          <Card className="border-slate-200 p-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Índice actual
                </p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
                  {index.latestIndex}
                </p>
                <p className="mt-1 text-xs text-slate-400">base 100 = {index.baseDate ? formatDate(index.baseDate) : "—"}</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Variación acumulada
                </p>
                <p className={`mt-2 text-3xl font-bold tracking-tight ${changeTone}`}>
                  {index.totalChangePct !== null
                    ? `${index.totalChangePct > 0 ? "+" : ""}${index.totalChangePct}%`
                    : "—"}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  desde {index.baseDate ? formatDate(index.baseDate) : "—"}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Productos rastreados
                </p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
                  {index.productsTracked}
                </p>
                <p className="mt-1 text-xs text-slate-400">con precios reales</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Días de historia
                </p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
                  {index.days}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  hasta {index.latestDate ? formatDate(index.latestDate) : "—"}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Evolución del índice
              </p>
              <PriceChart points={index.points} />
            </div>
          </Card>
        )}

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-950">Metodología</h2>
          <Card className="border-slate-200 p-6">
            <div className="space-y-4 text-sm leading-6 text-slate-600">
              <div>
                <h3 className="font-semibold text-slate-800">Índice encadenado Jevons</h3>
                <p className="mt-1">
                  Usamos la misma familia de índices que los IPC para agregar precios
                  elementales: media geométrica de los relativos de precio (precio_t /
                  precio_{"{t-1}"}) sobre los productos presentes en ambos días. Esto evita
                  sesgos cuando la canasta de productos cambia con el tiempo.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Precio representativo por producto</h3>
                <p className="mt-1">
                  Calculamos la <strong>mediana</strong> de todos los precios registrados
                  ese día entre las tiendas monitoreadas. La mediana es robusta a outliers
                  y a promociones puntuales de una sola tienda.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Fuente de datos</h3>
                <p className="mt-1">
                  Precios reales de retailers VTEX (Frávega, Fravega.com, Cetrogar, Megatone,
                  Musimundo y otros). Solo incluimos precios de venta al público efectivos;
                  excluimos precios de lista y valores sin stock. La tabla{" "}
                  <code className="rounded bg-slate-100 px-1 text-xs">PriceHistory</code>{" "}
                  registra cada actualización con timestamp.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Base 100</h3>
                <p className="mt-1">
                  El índice arranca en 100 el primer día con datos suficientes (
                  {index.baseDate ? formatDate(index.baseDate) : "inicio de la serie"}
                  ). Cada punto diario representa el nivel de precios relativo a ese día
                  base: un valor de 110 significa que los precios subieron un 10% en
                  promedio desde el inicio.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Actualización</h3>
                <p className="mt-1">
                  El bot corre diariamente y actualiza la serie. El índice de esta página
                  se recalcula cada hora con los últimos datos disponibles.
                </p>
              </div>
              {!mature ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
                  <strong>Nota importante:</strong> Con menos de 30 días de historia, el
                  índice refleja movimientos de precios pero no es estadísticamente
                  representativo de la inflación general del rubro. A medida que la serie
                  crece, la señal se vuelve más robusta.
                </div>
              ) : null}
            </div>
          </Card>
        </section>

        <section className="border-t border-slate-200 pt-6">
          <h2 className="text-lg font-semibold text-slate-950">Explorar más</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
              href="/termometro"
            >
              Termómetro de ofertas
            </Link>
            <Link
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
              href="/promos-hoy"
            >
              Promos de hoy
            </Link>
            <Link
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
              href="/buscar"
            >
              Buscar productos
            </Link>
          </div>
        </section>
      </Container>
    </main>
  );
}
