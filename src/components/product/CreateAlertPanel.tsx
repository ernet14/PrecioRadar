import Link from "next/link";
import { createAlertAction } from "@/app/alertas/actions";
import { Button } from "@/components/ui/Button";
import { formatCurrencyARS } from "@/lib/utils";
import type { AlertOverview } from "@/services/alertService";

type CreateAlertPanelProps = {
  productSlug: string;
  returnTo: string;
  alertOverview: AlertOverview;
  currentPrice: number;
};

function HiddenFields({
  productSlug,
  returnTo,
}: {
  productSlug: string;
  returnTo: string;
}) {
  return (
    <>
      <input name="slug" type="hidden" value={productSlug} />
      <input name="returnTo" type="hidden" value={returnTo} />
    </>
  );
}

export function CreateAlertPanel({
  alertOverview,
  currentPrice,
  productSlug,
  returnTo,
}: CreateAlertPanelProps) {
  if (alertOverview.status === "anonymous") {
    return (
      <div className="space-y-2">
        <Link
          className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          href={`/login?next=${encodeURIComponent(returnTo)}`}
        >
          Crear alerta
        </Link>
        <p className="text-xs font-medium leading-5 text-slate-500">
          Iniciá sesion para crear alertas
        </p>
      </div>
    );
  }

  if (alertOverview.status === "unavailable") {
    return (
      <div className="space-y-2">
        <Button className="w-full" disabled size="lg" variant="secondary">
          Alertas no disponibles
        </Button>
        <p className="text-xs font-medium leading-5 text-slate-500">
          {alertOverview.reason}
        </p>
      </div>
    );
  }

  const hasReachedLimit = alertOverview.activeCount >= alertOverview.limit;

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div>
        <p className="text-sm font-semibold text-slate-950">Crear alerta</p>
        <p className="mt-1 text-xs font-medium leading-5 text-slate-500">
          Seguí cambios importantes sin revisar todos los días.
        </p>
      </div>
      <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium leading-5 text-slate-600">
        Precio actual: {formatCurrencyARS(currentPrice)}
      </p>
      {hasReachedLimit ? (
        <p className="text-xs font-medium leading-5 text-slate-500">
          Límite de {alertOverview.limit} alertas alcanzado. Pausa o elimina una
          alerta para crear otra.
        </p>
      ) : (
        <>
          <form action={createAlertAction} className="space-y-2">
            <HiddenFields productSlug={productSlug} returnTo={returnTo} />
            <input name="alertType" type="hidden" value="TARGET_PRICE" />
            <label
              className="block text-xs font-semibold text-slate-600"
              htmlFor="targetPrice"
            >
              Precio objetivo
            </label>
            <div className="grid gap-2 sm:grid-cols-[1fr_auto] lg:grid-cols-1">
              <input
                className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                defaultValue={Math.floor(currentPrice)}
                id="targetPrice"
                inputMode="numeric"
                min="1"
                name="targetPrice"
                required
                step="1"
                type="text"
              />
              <Button
                className="w-full border-blue-200 text-blue-700 hover:border-blue-300 hover:bg-blue-50"
                size="sm"
                type="submit"
                variant="secondary"
              >
                Avisame bajo este precio
              </Button>
            </div>
          </form>

          <form action={createAlertAction} className="space-y-2">
            <HiddenFields productSlug={productSlug} returnTo={returnTo} />
            <input name="alertType" type="hidden" value="PERCENTAGE_DROP" />
            <label
              className="block text-xs font-semibold text-slate-600"
              htmlFor="targetPercentage"
            >
              Baja porcentual
            </label>
            <div className="grid gap-2 sm:grid-cols-[1fr_auto] lg:grid-cols-1">
              <input
                className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                defaultValue="10"
                id="targetPercentage"
                max="100"
                min="1"
                name="targetPercentage"
                required
                step="1"
                type="number"
              />
              <Button
                className="w-full border-blue-200 text-blue-700 hover:border-blue-300 hover:bg-blue-50"
                size="sm"
                type="submit"
                variant="secondary"
              >
                Avisame si baja %
              </Button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
