"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

function formatRelative(seconds: number) {
  if (seconds < 5) {
    return "recien ahora";
  }
  if (seconds < 60) {
    return `hace ${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `hace ${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  return `hace ${hours} h`;
}

export function RefreshControls({ generatedAtIso }: { generatedAtIso: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const elapsedSeconds = Math.max(
    0,
    Math.floor((now - new Date(generatedAtIso).getTime()) / 1000),
  );

  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-xs text-slate-500">
        Actualizado {formatRelative(elapsedSeconds)}
      </span>
      <button
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 disabled:opacity-60"
        disabled={isPending}
        onClick={() => startTransition(() => router.refresh())}
        type="button"
      >
        <span
          aria-hidden
          className={`inline-block size-2 rounded-full ${isPending ? "animate-pulse bg-blue-500" : "bg-emerald-500"}`}
        />
        {isPending ? "Refrescando..." : "Refrescar"}
      </button>
    </div>
  );
}
