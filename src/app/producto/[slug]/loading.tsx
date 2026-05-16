import { Container } from "@/components/layout/Container";

export default function ProductoLoading() {
  return (
    <main className="bg-[#f4f7fb] py-8 text-slate-950">
      <Container className="animate-pulse space-y-10">
        <div className="h-4 w-32 rounded bg-slate-200" />

        <div className="grid gap-6 lg:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.15fr)_320px]">
          <div className="aspect-square rounded-xl bg-slate-200" />
          <div className="space-y-5">
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <div className="flex gap-2">
                <div className="h-6 w-16 rounded-full bg-slate-200" />
                <div className="h-6 w-24 rounded-full bg-slate-200" />
              </div>
              <div className="mt-5 h-10 w-3/4 rounded bg-slate-200" />
              <div className="mt-3 h-4 w-1/3 rounded bg-slate-200" />
            </div>
            <div className="rounded-xl bg-blue-50 p-6">
              <div className="h-3 w-24 rounded bg-blue-100" />
              <div className="mt-2 h-12 w-48 rounded bg-blue-100" />
              <div className="mt-3 h-4 w-36 rounded bg-blue-100" />
            </div>
          </div>
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <div className="h-5 w-28 rounded bg-slate-200" />
            <div className="mt-4 space-y-3">
              <div className="h-11 rounded-lg bg-slate-200" />
              <div className="h-11 rounded-lg bg-slate-200" />
            </div>
          </div>
        </div>

        <div className="h-64 rounded-xl bg-white shadow-sm" />
      </Container>
    </main>
  );
}
