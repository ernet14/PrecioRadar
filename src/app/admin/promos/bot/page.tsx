import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { requireAdmin } from "@/lib/supabase/auth";
import {
  getBankPromoBotOverview,
  isBankPromoBotAutopublishEnabled,
} from "@/services/bankPromoBotService";
import { runBankPromoBotAction } from "./actions";

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatDate(date: Date | null) {
  if (!date) return "Sin fecha";
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "short" }).format(date);
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
    </div>
  );
}

export default async function BankPromoBotPage() {
  await requireAdmin();
  const overview = await getBankPromoBotOverview();

  if (overview.status !== "ready") {
    return (
      <main className="bg-[#f4f7fb] py-10 text-slate-950">
        <Container>
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
            {overview.reason}
          </p>
        </Container>
      </main>
    );
  }

  const activeBotPromos = overview.botPromos.filter((promo) => promo.active);
  const lastRun = overview.lastRuns[0] ?? null;

  return (
    <main className="bg-[#f4f7fb] py-10 text-slate-950">
      <Container className="space-y-8">
        <section className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900"
              href="/admin/promos"
            >
              &lt;- Promos
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">Bot de promos bancarias</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Estado de fuentes, corridas y promos importadas por el bot.
            </p>
          </div>

          <form action={runBankPromoBotAction}>
            <button
              className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              type="submit"
            >
              Ejecutar ahora
            </button>
          </form>
        </section>

        <section className="grid gap-3 md:grid-cols-4">
          <Stat label="Fuentes configuradas" value={overview.sourceUrls.length} />
          <Stat label="Promos del bot" value={overview.botPromos.length} />
          <Stat label="Activas ahora" value={activeBotPromos.length} />
          <Stat
            label="Autopublicacion"
            value={isBankPromoBotAutopublishEnabled() ? "ON" : "OFF"}
          />
        </section>

        {lastRun ? (
          <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
            Última corrida: <strong>{formatDateTime(lastRun.createdAt)}</strong> ·{" "}
            {lastRun.summary}
          </p>
        ) : (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
            Todavía no hay corridas registradas. Ejecutá el bot o esperá el cron diario.
          </p>
        )}

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-950">Fuentes</h2>
            {overview.sourceUrls.length > 0 ? (
              overview.sourceUrls.map((source) => (
                <div
                  className="rounded-xl border border-slate-200 bg-white p-4"
                  key={source.url}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="break-all font-mono text-xs text-slate-600">
                      {source.url}
                    </p>
                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                        source.allowed
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-rose-200 bg-rose-50 text-rose-700"
                      }`}
                    >
                      {source.allowed ? "Permitida" : "Bloqueada"}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-slate-200 bg-white p-5 text-sm text-slate-500">
                No hay URLs en BANK_PROMO_SOURCE_URLS.
              </p>
            )}
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-950">Historial</h2>
            {overview.lastRuns.length > 0 ? (
              overview.lastRuns.map((run) => (
                <div
                  className="rounded-xl border border-slate-200 bg-white p-4"
                  key={`${run.createdAt.toISOString()}-${run.summary}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-950">
                      {formatDateTime(run.createdAt)}
                    </p>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                        run.status === "ok"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-amber-200 bg-amber-50 text-amber-800"
                      }`}
                    >
                      {run.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{run.summary}</p>
                </div>
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-slate-200 bg-white p-5 text-sm text-slate-500">
                Sin historial del bot.
              </p>
            )}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-950">Promos importadas</h2>
          {overview.botPromos.length > 0 ? (
            <div className="grid gap-3">
              {overview.botPromos.map((promo) => (
                <div
                  className="rounded-xl border border-slate-200 bg-white p-4"
                  key={promo.id}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{promo.entity}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        Vigencia: {formatDate(promo.validFrom)} - {formatDate(promo.validUntil)}
                      </p>
                      <p className="mt-1 break-all font-mono text-xs text-slate-400">
                        {promo.sourceUrl}
                      </p>
                      {promo.notes ? (
                        <p className="mt-2 text-xs text-slate-500">{promo.notes}</p>
                      ) : null}
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        promo.active
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-slate-50 text-slate-500"
                      }`}
                    >
                      {promo.active ? "Publicada" : "Revision"}
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-slate-400">
                    Actualizada {formatDateTime(promo.updatedAt)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-slate-200 bg-white p-5 text-sm text-slate-500">
              El bot todavía no importó promos.
            </p>
          )}
        </section>
      </Container>
    </main>
  );
}
