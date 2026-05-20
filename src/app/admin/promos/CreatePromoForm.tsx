"use client";

import { useActionState } from "react";
import { createPromoAction, type CreatePromoState } from "./actions";

const DAY_OPTIONS = [
  { label: "Dom", value: 0 },
  { label: "Lun", value: 1 },
  { label: "Mar", value: 2 },
  { label: "Mie", value: 3 },
  { label: "Jue", value: 4 },
  { label: "Vie", value: 5 },
  { label: "Sab", value: 6 },
];

const initialState: CreatePromoState = {};
const inputClass =
  "w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100";

function Field({
  children,
  label,
  required,
}: {
  children: React.ReactNode;
  label: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-slate-600">
        {label}
        {required ? " *" : ""}
      </label>
      {children}
    </div>
  );
}

export function CreatePromoForm() {
  const [state, action, pending] = useActionState(createPromoAction, initialState);

  return (
    <form action={action} className="mt-5 space-y-4">
      {state.error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Promo creada correctamente.
        </p>
      ) : null}

      <Field label="Banco / billetera" required>
        <input className={inputClass} name="entity" placeholder="Banco Nacion" required type="text" />
      </Field>

      <Field label="Slug" required>
        <input className={inputClass} name="entitySlug" placeholder="banco-nacion" required type="text" />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Tipo de beneficio">
          <select className={inputClass} name="promoType">
            <option value="percentage">Descuento</option>
            <option value="refund">Reintegro</option>
            <option value="installments">Cuotas sin interes</option>
          </select>
        </Field>

        <Field label="Descuento / reintegro (%)">
          <input className={inputClass} max={100} min={0} name="discountPct" placeholder="25" type="number" />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Tope reintegro (ARS)">
          <input className={inputClass} min={1} name="maxAmount" placeholder="Sin tope" type="number" />
        </Field>

        <Field label="Cuotas sin interes">
          <input className={inputClass} min={1} name="installments" placeholder="Ej: 6" type="number" />
        </Field>
      </div>

      <Field label="Dias de semana (vacio = todos)">
        <div className="flex flex-wrap gap-2">
          {DAY_OPTIONS.map((day) => (
            <label
              className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 has-[:checked]:border-blue-400 has-[:checked]:bg-blue-50 has-[:checked]:text-blue-700"
              key={day.value}
            >
              <input className="sr-only" name={`day_${day.value}`} type="checkbox" value="on" />
              {day.label}
            </label>
          ))}
        </div>
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Medio de pago">
          <select className={inputClass} name="paymentType">
            <option value="cualquiera">Cualquiera</option>
            <option value="debito">Debito</option>
            <option value="credito">Credito</option>
            <option value="prepago">Prepago</option>
            <option value="modo">MODO</option>
          </select>
        </Field>

        <Field label="Canal">
          <select className={inputClass} name="commerceChannel">
            <option value="online">Online</option>
            <option value="physical">Fisica</option>
            <option value="both">Online y fisica</option>
          </select>
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Tienda (slug, vacio = todas)">
          <input className={inputClass} name="storeSlug" placeholder="mercadolibre" type="text" />
        </Field>

        <Field label="Categoria (slug, vacio = todas)">
          <input className={inputClass} name="categorySlug" placeholder="celulares" type="text" />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Vigente desde">
          <input className={inputClass} name="validFrom" type="date" />
        </Field>

        <Field label="Vence">
          <input className={inputClass} name="validUntil" type="date" />
        </Field>
      </div>

      <Field label="Fuente (URL)">
        <input className={inputClass} name="sourceUrl" placeholder="https://..." type="url" />
      </Field>

      <Field label="Notas internas">
        <textarea className={inputClass} name="notes" placeholder="Ej: validar fuente oficial antes de publicar" rows={2} />
      </Field>

      <button
        className="w-full rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? "Guardando..." : "Guardar promo"}
      </button>
    </form>
  );
}
