import { Container } from "@/components/layout/Container";

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start gap-4">
        <div className="h-20 w-20 shrink-0 rounded-lg bg-slate-100" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 rounded bg-slate-100" />
          <div className="h-3 w-1/2 rounded bg-slate-100" />
          <div className="mt-3 h-6 w-1/3 rounded bg-slate-100" />
        </div>
      </div>
    </div>
  );
}

export default function BuscarLoading() {
  return (
    <main className="bg-slate-50 py-8 text-slate-950">
      <Container className="space-y-6">
        <div className="h-12 w-full animate-pulse rounded-xl bg-slate-200" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </Container>
    </main>
  );
}
