"use client";

import { useActionState } from "react";
import { CreatePromoForm } from "./CreatePromoForm";
import { parsePromoTextAction, type ParsePromoState } from "./actions";

const initialParseState: ParsePromoState = { draft: null };
const textareaClass =
  "w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100";

export function PromoComposer() {
  const [parseState, parseAction, parsing] = useActionState(
    parsePromoTextAction,
    initialParseState,
  );

  return (
    <div className="space-y-5">
      <form action={parseAction} className="space-y-2">
        <label className="block text-xs font-semibold text-slate-600">
          Carga asistida: pega el texto de la promo
        </label>
        <textarea
          className={textareaClass}
          name="text"
          placeholder="Pega el link de la promo del banco (lo leo solo) y/o los términos y condiciones. Ej: https://www.bbva.com.ar/... + texto."
          rows={4}
        />
        <button
          className="w-full rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-60"
          disabled={parsing}
          type="submit"
        >
          {parsing ? "Analizando..." : "Analizar y precompletar"}
        </button>
        {parseState.error ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {parseState.error}
          </p>
        ) : null}
        {parseState.note ? (
          <p className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
            {parseState.note}
          </p>
        ) : null}
        {parseState.draft ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            Campos precompletados abajo. Revisalos y guardá.
          </p>
        ) : null}
      </form>

      <div className="border-t border-slate-100 pt-4">
        {/* key fuerza remontar el form (uncontrolled) con los nuevos defaults */}
        <CreatePromoForm key={parseState.key ?? "empty"} defaults={parseState.draft ?? undefined} />
      </div>
    </div>
  );
}
