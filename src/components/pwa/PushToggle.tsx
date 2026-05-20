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

type PushState = "idle" | "subscribing" | "subscribed" | "denied" | "error";

export function PushToggle({ className }: { className?: string }) {
  const [supported, setSupported] = useState(false);
  const [state, setState] = useState<PushState>("idle");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const ok =
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window &&
        Boolean(VAPID_PUBLIC_KEY);

      if (!ok) return;

      setSupported(true);

      if (Notification.permission === "granted") {
        navigator.serviceWorker.ready
          .then((registration) => registration.pushManager.getSubscription())
          .then((subscription) => {
            if (subscription) setState("subscribed");
          })
          .catch(() => {});
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  if (!supported) return null;

  async function subscribe() {
    setState("subscribing");

    try {
      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        setState("denied");
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

  if (state === "subscribed") {
    return (
      <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
        Avisos push activados ✓
      </p>
    );
  }

  return (
    <div className="space-y-1">
      <Button
        type="button"
        onClick={subscribe}
        disabled={state === "subscribing"}
        size="lg"
        variant="ghost"
        className={className}
      >
        {state === "subscribing" ? "Activando…" : "Activar avisos push"}
      </Button>
      {state === "denied" ? (
        <p className="text-xs text-slate-500">
          Bloqueaste las notificaciones. Habilitalas desde el navegador.
        </p>
      ) : null}
      {state === "error" ? (
        <p className="text-xs text-red-600">No pudimos activar los avisos. Reintentá.</p>
      ) : null}
    </div>
  );
}
