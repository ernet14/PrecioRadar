import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Card } from "@/components/ui/Card";
import { formatCurrencyARS } from "@/lib/utils";
import { requireUser } from "@/lib/supabase/auth";
import {
  getApiProductPricing,
  searchApiProducts,
} from "@/services/apiPricingService";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Inteligencia de precios",
  description: "Compará tu precio contra el mercado real.",
  robots: { index: false, follow: false },
};

type SellersSearchParams = {
  q?: string;
  slug?: string;
  yourPrice?: string;
};

function pct(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

const inputClass =
  "h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-950 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100";

export default async function SellersPage({
  searchParams,
}: {
  searchParams: Promise<SellersSearchParams>;
}) {
  await requireUser("/sellers");

  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const slug = (params.slug ?? "").trim();
  const yourPriceRaw = (params.yourPrice ?? "").trim();
  const yourPrice = yourPriceRaw && Number.isFinite(Number(yourPriceRaw))
    ? Number(yourPriceRaw)
    : null;

  const search = q ? await searchApiProducts(q, 20) : null;
  const pricing = slug ? await getApiProductPricing(slug, 365) : null;

  const data = pricing?.status === "ok" ? pricing.data : null;
  const best = data?.bestPrice ?? null;
  const avg = data?.stats.averagePrice ?? null;
  const gapBest = yourPrice !== null && best && best > 0 ? ((yourPrice - best) / best) * 100 : null;
  const gapAvg = yourPrice !== null && avg && avg > 0 ? ((yourPrice - avg) / avg) * 100 : null;

  return (
    <main className="bg-[#f4f7fb] py-10 text-slate-950">
      <Container className="space-y-8">
        <section className="rounded-3xl bg-slate-950 p-6 text-white shadow-[0_24px_60px_rgba(15,23,42,0.18)] md:p-8">
          <p className="text-sm font-semibold text-emerald-200">Inteligencia de precios · beta</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
            Compará tu precio con el mercado
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
            Buscá un producto, mirá su posición de precio real entre tiendas y
            su historial, y calculá qué tan competitivo está tu precio.
          </p>
        </section>

        <Card className="border-slate-200 p-5">
          <form action="/sellers" className="flex flex-col gap-3 sm:flex-row" method="get">
            <input
              className={inputClass}
              defaultValue={q}
              name="q"
              placeholder="Buscar producto (ej: notebook lenovo, smart tv 55)"
              type="search"
            />
            <button
              className="h-11 shrink-0 rounded-lg bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
              type="submit"
            >
              Buscar
            </button>
          </form>
        </Card>

        {search?.status === "ok" ? (
          search.count > 0 ? (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-slate-500">
                {search.count} resultados para “{search.query}”
              </h2>
              <div className="grid gap-2 md:grid-cols-2">
                {search.results.map((result) => (
                  <Link
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-blue-300 hover:bg-blue-50"
                    href={`/sellers?slug=${encodeURIComponent(result.slug)}`}
                    key={result.slug}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-950">{result.name}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {result.category ?? "Sin categoría"} · {result.offerCount} tienda(s)
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-bold text-slate-950">
                      {result.bestPrice !== null ? formatCurrencyARS(result.bestPrice) : "—"}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ) : (
            <p className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
              No encontramos productos reales para “{search.query}”.
            </p>
          )
        ) : null}

        {pricing?.status === "not_found" ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
            No encontramos ese producto con ofertas reales.
          </p>
        ) : null}

        {data ? (
          <section className="space-y-5">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">{data.name}</h2>
              <p className="mt-1 text-sm text-slate-500">
                {data.category ?? "Sin categoría"} · {data.offerCount} tienda(s) ·{" "}
                {data.stats.isSufficient
                  ? `${data.stats.pointsCount} puntos de historial`
                  : "historial insuficiente (estimación parcial)"}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Kpi label="Mejor precio (mercado)" value={best !== null ? formatCurrencyARS(best) : "—"} />
              <Kpi label="Promedio histórico" value={avg ? formatCurrencyARS(avg) : "—"} />
              <Kpi label="Mínimo histórico" value={formatCurrencyARS(data.stats.minPrice)} />
              <Kpi
                label="Máximo histórico"
                value={formatCurrencyARS(data.stats.maxPrice)}
                hint={
                  data.stats.variationPercent !== null
                    ? `Variación ${pct(data.stats.variationPercent)}`
                    : undefined
                }
              />
            </div>

            <Card className="border-slate-200 p-5">
              <h3 className="text-base font-semibold text-slate-950">Ofertas por tienda</h3>
              <ul className="mt-3 divide-y divide-slate-100">
                {data.offers.map((offer) => (
                  <li className="flex items-center justify-between gap-3 py-2 text-sm" key={`${offer.storeSlug}-${offer.price}`}>
                    <span className="font-medium text-slate-700">
                      {offer.store}
                      {!offer.available ? " (sin stock)" : ""}
                    </span>
                    <span className="font-bold text-slate-950">{formatCurrencyARS(offer.price)}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="border-slate-200 p-5">
              <h3 className="text-base font-semibold text-slate-950">Tu precio vs el mercado</h3>
              <form action="/sellers" className="mt-3 flex flex-col gap-3 sm:flex-row" method="get">
                <input name="slug" type="hidden" value={data.slug} />
                <input
                  className={inputClass}
                  defaultValue={yourPriceRaw}
                  min={0}
                  name="yourPrice"
                  placeholder="Tu precio en ARS"
                  type="number"
                />
                <button
                  className="h-11 shrink-0 rounded-lg bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
                  type="submit"
                >
                  Comparar
                </button>
              </form>

              {yourPrice !== null && gapBest !== null ? (
                <div className="mt-4 space-y-2 text-sm">
                  <p className="text-slate-700">
                    Contra el mejor precio del mercado estás{" "}
                    <strong className={gapBest <= 0 ? "text-emerald-700" : "text-rose-700"}>
                      {pct(gapBest)}
                    </strong>{" "}
                    ({formatCurrencyARS(Math.abs(yourPrice - (best ?? 0)))}{" "}
                    {gapBest <= 0 ? "más barato/igual" : "más caro"}).
                  </p>
                  {gapAvg !== null ? (
                    <p className="text-slate-700">
                      Contra el promedio histórico estás{" "}
                      <strong className={gapAvg <= 0 ? "text-emerald-700" : "text-amber-700"}>
                        {pct(gapAvg)}
                      </strong>
                      .
                    </p>
                  ) : null}
                  <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
                    {gapBest <= 0
                      ? "Tenés el precio más competitivo del mercado."
                      : gapBest <= 5
                        ? "Competitivo: estás muy cerca del mejor precio."
                        : "Caro: hay tiendas bastante más baratas para este producto."}
                  </p>
                </div>
              ) : null}
            </Card>
          </section>
        ) : null}
      </Container>
    </main>
  );
}
