import type { Metadata } from "next";
import Link from "next/link";
import {
  deleteAlertAction,
  pauseAlertAction,
  reactivateAlertAction,
} from "@/app/alertas/actions";
import { Container } from "@/components/layout/Container";
import { AlertFeedback } from "@/components/alerts/AlertFeedback";
import { NotificationFeedback } from "@/components/notifications/NotificationFeedback";
import { NotificationList } from "@/components/notifications/NotificationList";
import { evaluateAlertsAction } from "@/app/notificaciones/actions";
import { unfollowProductAction } from "@/app/tracked-products/actions";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TrackingFeedback } from "@/components/product/TrackingFeedback";
import { requireUser } from "@/lib/supabase/auth";
import { formatDate } from "@/lib/utils";
import { buildOfferClickHref } from "@/services/clickTrackingService";
import { syncAuthUserToPrisma } from "@/services/userSyncService";
import {
  getTrackingOverviewForUser,
  listTrackedProducts,
  type TrackedProductListItem,
} from "@/services/trackedProductService";
import {
  getAlertOverviewForUser,
  listUserAlerts,
  type UserAlertListItem,
} from "@/services/alertService";
import { listUserNotifications } from "@/services/notificationService";

type DashboardPageProps = {
  searchParams: Promise<{
    alert?: string | string[];
    error?: string | string[];
    notification?: string | string[];
    tracking?: string | string[];
  }>;
};

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { follow: false, index: false },
};

function getSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function ProductImage({
  imageUrl,
  name,
}: {
  imageUrl?: string | null;
  name: string;
}) {
  if (!imageUrl) {
    return (
      <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-medium text-slate-400">
        Sin imagen
      </div>
    );
  }

  return (
    <div
      aria-label={name}
      className="h-28 w-28 shrink-0 rounded-xl border border-slate-100 bg-white bg-contain bg-center bg-no-repeat shadow-sm"
      role="img"
      style={{ backgroundImage: `url(${imageUrl})` }}
    />
  );
}

function SummaryCard({
  description,
  label,
  value,
  variant = "neutral",
}: {
  description: string;
  label: string;
  value: string;
  variant?: "blue" | "green" | "neutral" | "orange";
}) {
  const accentClasses = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    neutral: "bg-slate-100 text-slate-700",
    orange: "bg-amber-50 text-amber-700",
  };

  return (
    <Card className="overflow-hidden p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
            {value}
          </p>
        </div>
        <span
          className={`mt-1 inline-flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${accentClasses[variant]}`}
        >
          {value.slice(0, 2)}
        </span>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-600">{description}</p>
    </Card>
  );
}

function EmptyState({
  actionHref,
  actionLabel,
  description,
  title,
}: {
  actionHref?: string;
  actionLabel?: string;
  description: string;
  title: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-6">
      <h3 className="text-base font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      {actionHref && actionLabel ? (
        <Link
          className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          href={actionHref}
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

function TrackedProductCard({
  product,
}: {
  product: TrackedProductListItem;
}) {
  const isLegacyTracking = product.trackingScope === "product";
  const offerHref = product.offerKey
    ? buildOfferClickHref({
        offerKey: product.offerKey,
        productSlug: product.slug,
      })
    : product.productUrl;

  return (
    <Card className="overflow-hidden border-slate-200 shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
      <div className="grid gap-5 p-4 md:grid-cols-[112px_minmax(0,1fr)_190px] md:p-5">
        <ProductImage imageUrl={product.imageUrl} name={product.name} />

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={isLegacyTracking ? "neutral" : "success"}
              className={
                isLegacyTracking
                  ? "bg-amber-50 text-amber-700"
                  : "bg-emerald-50 text-emerald-700"
              }
            >
              {isLegacyTracking ? "Seguimiento general" : "Oferta seguida"}
            </Badge>
            <span className="text-xs font-semibold text-slate-400">
              Seguido el {formatDate(product.trackedAt)}
            </span>
          </div>

          <h3 className="mt-3 text-xl font-bold leading-7 text-slate-950">
            {product.name}
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            <span className="font-semibold text-slate-900">
              {product.storeName}
            </span>{" "}
            &middot; {product.trackingLabel}
          </p>

          <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3">
            <p className="text-sm font-bold text-emerald-800">
              {product.recommendationLabel}
            </p>
            <p className="mt-1 text-sm leading-6 text-emerald-900/80">
              {product.recommendationReason}
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
              Precio actual
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-950">
              {product.priceLabel}
            </p>
          </div>
          <div className="mt-5 grid gap-2">
            <Link
              className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              href={offerHref}
              rel="noreferrer"
              target="_blank"
            >
              Ver oferta
            </Link>
            <Link
              className="inline-flex h-10 items-center justify-center rounded-lg border border-blue-200 bg-white px-4 text-sm font-semibold text-blue-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
              href={`/producto/${product.slug}`}
            >
              Ver comparacion
            </Link>
            <form action={unfollowProductAction}>
              <input name="trackedProductId" type="hidden" value={product.id} />
              <input name="returnTo" type="hidden" value="/dashboard" />
              <Button
                className="w-full border-rose-200 text-rose-700 hover:border-rose-300 hover:bg-rose-50"
                size="sm"
                type="submit"
                variant="secondary"
              >
                Dejar de seguir
              </Button>
            </form>
          </div>
        </div>
      </div>
    </Card>
  );
}

function AlertHiddenFields({
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
    return `Precio objetivo: ${alert.targetPriceLabel ?? "-"}`;
  }

  return `Baja porcentual: ${alert.targetPercentageLabel ?? "-"}`;
}

function DashboardAlertCard({ alert }: { alert: UserAlertListItem }) {
  const isActive = alert.active && !alert.paused;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            className="font-semibold leading-6 text-slate-950 transition hover:text-blue-700"
            href={`/producto/${alert.productSlug}`}
          >
            {alert.productName}
          </Link>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {alert.storeName} &middot; precio actual {alert.currentPriceLabel}
          </p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center rounded-full border px-3 py-1 text-xs font-semibold ${
            isActive
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-amber-200 bg-amber-50 text-amber-700"
          }`}
        >
          {isActive ? "Activa" : "Pausada"}
        </span>
      </div>

      <div className="mt-4 grid gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
        <p className="font-semibold text-slate-950">{getAlertTypeLabel(alert)}</p>
        <p>Creada el {formatDate(alert.createdAt)}</p>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {alert.paused ? (
          <form action={reactivateAlertAction}>
            <AlertHiddenFields alertId={alert.id} returnTo="/dashboard" />
            <Button className="w-full" size="sm" type="submit" variant="secondary">
              Reactivar
            </Button>
          </form>
        ) : (
          <form action={pauseAlertAction}>
            <AlertHiddenFields alertId={alert.id} returnTo="/dashboard" />
            <Button className="w-full" size="sm" type="submit" variant="secondary">
              Pausar
            </Button>
          </form>
        )}
        <form action={deleteAlertAction}>
          <AlertHiddenFields alertId={alert.id} returnTo="/dashboard" />
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
  );
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const user = await requireUser("/dashboard");
  const params = await searchParams;
  const alertStatus = getSearchParam(params.alert);
  const error = getSearchParam(params.error);
  const notificationStatus = getSearchParam(params.notification);
  const trackingStatus = getSearchParam(params.tracking);
  await syncAuthUserToPrisma(user);
  const trackingOverview = await getTrackingOverviewForUser(user.id);
  const alertOverview = await getAlertOverviewForUser(user.id);
  const trackedProducts =
    trackingOverview.status === "ready" ? await listTrackedProducts(user.id) : [];
  const alerts = alertOverview.status === "ready" ? await listUserAlerts(user.id) : [];
  const notifications = await listUserNotifications(user.id);
  const unreadNotifications = notifications.filter(
    (notification) => !notification.read,
  ).length;
  const latestActivityDate =
    notifications[0]?.createdAt ?? trackedProducts[0]?.trackedAt ?? alerts[0]?.createdAt;

  return (
    <main className="bg-[#f4f7fb] py-10 text-slate-950">
      <Container className="space-y-8">
        {error === "admin" ? (
          <Card className="border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950 shadow-none">
            La secci&oacute;n admin ya queda protegida por rol, pero tu usuario no tiene
            permiso admin.
          </Card>
        ) : null}

        <TrackingFeedback status={trackingStatus} />
        <AlertFeedback status={alertStatus} />
        <NotificationFeedback status={notificationStatus} />

        <section className="rounded-3xl bg-slate-950 px-6 py-8 text-white shadow-[0_24px_60px_rgba(15,23,42,0.22)] md:px-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <Badge className="border-blue-400/40 bg-blue-400/10 text-blue-100">
                Panel de compra inteligente
              </Badge>
              <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">
                Dashboard
              </h1>
              <p className="mt-3 max-w-2xl leading-7 text-slate-300">
                Sesi&oacute;n iniciada como{" "}
                <span className="font-semibold text-white">{user.email}</span>.
                Segu&iacute; ofertas puntuales, revis&aacute; alertas y manten&eacute; tus
                avisos internos en un solo lugar.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 text-sm text-slate-200">
              <p className="font-semibold text-white">Plan gratis</p>
              <p className="mt-1">Hasta 2 ofertas seguidas y alertas MVP.</p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            description="Seguimientos activos por oferta especifica cuando existe tienda."
            label="Ofertas seguidas"
            value={
              trackingOverview.status === "ready"
                ? `${trackedProducts.length}`
                : "-"
            }
            variant="blue"
          />
          <SummaryCard
            description={
              alertOverview.status === "ready"
                ? `Limite gratis: ${alertOverview.limit} alertas activas.`
                : "No pudimos leer el estado de alertas."
            }
            label="Alertas activas"
            value={
              alertOverview.status === "ready"
                ? `${alertOverview.activeCount}`
                : "-"
            }
            variant="green"
          />
          <SummaryCard
            description="Avisos internos pendientes de revisar."
            label="Notificaciones"
            value={`${unreadNotifications}`}
            variant={unreadNotifications > 0 ? "orange" : "neutral"}
          />
          <SummaryCard
            description={
              latestActivityDate
                ? `Ultimo movimiento: ${formatDate(latestActivityDate)}.`
                : "Sin actividad reciente para mostrar."
            }
            label="Actividad reciente"
            value={latestActivityDate ? "OK" : "-"}
            variant="neutral"
          />
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="space-y-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <Badge variant="brand" className="bg-blue-50 text-blue-700">
                  Seguimiento
                </Badge>
                <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
                  Ofertas seguidas
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Cada fila representa una oferta o tienda seguida desde el flujo
                  actual.
                </p>
              </div>
              <Link
                className="inline-flex h-10 items-center justify-center rounded-lg border border-blue-200 bg-white px-4 text-sm font-semibold text-blue-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
                href="/buscar"
              >
                Buscar ofertas
              </Link>
            </div>

            {trackingOverview.status === "unavailable" ? (
              <Card className="p-6 text-sm leading-6 text-slate-600">
                {trackingOverview.reason}
              </Card>
            ) : trackedProducts.length > 0 ? (
              <div className="space-y-4">
                {trackedProducts.map((product) => (
                  <TrackedProductCard
                    key={product.id}
                    product={product}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                actionHref="/buscar"
                actionLabel="Buscar ofertas"
                description="Todavia no seguis ofertas. Para el MVP, conviene seguir tiendas/ofertas especificas desde resultados o detalle."
                title="No hay ofertas seguidas"
              />
            )}
          </section>

          <aside className="space-y-6">
            <Card className="p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between xl:flex-col xl:items-stretch">
                <div>
                  <Badge variant="success">Alertas</Badge>
                  <h2 className="mt-3 text-xl font-bold text-slate-950">
                    Alertas activas
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {alertOverview.status === "ready"
                      ? `${alertOverview.activeCount} de ${alertOverview.limit} activas.`
                      : "Alertas no disponibles por ahora."}
                  </p>
                </div>
                <Link
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-blue-200 bg-white px-4 text-sm font-semibold text-blue-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
                  href="/alertas"
                >
                  Ver todas
                </Link>
              </div>

              <div className="mt-5">
              {alertOverview.status === "unavailable" ? (
                <p className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                  {alertOverview.reason}
                </p>
              ) : alerts.length > 0 ? (
                <div className="space-y-3">
                  {alerts.slice(0, 3).map((alert) => (
                    <DashboardAlertCard alert={alert} key={alert.id} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  actionHref="/buscar"
                  actionLabel="Buscar producto"
                  description="Todavia no tenes alertas. Se crean desde el detalle de producto."
                  title="Sin alertas creadas"
                />
              )}
              </div>
            </Card>

            <Card className="p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between xl:flex-col xl:items-stretch">
                <div>
                  <Badge variant="neutral">Notificaciones</Badge>
                  <h2 className="mt-3 text-xl font-bold text-slate-950">
                    Avisos internos
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Alertas cumplidas y novedades recientes de tus seguimientos.
                  </p>
                </div>
                <form action={evaluateAlertsAction}>
                  <input name="returnTo" type="hidden" value="/dashboard" />
                  <Button
                    className="w-full border-slate-200 text-slate-700"
                    size="sm"
                    type="submit"
                    variant="secondary"
                  >
                    Evaluar alertas
                  </Button>
                </form>
              </div>
              <div className="mt-5">
                <NotificationList
                  notifications={notifications}
                  returnTo="/dashboard"
                />
              </div>
            </Card>
          </aside>
        </div>
      </Container>
    </main>
  );
}
