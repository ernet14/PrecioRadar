import { Container } from "@/components/layout/Container";

export default function DashboardLoading() {
  return (
    <main className="bg-slate-50 py-10 text-slate-950">
      <Container className="animate-pulse space-y-8">
        <div className="h-8 w-48 rounded bg-slate-200" />
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="h-3 w-24 rounded bg-slate-200" />
              <div className="mt-3 h-8 w-16 rounded bg-slate-200" />
            </div>
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-slate-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/2 rounded bg-slate-200" />
                  <div className="h-3 w-1/4 rounded bg-slate-200" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </main>
  );
}
