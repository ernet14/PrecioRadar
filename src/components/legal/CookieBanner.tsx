"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const COOKIE_NAME = "pr_cookie_consent";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function getStoredConsent(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function storeConsent(value: "accepted" | "rejected") {
  document.cookie = `${COOKIE_NAME}=${value}; max-age=${COOKIE_MAX_AGE}; path=/; SameSite=Lax`;
}

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setVisible(!getStoredConsent());
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  function handle(value: "accepted" | "rejected") {
    storeConsent(value);
    setVisible(false);
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white px-4 py-4 shadow-lg">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          Usamos cookies propias para el funcionamiento del servicio (sesión,
          preferencias). No usamos cookies de publicidad ni rastreo entre
          sitios.{" "}
          <Link
            className="underline transition hover:text-slate-900"
            href="/cookies"
          >
            Más información
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            className="rounded-md border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            onClick={() => handle("rejected")}
            type="button"
          >
            Rechazar
          </button>
          <button
            className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700"
            onClick={() => handle("accepted")}
            type="button"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}
