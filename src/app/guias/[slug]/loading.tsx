import { Container } from "@/components/layout/Container";

export default function GuiaLoading() {
  return (
    <main className="bg-slate-50 py-10 text-slate-950">
      <Container className="animate-pulse space-y-10">
        <div className="h-4 w-48 rounded bg-slate-200" />
        <div className="grid gap-10 lg:grid-cols-[1fr_300px]">
          <div className="space-y-6">
            <div className="h-6 w-24 rounded-full bg-slate-200" />
            <div className="space-y-3">
              <div className="h-10 w-3/4 rounded bg-slate-200" />
              <div className="h-10 w-2/3 rounded bg-slate-200" />
            </div>
            <div className="h-4 w-1/2 rounded bg-slate-200" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-6 w-2/3 rounded bg-slate-200" />
                <div className="h-4 w-full rounded bg-slate-200" />
                <div className="h-4 w-5/6 rounded bg-slate-200" />
                <div className="h-4 w-4/5 rounded bg-slate-200" />
              </div>
            ))}
          </div>
          <div className="space-y-4">
            <div className="h-40 rounded-xl bg-slate-200" />
            <div className="h-40 rounded-xl bg-slate-200" />
          </div>
        </div>
      </Container>
    </main>
  );
}
