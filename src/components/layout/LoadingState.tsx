import { Container } from "@/components/layout/Container";

type LoadingStateProps = {
  title?: string;
  description?: string;
};

export function LoadingState({
  description = "Estamos cargando la información solicitada.",
  title = "Cargando…",
}: LoadingStateProps) {
  return (
    <main className="bg-slate-50 py-10 text-slate-950">
      <Container>
        <div className="space-y-4">
          <div className="h-3 w-32 animate-pulse rounded bg-slate-200" />
          <div className="h-8 w-2/3 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200" />

          <div className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <div
                className="h-32 animate-pulse rounded-lg border border-slate-200 bg-white"
                key={index}
              />
            ))}
          </div>

          <span className="sr-only">
            {title}. {description}
          </span>
        </div>
      </Container>
    </main>
  );
}
