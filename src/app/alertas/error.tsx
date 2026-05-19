"use client";

import { ErrorState } from "@/components/layout/ErrorState";

export default function AlertasError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      description="No pudimos cargar tus alertas. Reintentá o volvé al dashboard."
      error={error}
      reset={reset}
      title="Alertas no disponibles"
    />
  );
}
