import type { Metadata } from "next";
import { Container } from "@/components/layout/Container";
import { Card } from "@/components/ui/Card";
import { getMonitorData, type MonitorEvent, type MonitorJob } from "@/services/monitorService";
import { computePriceIndex, type PriceIndexResult } from "@/services/priceIndexService";
import {
  computeBnaDataRadar,
  listDataRadarSnapshots,
  type DataRadarResult,
  type DataRadarSnapshotSummary,
} from "@/services/dataRadarService";
import type { PassThroughLagResult } from "@/services/passThroughService";
import { LiveMonitorControls } from "./LiveMonitorControls";

export const metadata: Metadata = { title: "Monitor del bot", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export const revalidate = 0;

const timeFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
});

function fmt(date: Date | null) {
  return date ? timeFormatter.format(date) : "—";
}

function fmtDuration(ms: number | null) {
  if (ms === null) return "—";
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;
}

function StatTile({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "good" | "warn" }) {
  const toneClass =
    tone === "good" ? "text-emerald-700" : tone === "warn" ? "text-amber-700" : "text-slate-950";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold tracking-tight ${toneClass}`}>{value}</p>
    </div>
  );
}

function JobLine({ job }: { job: MonitorJob }) {
  const tone =
    job.status === "completed" ? "text-emerald-700" :
    job.status === "running" || job.status === "pending" ? "text-blue-700" :
    job.errors > 0 ? "text-rose-700" : "text-slate-700";
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs">
      <span className="font-mono text-slate-500">{fmt(job.startedAt)}</span>
      <span className={`font-semibold ${tone}`}>{job.provider} · {job.action} · {job.status}</span>
      <span className="font-mono text-slate-600">
        proc {job.processed} · upd {job.updated} · err {job.errors} · out {job.outliers} · {fmtDuration(job.durationMs)}
      </span>
    </div>
  );
}

function EventLine({ event }: { event: MonitorEvent }) {
  const isOutlier = event.action === "cron.outlierDetected";
  return (
    <li className="py-2 text-xs">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-slate-800">
          {event.storeName ?? event.provider} · {event.action}
        </span>
        <span className={`rounded-full px-2 py-0.5 font-semibold ${isOutlier ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"}`}>
          {isOutlier ? "outlier" : event.status}
        </span>
      </div>
      {event.errorMessage ? (
        <p className="mt-1 break-words font-mono text-[11px] text-slate-500">{event.errorMessage}</p>
      ) : null}
      <p className="mt-0.5 font-mono text-[11px] text-slate-400">{fmt(event.createdAt)}</p>
    </li>
  );
}

const REPORT_TONE: Record<string, string> = {
  ok: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warn: "border-amber-200 bg-amber-50 text-amber-800",
  fail: "border-rose-200 bg-rose-50 text-rose-800",
  critical: "border-rose-300 bg-rose-100 text-rose-900",
};

function PriceIndexCard({ index }: { index: PriceIndexResult }) {
  const mature = index.days >= 30;
  const changeTone =
    index.totalChangePct === null ? "text-slate-950" :
    index.totalChangePct > 0 ? "text-rose-700" : "text-emerald-700";
  const max = Math.max(...index.points.map((p) => p.index), 100);
  const min = Math.min(...index.points.map((p) => p.index), 100);
  const span = max - min || 1;

  return (
    <Card className="border-slate-200 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-slate-950">
          Índice de precios (Fase 3 · capa de datos)
        </h2>
        <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">
          {mature ? "serie activa" : "construyendo serie"}
        </span>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Índice encadenado (Jevons) sobre la mediana diaria de precios reales. Base 100 en {index.baseDate ?? "—"}.
        Gana sentido con ~30+ días de historia.
      </p>

      {index.points.length > 0 ? (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Índice actual</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">{index.latestIndex}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Variación acumulada</p>
              <p className={`mt-2 text-2xl font-bold tracking-tight ${changeTone}`}>
                {index.totalChangePct !== null ? `${index.totalChangePct > 0 ? "+" : ""}${index.totalChangePct}%` : "—"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cobertura</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
                {index.days} d · {index.productsTracked} prod
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-end gap-1" style={{ height: 64 }}>
            {index.points.map((point) => (
              <div className="flex flex-1 flex-col items-center gap-1" key={point.date} title={`${point.date}: ${point.index} (n=${point.sampleSize})`}>
                <div
                  className="w-full rounded-t bg-blue-500/70"
                  style={{ height: `${8 + ((point.index - min) / span) * 48}px` }}
                />
                <span className="text-[10px] text-slate-400">{point.date.slice(5)}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="mt-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
          Sin datos de precios reales todavía para el índice.
        </p>
      )}
    </Card>
  );
}

function fmtSigned(value: number | null, suffix = "") {
  if (value === null) return "—";
  return `${value > 0 ? "+" : ""}${value}${suffix}`;
}

function fmtCompactDate(date: string | null) {
  if (!date) return "—";
  const [, month, day] = date.split("-");
  return `${day}/${month}`;
}

function RadarLagLine({ lag }: { lag: PassThroughLagResult }) {
  const betaTone =
    lag.beta === null ? "text-slate-500" :
    lag.beta > 0 ? "text-rose-700" : "text-emerald-700";

  return (
    <div className="grid grid-cols-[56px_1fr_1fr_1fr] gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs">
      <span className="font-semibold text-slate-700">lag {lag.lagDays}d</span>
      <span className="text-slate-600">n={lag.matchedDays}</span>
      <span className={betaTone}>beta {fmtSigned(lag.beta)}</span>
      <span className="text-slate-500">corr {fmtSigned(lag.correlation)}</span>
    </div>
  );
}

const SNAPSHOT_STATUS_TONE: Record<string, string> = {
  insufficient_data: "border-amber-200 bg-amber-50 text-amber-800",
  no_price_history: "border-slate-200 bg-slate-50 text-slate-600",
  no_radar: "border-slate-200 bg-slate-50 text-slate-600",
  ready: "border-emerald-200 bg-emerald-50 text-emerald-800",
};

function DataRadarSnapshotsCard({ snapshots }: { snapshots: DataRadarSnapshotSummary[] }) {
  const latestDate = snapshots[0]?.snapshotDate ?? null;
  const latestCount = latestDate ? snapshots.filter((snapshot) => snapshot.snapshotDate === latestDate).length : 0;

  return (
    <Card className="border-slate-200 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-slate-950">Historial radar dólar</h2>
          <p className="mt-1 text-xs text-slate-500">
            Snapshots guardados por el cron interno. Fuente BNA venta; uso interno hasta 30+ días.
          </p>
        </div>
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
          {latestDate ? `${fmtCompactDate(latestDate)} · ${latestCount} scopes` : "sin snapshots"}
        </span>
      </div>

      {snapshots.length > 0 ? (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-[920px] w-full border-separate border-spacing-0 text-left text-xs">
            <thead>
              <tr className="text-slate-500">
                <th className="border-b border-slate-200 px-3 py-2 font-semibold">Fecha</th>
                <th className="border-b border-slate-200 px-3 py-2 font-semibold">Scope</th>
                <th className="border-b border-slate-200 px-3 py-2 font-semibold">Estado</th>
                <th className="border-b border-slate-200 px-3 py-2 font-semibold">Índice</th>
                <th className="border-b border-slate-200 px-3 py-2 font-semibold">Var.</th>
                <th className="border-b border-slate-200 px-3 py-2 font-semibold">Beta 0d</th>
                <th className="border-b border-slate-200 px-3 py-2 font-semibold">Corr 0d</th>
                <th className="border-b border-slate-200 px-3 py-2 font-semibold">Cobertura</th>
                <th className="border-b border-slate-200 px-3 py-2 font-semibold">FX</th>
              </tr>
            </thead>
            <tbody>
              {snapshots.map((snapshot) => (
                <tr className="odd:bg-white even:bg-slate-50/70" key={`${snapshot.source}-${snapshot.scope}-${snapshot.snapshotDate}`}>
                  <td className="border-b border-slate-100 px-3 py-2 font-mono text-slate-600">
                    {fmtCompactDate(snapshot.snapshotDate)}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-2 font-semibold text-slate-800">
                    {snapshot.scope}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-2">
                    <span className={`rounded-full border px-2 py-0.5 font-semibold ${SNAPSHOT_STATUS_TONE[snapshot.status] ?? SNAPSHOT_STATUS_TONE.no_radar}`}>
                      {snapshot.status}
                    </span>
                  </td>
                  <td className="border-b border-slate-100 px-3 py-2 text-slate-700">
                    {snapshot.priceLatestIndex ?? "—"}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-2 text-slate-700">
                    {fmtSigned(snapshot.priceTotalChangePct, "%")}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-2 text-slate-700">
                    {fmtSigned(snapshot.betaLag0)}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-2 text-slate-700">
                    {fmtSigned(snapshot.correlationLag0)}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-2 text-slate-700">
                    {snapshot.priceDays} d · {snapshot.productsTracked} prod
                  </td>
                  <td className="border-b border-slate-100 px-3 py-2 text-slate-700">
                    {snapshot.fxRates} cot. {snapshot.fxCarried > 0 ? `· cf ${snapshot.fxCarried}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
          Todavía no hay snapshots del radar guardados.
        </p>
      )}
    </Card>
  );
}

function BnaRadarCard({ radar }: { radar: DataRadarResult | null }) {
  if (!radar) {
    return (
      <Card className="border-slate-200 p-5">
        <h2 className="text-base font-semibold text-slate-950">Radar dólar interno</h2>
        <p className="mt-2 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
          Sin índice suficiente para cruzar contra Banco Nación.
        </p>
      </Card>
    );
  }

  const primary = radar.passThrough.lags.find((lag) => lag.lagDays === 0) ?? radar.passThrough.lags[0];

  return (
    <Card className="border-slate-200 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-slate-950">Radar dólar interno</h2>
        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
          no público
        </span>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Fuente: Banco Nación venta. Serie {radar.from}..{radar.to}; {radar.fx.rates.length} cotizaciones.
        {radar.fx.carried > 0 ? ` ${radar.fx.carried} día(s) completado(s) por carry-forward.` : ""}
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <StatTile label="Precio vs BNA (lag 0)" value={fmtSigned(primary?.beta ?? null)} tone="neutral" />
        <StatTile label="Cambio precio" value={fmtSigned(primary?.priceChangePct ?? null, "%")} tone="neutral" />
        <StatTile label="Cambio BNA" value={fmtSigned(primary?.fxChangePct ?? null, "%")} tone="neutral" />
      </div>
      <div className="mt-4 space-y-2">
        {radar.passThrough.lags.map((lag) => (
          <RadarLagLine key={lag.lagDays} lag={lag} />
        ))}
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">
        Con menos de 30 días de índice, esto es solo señal operativa: no usar como conclusión pública.
      </p>
    </Card>
  );
}

export default async function MonitorPage() {
  const [data, priceIndex, radarSnapshots] = await Promise.all([
    getMonitorData(),
    computePriceIndex(),
    listDataRadarSnapshots({ limit: 36 }),
  ]);
  const bnaRadar = await computeBnaDataRadar(priceIndex);

  if (!data) {
    return (
      <main className="bg-[#f4f7fb] py-10 text-slate-950">
        <Container>
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
            Base de datos no disponible para el monitor.
          </p>
        </Container>
      </main>
    );
  }

  const report = data.latestReport;

  return (
    <main className="bg-[#f4f7fb] py-10 text-slate-950">
      <Container className="space-y-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Monitor del bot · en vivo</h1>
            <p className="mt-1 text-sm text-slate-600">
              Qué está haciendo el bot ahora, separando lo sospechoso de lo normal.
            </p>
          </div>
          <LiveMonitorControls generatedAtIso={data.generatedAt} />
        </header>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label="Estado del bot"
            value={data.running ? "Corriendo" : "En reposo"}
            tone={data.running ? "good" : "neutral"}
          />
          <StatTile
            label="Última corrida"
            value={data.lastJob ? data.lastJob.status : "—"}
            tone={data.lastJob?.status === "completed" ? "good" : data.lastJob && data.lastJob.errors > 0 ? "warn" : "neutral"}
          />
          <StatTile label="Precios actualizados (última hora)" value={String(data.priceUpdatesLastHour)} tone="good" />
          <StatTile
            label="Eventos sospechosos (24h)"
            value={String(data.suspicious.length)}
            tone={data.suspicious.length > 0 ? "warn" : "good"}
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <Card className="border-rose-200 p-5">
            <h2 className="flex items-center gap-2 text-base font-semibold text-rose-800">
              🚨 Sospechoso / a revisar
            </h2>
            <p className="mt-1 text-xs text-slate-500">Errores, 403 y precios atípicos (outliers) de las últimas 24h.</p>
            {data.suspicious.length > 0 ? (
              <ul className="mt-3 divide-y divide-slate-100">
                {data.suspicious.map((event) => <EventLine event={event} key={event.id} />)}
              </ul>
            ) : (
              <p className="mt-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
                Nada sospechoso en las últimas 24h. 👌
              </p>
            )}
          </Card>

          <Card className="border-emerald-200 p-5">
            <h2 className="flex items-center gap-2 text-base font-semibold text-emerald-800">
              ✅ Operación normal
            </h2>
            <p className="mt-1 text-xs text-slate-500">Últimas corridas y actividad exitosa del bot.</p>
            <div className="mt-3 divide-y divide-slate-100">
              {data.recentJobs.length > 0 ? (
                data.recentJobs.map((job) => <JobLine job={job} key={job.id} />)
              ) : (
                <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
                  Sin corridas registradas todavía.
                </p>
              )}
            </div>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <PriceIndexCard index={priceIndex} />
          <BnaRadarCard radar={bnaRadar} />
        </section>

        <DataRadarSnapshotsCard snapshots={radarSnapshots} />

        <Card className="border-slate-200 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-slate-950">Último reporte del bot (online)</h2>
            {report ? (
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${REPORT_TONE[report.status] ?? REPORT_TONE.warn}`}>
                {report.status.toUpperCase()} · {fmt(report.createdAt)}
              </span>
            ) : null}
          </div>
          {report ? (
            <div className="mt-3 space-y-3 text-sm">
              <p className="text-slate-700">{report.summary}</p>
              {report.issues.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold text-slate-500">Problemas detectados</p>
                  <ul className="mt-1 list-disc pl-5 text-xs text-slate-600">
                    {report.issues.map((issue, index) => (
                      <li key={index}>
                        <span className="font-semibold">[{issue.severity}]</span> {issue.title} — {issue.detail}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-xs text-emerald-700">Sin problemas detectados en el último reporte.</p>
              )}
              {report.recommendations ? (
                <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  <span className="font-semibold">Recomendaciones:</span> {report.recommendations}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="mt-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
              Todavía no hay reportes diarios registrados.
            </p>
          )}
        </Card>
      </Container>
    </main>
  );
}
