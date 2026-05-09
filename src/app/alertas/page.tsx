import { Container } from "@/components/layout/Container";
import { AlertFeedback } from "@/components/alerts/AlertFeedback";
import { AlertList } from "@/components/alerts/AlertList";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { requireUser } from "@/lib/supabase/auth";
import { syncAuthUserToPrisma } from "@/services/userSyncService";
import {
  getAlertOverviewForUser,
  listUserAlerts,
} from "@/services/alertService";

type AlertasPageProps = {
  searchParams: Promise<{ alert?: string | string[] }>;
};

function getSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function SummaryCard({
  description,
  label,
  tone = "neutral",
  value,
}: {
  description: string;
  label: string;
  tone?: "blue" | "green" | "neutral" | "orange";
  value: string;
}) {
  const toneClasses = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    neutral: "bg-slate-100 text-slate-700",
    orange: "bg-amber-50 text-amber-700",
  };

  return (
    <Card className="p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
            {value}
          </p>
        </div>
        <span
          className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${toneClasses[tone]}`}
        >
          {value.slice(0, 2)}
        </span>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-600">{description}</p>
    </Card>
  );
}

export default async function AlertasPage({ searchParams }: AlertasPageProps) {
  const user = await requireUser("/alertas");
  const params = await searchParams;
  const alertStatus = getSearchParam(params.alert);
  await syncAuthUserToPrisma(user);
  const alertOverview = await getAlertOverviewForUser(user.id);
  const alerts = alertOverview.status === "ready" ? await listUserAlerts(user.id) : [];
  const activeAlerts = alerts.filter((alert) => alert.active && !alert.paused).length;
  const pausedAlerts = alerts.filter((alert) => alert.paused || !alert.active).length;
  const limitReached =
    alertOverview.status === "ready" && activeAlerts >= alertOverview.limit;

  return (
    <main className="bg-[#f4f7fb] py-10 text-slate-950">
      <Container className="space-y-8">
        <AlertFeedback status={alertStatus} />

        <section className="rounded-3xl bg-slate-950 px-6 py-8 text-white shadow-[0_24px_60px_rgba(15,23,42,0.22)] md:px-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <Badge className="border-blue-400/40 bg-blue-400/10 text-blue-100">
                Privado &middot; alertas MVP
              </Badge>
              <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">
                Mis alertas
              </h1>
              <p className="mt-3 max-w-2xl leading-7 text-slate-300">
                Segu&iacute; precios objetivo, bajas porcentuales y oportunidades de
                compra.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 text-sm text-slate-200">
              <p className="font-semibold text-white">Plan gratis</p>
              <p className="mt-1">
                {activeAlerts}/{alertOverview.limit} alertas activas.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <SummaryCard
            description="Alertas que pueden generar avisos internos cuando se cumple la condicion."
            label="Alertas activas"
            tone="green"
            value={alertOverview.status === "ready" ? `${activeAlerts}` : "-"}
          />
          <SummaryCard
            description="Alertas pausadas o inactivas que no disparan avisos por ahora."
            label="Alertas pausadas"
            tone="blue"
            value={alertOverview.status === "ready" ? `${pausedAlerts}` : "-"}
          />
          <SummaryCard
            description={
              alertOverview.status === "ready"
                ? `${Math.max(alertOverview.limit - activeAlerts, 0)} lugares disponibles en el plan gratis.`
                : "No pudimos leer el limite de alertas."
            }
            label="Limite disponible"
            tone={limitReached ? "orange" : "neutral"}
            value={
              alertOverview.status === "ready"
                ? `${activeAlerts}/${alertOverview.limit}`
                : "-"
            }
          />
        </section>

        {limitReached ? (
          <Card className="border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950 shadow-none">
            Llegaste al l&iacute;mite de {alertOverview.limit} alertas activas del
            plan gratis. Pod&eacute;s pausar o eliminar una alerta para crear otra.
          </Card>
        ) : null}

        {alertOverview.status === "unavailable" ? (
          <AlertFeedback status="unavailable" />
        ) : (
          <AlertList alerts={alerts} returnTo="/alertas" />
        )}
      </Container>
    </main>
  );
}
