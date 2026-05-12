import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { requireAdmin } from "@/lib/supabase/auth";
import { formatDate } from "@/lib/utils";
import { getAdminReportDetail } from "@/services/adminService";

type AdminReportPageProps = {
  params: Promise<{ id: string }>;
};

const reportReasonLabels: Record<string, string> = {
  broken_link: "Link roto",
  incorrect_price: "Precio incorrecto",
  other: "Otro problema",
  suspicious_offer: "Oferta sospechosa",
  wrong_product_match: "Producto mal relacionado",
};

export default async function AdminReportPage({
  params,
}: AdminReportPageProps) {
  await requireAdmin();
  const { id } = await params;
  const result = await getAdminReportDetail(id);

  if (result.status !== "ready") {
    return (
      <main className="bg-[#f4f7fb] py-10 text-slate-950">
        <Container className="space-y-6">
          <Link
            className="inline-flex text-sm font-semibold text-blue-700 transition hover:text-blue-800"
            href="/admin"
          >
            Volver al admin
          </Link>
          <Card className="border-amber-200 bg-amber-50 p-6 text-amber-950 shadow-none">
            <h1 className="text-xl font-semibold">Reporte no disponible</h1>
            <p className="mt-2 text-sm leading-6">{result.reason}</p>
          </Card>
        </Container>
      </main>
    );
  }

  const { report } = result;

  return (
    <main className="bg-[#f4f7fb] py-10 text-slate-950">
      <Container className="space-y-6">
        <Link
          className="inline-flex text-sm font-semibold text-blue-700 transition hover:text-blue-800"
          href="/admin"
        >
          Volver al admin
        </Link>

        <section className="overflow-hidden rounded-3xl bg-slate-950 text-white shadow-[0_24px_60px_rgba(15,23,42,0.22)]">
          <div className="border-b border-white/10 bg-white/[0.03] px-6 py-3 text-sm font-semibold text-blue-100 md:px-8">
            Reporte de usuario
          </div>
          <div className="px-6 py-8 md:px-8">
            <Badge className="border-blue-400/40 bg-blue-400/10 text-blue-100">
              {report.status}
            </Badge>
            <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">
              {reportReasonLabels[report.reason] ?? report.reason}
            </h1>
            <p className="mt-3 max-w-2xl leading-7 text-slate-300">
              Creado el {formatDate(report.createdAt)}
              {report.userEmail ? ` por ${report.userEmail}` : " por usuario anonimo"}.
            </p>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <Card className="border-slate-200 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            <h2 className="text-xl font-semibold text-slate-950">Detalle</h2>
            <p className="mt-4 whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              {report.message || "El usuario no agrego detalle adicional."}
            </p>
          </Card>

          <Card className="border-slate-200 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            <h2 className="text-xl font-semibold text-slate-950">
              Asociaciones
            </h2>
            <div className="mt-4 space-y-4 text-sm leading-6 text-slate-600">
              <div>
                <p className="font-semibold text-slate-950">Producto</p>
                {report.product ? (
                  <Link
                    className="text-blue-700 transition hover:text-blue-800"
                    href={`/producto/${report.product.slug}`}
                  >
                    {report.product.name}
                  </Link>
                ) : (
                  <p>Sin producto asociado.</p>
                )}
              </div>

              <div>
                <p className="font-semibold text-slate-950">Oferta</p>
                {report.offer ? (
                  <div>
                    <p>{report.offer.storeName}</p>
                    <p className="text-slate-500">{report.offer.title}</p>
                    <a
                      className="mt-2 inline-flex h-9 items-center justify-center rounded-lg border border-blue-200 bg-white px-3 text-xs font-semibold text-blue-700 transition hover:bg-blue-50"
                      href={report.offer.productUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Abrir oferta
                    </a>
                  </div>
                ) : (
                  <p>Reporte general del producto.</p>
                )}
              </div>
            </div>
          </Card>
        </section>
      </Container>
    </main>
  );
}
