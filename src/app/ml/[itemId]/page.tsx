import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMercadoLibreItemView } from "@/services/mercadoLibreItemViewService";
import { PriceHistoryChart } from "@/components/product/PriceHistoryChart";
import { DealQualityPanel } from "@/components/product/DealQualityBadge";
import { formatCurrencyARS } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Páginas por ítem de ML: dinámicas y, por ahora, no indexables (evita thin content
// hasta validar el formato).
export const metadata: Metadata = {
  title: "Historial de precio · MercadoLibre | PrecioRadar",
  robots: { index: false, follow: true },
};

export default async function MercadoLibreItemPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const { itemId } = await params;
  const view = await getMercadoLibreItemView(itemId);

  if (!view) notFound();

  const { verdict } = view;
  const s = verdict.stats;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <header className="flex items-start gap-4">
        {view.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={view.imageUrl}
            alt={view.title}
            className="h-20 w-20 flex-shrink-0 rounded-lg border object-contain"
          />
        ) : null}
        <div className="min-w-0">
          <h1 className="text-lg font-semibold leading-6">{view.title}</h1>
          <p className="mt-1 text-2xl font-bold">
            {formatCurrencyARS(view.currentPrice)}
            {!view.available ? (
              <span className="ml-2 align-middle text-sm font-normal text-slate-500">
                (sin stock)
              </span>
            ) : null}
          </p>
        </div>
      </header>

      <div className="mt-6">
        <DealQualityPanel dealQuality={verdict.verdict} />
      </div>

      {view.trackingStartedToday ? (
        <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
          Empezamos a seguir este producto hoy. El historial y el veredicto se vuelven más
          precisos a medida que registramos su precio en los próximos días.
        </p>
      ) : (
        <dl className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
          <Stat label="Más bajo (90d)" value={s.min90} />
          <Stat label="Promedio (60d)" value={s.avg60} />
          <Stat label="Más alto" value={s.maxAll} />
        </dl>
      )}

      <section className="mt-6">
        <PriceHistoryChart
          currentPrice={view.currentPrice}
          history={view.history}
          initialStats={view.stats}
        />
      </section>

      <a
        href={view.productUrl}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-amber-400 px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-amber-300"
      >
        Ver en Mercado Libre
      </a>

      <p className="mt-3 text-center text-xs text-slate-400">
        Precios observados por PrecioRadar vía la API oficial de MercadoLibre.
      </p>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-1 font-semibold">
        {value === null ? "—" : formatCurrencyARS(value)}
      </dd>
    </div>
  );
}
