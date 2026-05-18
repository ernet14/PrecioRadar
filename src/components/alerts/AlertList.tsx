import Link from "next/link";
import {
  deleteAlertAction,
  pauseAlertAction,
  reactivateAlertAction,
} from "@/app/alertas/actions";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatDate } from "@/lib/utils";
import type { UserAlertListItem } from "@/services/alertService";

type AlertListProps = {
  alerts: UserAlertListItem[];
  returnTo: string;
};

function ProductImage({
  imageUrl,
  name,
}: {
  imageUrl?: string | null;
  name: string;
}) {
  if (!imageUrl) {
    return (
      <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-slate-100 text-xs font-medium text-slate-400">
        Sin imagen
      </div>
    );
  }

  return (
    <div
      aria-label={name}
      className="h-24 w-24 shrink-0 rounded-xl border border-slate-100 bg-white bg-contain bg-center bg-no-repeat shadow-sm"
      role="img"
      style={{ backgroundImage: `url(${imageUrl})` }}
    />
  );
}

function HiddenFields({
  alertId,
  returnTo,
}: {
  alertId: string;
  returnTo: string;
}) {
  return (
    <>
      <input name="alertId" type="hidden" value={alertId} />
      <input name="returnTo" type="hidden" value={returnTo} />
    </>
  );
}

function getAlertTypeLabel(alert: UserAlertListItem) {
  if (alert.alertType === "TARGET_PRICE") {
    return "Precio objetivo";
  }

  return "Baja porcentual";
}

function getAlertConditionLabel(alert: UserAlertListItem) {
  if (alert.alertType === "TARGET_PRICE") {
    return `Avisame cuando baje de ${alert.targetPriceLabel ?? "-"}`;
  }

  return `Avisame si baja ${alert.targetPercentageLabel ?? "-"}`;
}

function getLastNotificationLabel(alert: UserAlertListItem) {
  if (
    "lastNotifiedAt" in alert &&
    alert.lastNotifiedAt instanceof Date
  ) {
    return formatDate(alert.lastNotifiedAt);
  }

  return "Sin notificaciones todavia";
}

function getOfferUrl(alert: UserAlertListItem) {
  if ("offerUrl" in alert && typeof alert.offerUrl === "string") {
    return alert.offerUrl;
  }

  return null;
}

export function AlertList({ alerts, returnTo }: AlertListProps) {
  if (alerts.length === 0) {
    return (
      <Card className="overflow-hidden p-8 shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6">
          <Badge variant="neutral">Estado vacío</Badge>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-950">
            Todavía no tenés alertas
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Creá una alerta desde el detalle de un producto y te avisamos
            cuando llegue al precio que querés.
          </p>
          <Link
            className="mt-5 inline-flex h-11 items-center justify-center rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            href="/buscar"
          >
            Buscar productos
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <section className="space-y-4">
      {alerts.map((alert) => {
        const offerUrl = getOfferUrl(alert);

        return (
          <Card
            className="overflow-hidden border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.07)]"
            key={alert.id}
          >
            <div className="grid gap-5 p-4 lg:grid-cols-[112px_minmax(0,1fr)_250px] lg:p-5">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-2">
                <ProductImage
                  imageUrl={alert.productImageUrl}
                  name={alert.productName}
                />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
                      alert.active && !alert.paused
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-blue-200 bg-blue-50 text-blue-700"
                    }`}
                  >
                    {alert.active && !alert.paused ? "Activa" : "Pausada"}
                  </span>
                  <Badge variant="neutral">{getAlertTypeLabel(alert)}</Badge>
                </div>

                <div className="mt-3 min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                    Producto/oferta
                  </p>
                  <Link
                    className="mt-1 block text-xl font-bold leading-7 text-slate-950 transition hover:text-blue-700"
                    href={`/producto/${alert.productSlug}`}
                  >
                    {alert.productName}
                  </Link>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Mejor oferta actual en{" "}
                    <span className="font-semibold text-slate-900">
                      {alert.storeName}
                    </span>{" "}
                    · {alert.currentPriceLabel}
                  </p>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 md:col-span-2">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">
                      Condición
                    </p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-950">
                      {getAlertConditionLabel(alert)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                      Última notificación
                    </p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-950">
                      {getLastNotificationLabel(alert)}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Creada el {formatDate(alert.createdAt)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                    Precio actual
                  </p>
                  <p className="mt-2 text-2xl font-bold text-slate-950">
                    {alert.currentPriceLabel}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-600">
                    {alert.storeName}
                  </p>
                </div>

                <div className="mt-5 grid gap-2">
                  <Link
                    className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                    href={`/producto/${alert.productSlug}`}
                  >
                    Ver comparación
                  </Link>
                  {offerUrl ? (
                    <a
                      className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                      href={offerUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Ver oferta
                    </a>
                  ) : null}
                  {alert.paused ? (
                    <form action={reactivateAlertAction}>
                      <HiddenFields alertId={alert.id} returnTo={returnTo} />
                      <Button
                        className="w-full border-emerald-200 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50"
                        size="sm"
                        type="submit"
                        variant="secondary"
                      >
                        Reactivar
                      </Button>
                    </form>
                  ) : (
                    <form action={pauseAlertAction}>
                      <HiddenFields alertId={alert.id} returnTo={returnTo} />
                      <Button
                        className="w-full"
                        size="sm"
                        type="submit"
                        variant="secondary"
                      >
                        Pausar
                      </Button>
                    </form>
                  )}
                  <form action={deleteAlertAction}>
                    <HiddenFields alertId={alert.id} returnTo={returnTo} />
                    <Button
                      className="w-full text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                      size="sm"
                      type="submit"
                      variant="ghost"
                    >
                      Eliminar
                    </Button>
                  </form>
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </section>
  );
}
