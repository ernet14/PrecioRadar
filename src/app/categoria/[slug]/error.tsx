"use client";

import { ErrorState } from "@/components/layout/ErrorState";

export default function CategoriaError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      description="No pudimos cargar esta categoría. Reintentá o volvé al inicio."
      error={error}
      reset={reset}
      title="Categoría no disponible"
    />
  );
}
