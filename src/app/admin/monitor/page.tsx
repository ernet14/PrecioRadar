import type { Metadata } from "next";
import { Container } from "@/components/layout/Container";
import { Card } from "@/components/ui/Card";
import { getMonitorData, type MonitorEvent, type MonitorJob } from "@/services/monitorService";
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

export default async function MonitorPage() {
  const data = await getMonitorData();

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
