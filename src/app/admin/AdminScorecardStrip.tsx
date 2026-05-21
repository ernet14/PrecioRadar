import Link from "next/link";
import { getScorecardHeadline } from "@/services/monitorService";

const numberFormatter = new Intl.NumberFormat("es-AR");

function Metric({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "good" | "warn";
}) {
  const valueClass =
    tone === "good" ? "text-emerald-700" : tone === "warn" ? "text-amber-700" : "text-slate-900";
  return (
    <span className="inline-flex items-baseline gap-1.5 whitespace-nowrap">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <span className={`font-mono text-sm font-bold ${valueClass}`}>{value}</span>
    </span>
  );
}

export async function AdminScorecardStrip() {
  const headline = await getScorecardHeadline();
  if (!headline) return null;

  return (
    <div className="border-b border-slate-200 bg-slate-950 text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2">
        <Link className="text-xs font-bold uppercase tracking-wide text-emerald-300 hover:underline" href="/admin">
          Scorecard
        </Link>
        <span className="inline-flex items-baseline gap-1.5 whitespace-nowrap">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Comparables</span>
          <span className="font-mono text-sm font-bold text-emerald-300">
            {numberFormatter.format(headline.comparableProducts)} ({headline.comparableRate}%)
          </span>
        </span>
        <Metric label="Precios/última hora" value={numberFormatter.format(headline.priceUpdatesLastHour)} tone="good" />
        <Metric
          label="Errores 24h"
          value={numberFormatter.format(headline.providerErrors24h)}
          tone={headline.providerErrors24h > 0 ? "warn" : "good"}
        />
        <Link
          className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-white/10 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-white/20"
          href="/admin/monitor"
        >
          <span aria-hidden className="inline-block size-2 animate-pulse rounded-full bg-emerald-400" />
          Monitor en vivo
        </Link>
      </div>
    </div>
  );
}
