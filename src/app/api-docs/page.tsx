import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Card } from "@/components/ui/Card";
import { getAbsoluteUrl } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: "Datos para empresas | PrecioRadar",
  description:
    "Acceso privado a datos de precios reales, ofertas por tienda e historial de productos de Argentina.",
  alternates: { canonical: getAbsoluteUrl("/api-docs") },
};

const DATA_POINTS = [
  "Mejor precio disponible por producto",
  "Ofertas por tienda con disponibilidad",
  "Historial de precios según el plan",
  "Estadísticas de variación y rango de precios",
  "Datos de tiendas reales, sin productos demo",
];

const USE_CASES = [
  {
    title: "Sellers",
    text: "Monitoreo de competencia, cambios de precio y oportunidades de margen.",
  },
  {
    title: "Comparadores",
    text: "Catálogo de productos con precios actuales e historial para enriquecer fichas.",
  },
  {
    title: "Medios y research",
    text: "Señales de precios para notas, rankings, tendencias y análisis de mercado.",
  },
];

const ACCESS_STEPS = [
  "Elegís un plan según volumen e historial necesario.",
  "Nos contás el caso de uso para preparar el acceso correcto.",
  "Coordinamos el alta privada y la guía de integración fuera de la página pública.",
  "Medimos consumo diario y ajustamos el plan si el volumen crece.",
];

const ACCESS_SUMMARY = [
  { label: "Cobertura", value: "Productos, tiendas, precios actuales e historial disponible" },
  { label: "Alta", value: "Acceso privado para cada cliente aprobado" },
  { label: "Operación", value: "Límites por plan, seguimiento de consumo y soporte" },
  { label: "Entrega", value: "Guía privada y acompañamiento durante la integración" },
];

export default function ApiDocsPage() {
  return (
    <main className="bg-[#f4f7fb] py-10 text-slate-950">
      <Container className="space-y-8">
        <section className="rounded-3xl bg-slate-950 p-6 text-white shadow-[0_24px_60px_rgba(15,23,42,0.18)] md:p-8">
          <p className="text-sm font-semibold text-emerald-200">Datos B2B de PrecioRadar</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
            Datos de precios reales para integrar en tu negocio
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
            El servicio entrega precios, ofertas e historial de productos de Argentina
            para sellers, comparadores y equipos que necesitan datos confiables sin
            construir scraping propio.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              className="inline-flex h-11 items-center rounded-lg bg-white px-5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
              href="/api-planes"
            >
              Ver planes
            </Link>
            <a
              className="inline-flex h-11 items-center rounded-lg border border-white/20 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
              href="mailto:soporte@precio-radar.com?subject=Acceso%20a%20datos%20para%20empresas"
            >
              Solicitar acceso
            </a>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <Card className="border-slate-200 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            <h2 className="text-xl font-bold tracking-tight">Qué entrega</h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-700">
              {DATA_POINTS.map((item) => (
                <li className="flex gap-2" key={item}>
                  <span aria-hidden className="mt-0.5 text-emerald-600">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="border-slate-200 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            <h2 className="text-xl font-bold tracking-tight">Cómo se entrega</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              El acceso se habilita de forma privada para cada cliente. La información
              operativa y la guía de integración se comparten solo después del alta,
              según el caso de uso y el plan contratado.
            </p>
            <dl className="mt-4 grid gap-3 text-sm">
              {ACCESS_SUMMARY.map((item) => (
                <div className="rounded-lg border border-slate-200 bg-white p-3" key={item.label}>
                  <dt className="font-semibold text-slate-950">{item.label}</dt>
                  <dd className="mt-1 text-slate-600">{item.value}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight">Para quién sirve</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {USE_CASES.map((useCase) => (
              <Card
                className="border-slate-200 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]"
                key={useCase.title}
              >
                <h3 className="font-bold tracking-tight text-slate-950">{useCase.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{useCase.text}</p>
              </Card>
            ))}
          </div>
        </section>

        <Card className="border-slate-200 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <h2 className="text-xl font-bold tracking-tight">Alta y operación</h2>
          <ol className="mt-4 grid gap-3 text-sm text-slate-700 md:grid-cols-2">
            {ACCESS_STEPS.map((step, index) => (
              <li className="flex gap-3 rounded-lg border border-slate-200 bg-white p-4" key={step}>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                  {index + 1}
                </span>
                <span className="leading-6">{step}</span>
              </li>
            ))}
          </ol>
        </Card>

          <p className="rounded-xl border border-dashed border-slate-200 bg-white p-5 text-sm leading-6 text-slate-600">
          Esta página es comercial y no expone instrucciones técnicas públicas. Los
          detalles de integración se comparten solo con clientes habilitados.{" "}
          <Link className="font-semibold text-indigo-700 hover:underline" href="/api-planes">
            Elegí un plan y solicitá acceso
          </Link>
          .
        </p>
      </Container>
    </main>
  );
}
