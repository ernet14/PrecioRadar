"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

export function LiveMonitorControls({ generatedAtIso }: { generatedAtIso: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [live, setLive] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    if (!live) return;
    const interval = setInterval(() => {
      startTransition(() => router.refresh());
    }, 5000);
    return () => clearInterval(interval);
  }, [live, router]);

  const elapsed = Math.max(
    0,
    Math.floor((now - new Date(generatedAtIso).getTime()) / 1000),
  );

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
        <span
          aria-hidden
          className={`inline-block size-2.5 rounded-full ${
            live ? "animate-pulse bg-emerald-500" : "bg-slate-400"
          }`}
        />
        {live ? "En vivo (cada 5s)" : "Pausado"}
        <span className="font-mono text-slate-400">· {elapsed}s</span>
      </span>
      <button
        className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50"
        onClick={() => setLive((value) => !value)}
        type="button"
      >
        {live ? "Pausar" : "Reanudar"}
      </button>
      <button
        className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 disabled:opacity-60"
        disabled={isPending}
        onClick={() => startTransition(() => router.refresh())}
        type="button"
      >
        {isPending ? "Refrescando..." : "Refrescar ahora"}
      </button>
    </div>
  );
}
