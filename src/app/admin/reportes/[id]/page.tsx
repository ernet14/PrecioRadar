import Link from "next/link";
import { updateAdminReportStatusAction } from "@/app/admin/reportes/[id]/actions";
import { Container } from "@/components/layout/Container";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { requireAdmin } from "@/lib/supabase/auth";
import { formatDate } from "@/lib/utils";
import {
  ADMIN_REPORT_STATUSES,
  getAdminReportDetail,
} from "@/services/adminService";

type AdminReportPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ adminReport?: string | string[] }>;
};

const reportReasonLabels: Record<string, string> = {
  broken_link: "Link roto",
  incorrect_price: "Precio incorrecto",
  other: "Otro problema",
  suspicious_offer: "Oferta sospechosa",
  wrong_product_match: "Producto mal relacionado",
};

const reportStatusLabels: Record<string, string> = {
  DISMISSED: "Descartado",
  OPEN: "Abierto",
  RESOLVED: "Resuelto",
  REVIEWED: "Revisado",
};

const reportStatusActions: Record<string, string> = {
  DISMISSED: "Descartar",
  OPEN: "Reabrir",
  RESOLVED: "Resolver",
  REVIEWED: "Marcar revisado",
};

const adminReportFeedbackMessages: Record<
  string,
  { className: string; description: string; title: string }
> = {
  error: {
    className: "border-rose-200 bg-rose-50 text-rose-950",
    description: "No pudimos cambiar el estado del reporte.",
    title: "Error al actualizar",
  },
  invalid: {
    className: "border-amber-200 bg-amber-50 text-amber-950",
    description: "El estado solicitado no es valido para este reporte.",
    title: "Estado invalido",
  },
  "not-found": {
    className: "border-amber-200 bg-amber-50 text-amber-950",
    description: "No encontramos el reporte que intentaste actualizar.",
    title: "Reporte no encontrado",
  },
  unavailable: {
    className: "border-amber-200 bg-amber-50 text-amber-950",
    description: "La base de datos no esta disponible para guardar cambios.",
    title: "Datos no disponibles",
  },
  updated: {
    className: "border-emerald-200 bg-emerald-50 text-emerald-950",
    description: "Guardamos el nuevo estado del reporte.",
    title: "Estado actualizado",
  },
};

function getSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function AdminReportStatusFeedback({ status }: { status: string }) {
  const feedback = adminReportFeedbackMessages[status];

  if (!feedback) {
    return null;
  }

  return (
    <Card className={`p-5 text-sm leading-6 shadow-none ${feedback.className}`}>
      <p className="font-semibold">{feedback.title}</p>
      <p className="mt-1">{feedback.description}</p>
    </Card>
  );
}

export default async function AdminReportPage({
  params,
  searchParams,
}: AdminReportPageProps) {
  await requireAdmin();
  const { id } = await params;
  const queryParams = await searchParams;
  const adminReportStatus = getSearchParam(queryParams.adminReport);
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
          <AdminReportStatusFeedback status={adminReportStatus} />
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
        <AdminReportStatusFeedback status={adminReportStatus} />

        <section className="overflow-hidden rounded-3xl bg-slate-950 text-white shadow-[0_24px_60px_rgba(15,23,42,0.22)]">
          <div className="border-b border-white/10 bg-white/[0.03] px-6 py-3 text-sm font-semibold text-blue-100 md:px-8">
            Reporte de usuario
          </div>
          <div className="px-6 py-8 md:px-8">
            <Badge className="border-blue-400/40 bg-blue-400/10 text-blue-100">
              {reportStatusLabels[report.status] ?? report.status}
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

          <div className="space-y-4">
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

            <Card className="border-slate-200 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
              <h2 className="text-xl font-semibold text-slate-950">
                Estado
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Estado actual:{" "}
                <span className="font-semibold text-slate-950">
                  {reportStatusLabels[report.status] ?? report.status}
                </span>
              </p>
              <form
                action={updateAdminReportStatusAction}
                className="mt-4 grid gap-2"
              >
                <input name="reportId" type="hidden" value={report.id} />
                {ADMIN_REPORT_STATUSES.map((status) => (
                  <Button
                    className="w-full"
                    disabled={status === report.status}
                    key={status}
                    name="status"
                    type="submit"
                    value={status}
                    variant={status === "RESOLVED" ? "primary" : "secondary"}
                  >
                    {reportStatusActions[status]}
                  </Button>
                ))}
              </form>
            </Card>
          </div>
        </section>
      </Container>
    </main>
  );
}
