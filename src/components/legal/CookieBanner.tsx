"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  readConsent,
  storeConsent,
  type ConsentValue,
} from "@/lib/consent";

async function reportConsent(value: ConsentValue) {
  try {
    await fetch("/api/cookies/consent", {
      body: JSON.stringify({
        analytics: value.analytics,
        essential: true,
        marketing: value.marketing,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
  } catch {
    // Sin red: igual respetamos la preferencia local; el log se pierde.
  }
}

export function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setVisible(!readConsent());
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const submit = useMemo(
    () => (overrideAnalytics?: boolean, overrideMarketing?: boolean) => {
      const value: ConsentValue = {
        analytics: overrideAnalytics ?? analytics,
        essential: true,
        marketing: overrideMarketing ?? marketing,
        updatedAt: new Date().toISOString(),
      };
      storeConsent(value);
      void reportConsent(value);
      setVisible(false);
    },
    [analytics, marketing],
  );

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white px-3 py-2 shadow-lg sm:px-4 sm:py-4">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 sm:gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <p className="text-xs leading-5 text-slate-600 sm:text-sm">
            Usamos cookies esenciales. Elegí si permitís analytics y marketing.
            Ver{" "}
            <Link className="underline transition hover:text-slate-900" href="/cookies">
              Política de cookies
            </Link>
            .
          </p>
          <div className="grid shrink-0 grid-cols-3 gap-2 sm:flex sm:flex-wrap">
            <button
              className="h-11 rounded-md border border-slate-300 px-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 sm:px-4 sm:text-sm"
              onClick={() => submit(false, false)}
              type="button"
            >
              Solo esenciales
            </button>
            <button
              className="h-11 rounded-md border border-slate-300 px-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 sm:px-4 sm:text-sm"
              onClick={() => setExpanded((current) => !current)}
              type="button"
            >
              {expanded ? "Ocultar opciones" : "Personalizar"}
            </button>
            <button
              className="h-11 rounded-md bg-indigo-600 px-2 text-xs font-medium text-white transition hover:bg-indigo-700 sm:px-4 sm:text-sm"
              onClick={() => submit(true, true)}
              type="button"
            >
              Aceptar todo
            </button>
          </div>
        </div>

        {expanded ? (
          <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3">
            <div className="text-sm text-slate-700">
              <p className="font-semibold text-slate-900">Esenciales</p>
              <p className="mt-1 text-xs text-slate-500">
                Sesión de autenticación y preferencia de cookies. Siempre activas.
              </p>
              <p className="mt-2 text-xs font-semibold text-slate-600">Activa</p>
            </div>
            <label className="flex flex-col text-sm text-slate-700">
              <span className="font-semibold text-slate-900">Analytics</span>
              <span className="mt-1 text-xs text-slate-500">
                Google Analytics para métricas agregadas de uso. Solo se carga si
                lo permitís acá.
              </span>
              <span className="mt-2 inline-flex items-center gap-2">
                <input
                  checked={analytics}
                  onChange={(event) => setAnalytics(event.target.checked)}
                  type="checkbox"
                />
                <span className="text-xs">Permitir analytics</span>
              </span>
            </label>
            <label className="flex flex-col text-sm text-slate-700">
              <span className="font-semibold text-slate-900">Marketing</span>
              <span className="mt-1 text-xs text-slate-500">
                Cookies de personalización publicitaria. Hoy no instalamos
                ninguna; queda como opción para campañas futuras.
              </span>
              <span className="mt-2 inline-flex items-center gap-2">
                <input
                  checked={marketing}
                  onChange={(event) => setMarketing(event.target.checked)}
                  type="checkbox"
                />
                <span className="text-xs">Permitir marketing</span>
              </span>
            </label>
            <div className="sm:col-span-3 flex justify-end">
              <button
                className="rounded-md border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                onClick={() => submit()}
                type="button"
              >
                Guardar preferencias
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
