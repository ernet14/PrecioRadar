import { Container } from "@/components/layout/Container";
import { Badge } from "@/components/ui/Badge";
import { requireAdmin } from "@/lib/supabase/auth";
import { formatCurrencyARS } from "@/lib/utils";
import {
  listCurrentWeeklyFeatured,
  type WeeklyFeaturedRow,
} from "@/services/weeklyFeaturedService";
import { forceRefreshAction } from "./actions";

function ScoreBar({ score }: { score: number }) {
  const pct = Math.min(100, Math.round((score / 110) * 100));
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-indigo-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-slate-500">{Math.round(score)}</span>
    </div>
  );
}

function ProductRow({ row, index }: { row: WeeklyFeaturedRow; index: number }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
      <span className="w-6 shrink-0 text-center text-xs font-bold text-slate-400">
        {index + 1}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-950">{row.name}</p>
        <p className="mt-0.5 text-xs text-slate-500">
          {row.storeName} · {formatCurrencyARS(row.price)}
        </p>
      </div>
      <div className="hidden shrink-0 sm:block">
        <ScoreBar score={row.score} />
      </div>
      <span className="shrink-0 text-xs text-slate-500">{row.reason}</span>
      <Badge variant={row.isDemo ? "neutral" : "success"} className="shrink-0">
        {row.isDemo ? "Demo" : "Real"}
      </Badge>
    </div>
  );
}

export default async function DestacadosAdminPage() {
  await requireAdmin();

  const rows = await listCurrentWeeklyFeatured();

  const weekStart = rows[0]?.weekStart;
  const realCount = rows.filter((r) => !r.isDemo).length;
  const demoCount = rows.filter((r) => r.isDemo).length;

  return (
    <main className="bg-[#f4f7fb] py-10">
      <Container className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-950">Detectadas por PrecioRadar</h1>
            <p className="mt-1 text-sm text-slate-500">
              Selección semanal visible en la home. Se renueva automáticamente cada lunes.
            </p>
            {weekStart && (
              <p className="mt-1 text-xs text-slate-400">
                Semana del {weekStart.toISOString().split("T")[0]} ·{" "}
                {realCount} real{realCount !== 1 ? "es" : ""}, {demoCount} demo
              </p>
            )}
          </div>

          <form
            action={async () => {
              "use server";
              await forceRefreshAction();
            }}
          >
            <button
              type="submit"
              className="inline-flex h-9 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:scale-95"
            >
              Generar selección ahora
            </button>
          </form>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-10 text-center">
            <p className="text-sm text-slate-500">
              Todavía no hay selección generada.
            </p>
            <p className="mt-1 text-xs text-slate-400">
              El cron corre cada lunes a las 8 hs UTC. Podés forzar la generación con el botón de arriba.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((row, i) => (
              <ProductRow key={row.id} row={row} index={i} />
            ))}
          </div>
        )}
      </Container>
    </main>
  );
}
