import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Card } from "@/components/ui/Card";
import { API_TIERS } from "@/lib/apiTiers";
import { getAbsoluteUrl } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: "Planes de la API",
  description:
    "Planes de la API de PrecioRadar: precios reales, historial y comparativa entre tiendas de Argentina. Tier gratis, PRO y Business.",
  alternates: { canonical: getAbsoluteUrl("/api-planes") },
};

const SUPPORT_EMAIL = "soporte@precio-radar.com";

type Plan = {
  tier: keyof typeof API_TIERS;
  name: string;
  price: string;
  priceHint: string;
  highlight?: boolean;
  features: string[];
};

const numberFmt = new Intl.NumberFormat("es-AR");

function historyLabel(days: number | null) {
  if (days === null) return "Historial completo";
  if (days >= 365) return `${Math.round(days / 365)} año de historial`;
  return `${days} días de historial`;
}

const PLANS: Plan[] = [
  {
    tier: "FREE",
    name: "Free",
    price: "$0",
    priceHint: "para probar e integrar",
    features: [
      `${numberFmt.format(API_TIERS.FREE.dailyLimit)} llamadas por día`,
      historyLabel(API_TIERS.FREE.historyDays),
      "Búsqueda + detalle de precios por producto",
      "Datos de tiendas reales (sin demos)",
    ],
  },
  {
    tier: "PRO",
    name: "PRO",
    price: "USD 9",
    priceHint: "por mes",
    highlight: true,
    features: [
      `${numberFmt.format(API_TIERS.PRO.dailyLimit)} llamadas por día`,
      historyLabel(API_TIERS.PRO.historyDays),
      "Estadísticas de variación de precio",
      "Soporte por email",
    ],
  },
  {
    tier: "BUSINESS",
    name: "Business",
    price: "USD 29",
    priceHint: "por mes",
    features: [
      `${numberFmt.format(API_TIERS.BUSINESS.dailyLimit)} llamadas por día`,
      historyLabel(API_TIERS.BUSINESS.historyDays),
      "Profundidad de historial sin límite",
      "Prioridad de soporte",
    ],
  },
];

export default function ApiPlanesPage() {
  return (
    <main className="bg-[#f4f7fb] py-10 text-slate-950">
      <Container className="space-y-10">
        <section className="rounded-3xl bg-slate-950 p-6 text-white shadow-[0_24px_60px_rgba(15,23,42,0.18)] md:p-8">
          <p className="text-sm font-semibold text-emerald-200">API de PrecioRadar</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
            Precios reales de Argentina, por API
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
            Accedé al mejor precio, las ofertas por tienda y el historial de
            cada producto. Pensado para sellers, comparadores y medios que
            necesitan datos de precios confiables.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              className="inline-flex h-11 items-center rounded-lg bg-white px-5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
              href="/api-docs"
            >
              Ver documentación
            </Link>
            <a
              className="inline-flex h-11 items-center rounded-lg border border-white/20 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
              href={`mailto:${SUPPORT_EMAIL}?subject=Acceso%20a%20la%20API`}
            >
              Solicitar acceso
            </a>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {PLANS.map((plan) => (
            <Card
              className={
                plan.highlight
                  ? "relative border-indigo-300 p-6 shadow-[0_18px_45px_rgba(79,70,229,0.18)] ring-2 ring-indigo-200"
                  : "border-slate-200 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]"
              }
              key={plan.tier}
            >
              {plan.highlight ? (
                <span className="absolute -top-3 left-6 rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white">
                  Más elegido
                </span>
              ) : null}
              <h2 className="text-lg font-bold tracking-tight">{plan.name}</h2>
              <p className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-bold tracking-tight">{plan.price}</span>
                <span className="text-sm text-slate-500">/ {plan.priceHint}</span>
              </p>
              <ul className="mt-5 space-y-2 text-sm text-slate-700">
                {plan.features.map((feature) => (
                  <li className="flex items-start gap-2" key={feature}>
                    <span aria-hidden className="mt-0.5 text-emerald-600">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <a
                className={
                  plan.highlight
                    ? "mt-6 inline-flex h-11 w-full items-center justify-center rounded-lg bg-indigo-600 text-sm font-semibold text-white transition hover:bg-indigo-700"
                    : "mt-6 inline-flex h-11 w-full items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-800 transition hover:border-indigo-300 hover:text-indigo-700"
                }
                href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`API ${plan.name}`)}`}
              >
                Solicitar acceso
              </a>
            </Card>
          ))}
        </section>

        <p className="rounded-xl border border-dashed border-slate-200 bg-white p-5 text-sm leading-6 text-slate-600">
          El cobro automático está en camino. Por ahora damos de alta las claves
          a mano: escribinos a{" "}
          <a className="font-semibold text-indigo-700 hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>{" "}
          contándonos tu caso de uso y te enviamos una API key. ¿Sos seller?
          Probá también el{" "}
          <Link className="font-semibold text-indigo-700 hover:underline" href="/sellers">
            panel de inteligencia de precios
          </Link>
          .
        </p>
      </Container>
    </main>
  );
}
