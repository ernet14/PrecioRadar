"use client";

import { ErrorState } from "@/components/layout/ErrorState";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      description="No pudimos cargar tu dashboard. Reintentá; si persiste, escribinos a privacidad@precio-radar.com."
      error={error}
      reset={reset}
      title="Dashboard no disponible"
    />
  );
}
