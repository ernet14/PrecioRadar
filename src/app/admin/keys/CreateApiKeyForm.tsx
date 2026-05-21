"use client";

import { useActionState } from "react";
import { createApiKeyAction, type CreateKeyState } from "./actions";
import { API_TIERS } from "@/lib/apiTiers";

const initialState: CreateKeyState = {};
const inputClass =
  "w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100";

export function CreateApiKeyForm() {
  const [state, action, pending] = useActionState(createApiKeyAction, initialState);

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-600">Nombre *</label>
        <input className={inputClass} name="name" placeholder="Ej: Seller Acme - prod" required type="text" />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-600">Tier</label>
        <select className={inputClass} defaultValue="FREE" name="tier">
          {(Object.keys(API_TIERS) as (keyof typeof API_TIERS)[]).map((tier) => (
            <option key={tier} value={tier}>
              {tier} · {API_TIERS[tier].dailyLimit} req/día ·{" "}
              {API_TIERS[tier].historyDays ? `${API_TIERS[tier].historyDays}d historial` : "historial completo"}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-600">Email del titular (opcional)</label>
        <input className={inputClass} name="ownerEmail" placeholder="contacto@cliente.com" type="email" />
      </div>

      {state.error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {state.error}
        </p>
      ) : null}

      {state.rawKey ? (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3">
          <p className="text-xs font-semibold text-emerald-800">
            Clave creada{state.name ? ` para "${state.name}"` : ""}. Copiala ahora: no se vuelve a mostrar.
          </p>
          <code className="mt-2 block break-all rounded bg-white px-2 py-1.5 font-mono text-xs text-slate-900 ring-1 ring-emerald-200">
            {state.rawKey}
          </code>
        </div>
      ) : null}

      <button
        className="w-full rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? "Creando..." : "Crear API key"}
      </button>
    </form>
  );
}
