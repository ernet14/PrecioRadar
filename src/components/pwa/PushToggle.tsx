"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

type PushState =
  | "loading"
  | "unsupported"
  | "idle"
  | "subscribing"
  | "subscribed"
  | "denied"
  | "error";

export function PushToggle({ className }: { className?: string }) {
  const [state, setState] = useState<PushState>("loading");

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      const supported =
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window &&
        Boolean(VAPID_PUBLIC_KEY);

      if (!supported) {
        setState("unsupported");
        return;
      }

      if (Notification.permission === "denied") {
        setState("denied");
        return;
      }

      if (Notification.permission === "granted") {
        try {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          setState(subscription ? "subscribed" : "idle");
        } catch {
          setState("idle");
        }
        return;
      }

      setState("idle");
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  async function subscribe() {
    setState("subscribing");

    try {
      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "idle");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY as string),
      });

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });

      setState(response.ok ? "subscribed" : "error");
    } catch {
      setState("error");
    }
  }

  // Mientras detecta soporte/permiso no mostramos nada para evitar parpadeo.
  if (state === "loading" || state === "unsupported") {
    return null;
  }

  if (state === "subscribed") {
    return (
      <p className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
        <span aria-hidden>🔔</span> Avisos activados
      </p>
    );
  }

  if (state === "denied") {
    return (
      <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
        Tenés las notificaciones bloqueadas. Habilitalas para este sitio desde la
        configuración del navegador (ícono del candado en la barra de direcciones).
      </p>
    );
  }

  return (
    <div className="space-y-1">
      <Button
        type="button"
        onClick={subscribe}
        disabled={state === "subscribing"}
        size="md"
        variant="secondary"
        className={`w-full ${className ?? ""}`}
      >
        {state === "subscribing" ? "Activando…" : "Activar avisos"}
      </Button>
      {state === "error" ? (
        <p className="text-xs text-red-600">No pudimos activar los avisos. Reintentá.</p>
      ) : null}
    </div>
  );
}
