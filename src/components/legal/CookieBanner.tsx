"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const COOKIE_NAME = "pr_cookie_consent";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

type ConsentValue = {
  essential: true;
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
};

function getStoredConsent(): ConsentValue | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`),
  );
  if (!match) return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(match[1]));
    if (typeof parsed !== "object" || parsed === null) return null;
    return {
      essential: true,
      analytics: Boolean(parsed.analytics),
      marketing: Boolean(parsed.marketing),
      updatedAt:
        typeof parsed.updatedAt === "string"
          ? parsed.updatedAt
          : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function storeConsent(value: ConsentValue) {
  const encoded = encodeURIComponent(JSON.stringify(value));
  document.cookie = `${COOKIE_NAME}=${encoded}; max-age=${COOKIE_MAX_AGE}; path=/; SameSite=Lax`;
}

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
      setVisible(!getStoredConsent());
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
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white px-4 py-4 shadow-lg">
      <div className="mx-auto flex max-w-5xl flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">
            Usamos cookies para el funcionamiento del servicio. Podés elegir qué
            permitir. Ver detalle en{" "}
            <Link className="underline transition hover:text-slate-900" href="/cookies">
              Política de cookies
            </Link>
            .
          </p>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              className="rounded-md border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              onClick={() => submit(false, false)}
              type="button"
            >
              Solo esenciales
            </button>
            <button
              className="rounded-md border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              onClick={() => setExpanded((current) => !current)}
              type="button"
            >
              {expanded ? "Ocultar opciones" : "Personalizar"}
            </button>
            <button
              className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700"
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
                Métricas agregadas de uso. Hoy no instalamos ninguna; queda como
                opción para futuras integraciones (Vercel Analytics, etc.).
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
