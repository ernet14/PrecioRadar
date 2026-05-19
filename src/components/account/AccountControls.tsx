"use client";

import { useState } from "react";
import { deleteAccountAction } from "@/app/account/actions";

const REQUIRED_CONFIRMATION = "ELIMINAR";

type AccountStatus =
  | null
  | "invalid-confirmation"
  | "unavailable"
  | "error";

const statusMessages: Record<NonNullable<AccountStatus>, string> = {
  "invalid-confirmation": `Tenés que escribir ${REQUIRED_CONFIRMATION} para confirmar la baja.`,
  unavailable: "Servicio caído. Probá de nuevo en unos minutos.",
  error: "No pudimos eliminar la cuenta. Escribinos a privacidad@precio-radar.com.",
};

export function AccountControls({ status }: { status: AccountStatus }) {
  const [confirming, setConfirming] = useState(false);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-950">
        Tus datos y tu cuenta
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Bajo la Ley 25.326 podés ejercer derechos ARCO. Acá podés descargar todo
        lo que tenemos asociado a tu cuenta o eliminarla.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <a
          className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          download
          href="/api/me/data-export"
        >
          Descargar mis datos (JSON)
        </a>

        {!confirming ? (
          <button
            className="inline-flex h-11 items-center justify-center rounded-lg border border-red-300 bg-white px-4 text-sm font-semibold text-red-700 transition hover:bg-red-50"
            onClick={() => setConfirming(true)}
            type="button"
          >
            Eliminar mi cuenta
          </button>
        ) : (
          <form
            action={deleteAccountAction}
            className="rounded-lg border border-red-200 bg-red-50 p-4 sm:col-span-2"
          >
            <p className="text-sm font-semibold text-red-900">
              Esta acción es irreversible
            </p>
            <p className="mt-1 text-xs leading-5 text-red-800">
              Borramos tus alertas, productos seguidos, notificaciones y logs en
              menos de 48 horas. Tu cuenta queda con tombstone para que no se
              vuelva a registrar el mismo UUID. Escribí{" "}
              <span className="font-mono font-bold">{REQUIRED_CONFIRMATION}</span>{" "}
              para confirmar.
            </p>
            <input
              autoComplete="off"
              className="mt-3 w-full rounded-md border border-red-300 bg-white px-3 py-2 text-sm font-mono text-red-900 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              name="confirmation"
              required
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className="inline-flex h-10 items-center justify-center rounded-md bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700"
                type="submit"
              >
                Confirmar eliminación
              </button>
              <button
                className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                onClick={() => setConfirming(false)}
                type="button"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>

      {status ? (
        <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
          {statusMessages[status]}
        </p>
      ) : null}
    </section>
  );
}
