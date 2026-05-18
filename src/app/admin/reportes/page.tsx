import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { requireAdmin } from "@/lib/supabase/auth";
import { formatDate } from "@/lib/utils";
import {
  ADMIN_REPORT_STATUSES,
  listAdminReports,
  type AdminReportListItem,
  type AdminReportStatus,
} from "@/services/adminService";

type AdminReportsPageProps = {
  searchParams: Promise<{ status?: string | string[] }>;
};

const numberFormatter = new Intl.NumberFormat("es-AR");
const reportReasonLabels: Record<string, string> = {
  broken_link: "Link roto",
  incorrect_price: "Precio incorrecto",
  other: "Otro problema",
  suspicious_offer: "Oferta sospechosa",
  wrong_product_match: "Producto mal relacionado",
};
const reportStatusLabels: Record<AdminReportStatus, string> = {
  DISMISSED: "Descartado",
  OPEN: "Abierto",
  RESOLVED: "Resuelto",
  REVIEWED: "Revisado",
};

function formatCount(value: number) {
  return numberFormatter.format(value);
}

function getSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function ReportStatusFilterLink({
  active,
  count,
  href,
  label,
}: {
  active: boolean;
  count: number;
  href: string;
  label: string;
}) {
  return (
    <Link
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-semibold transition ${
        active
          ? "border-slate-950 bg-slate-950 text-white"
          : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:text-blue-700"
      }`}
      href={href}
    >
      <span>{label}</span>
      <span className="rounded-full bg-current/10 px-2 py-0.5 text-xs">
        {formatCount(count)}
      </span>
    </Link>
  );
}

function ReportListItem({ report }: { report: AdminReportListItem }) {
  return (
    <div className="grid gap-4 border-t border-slate-100 px-5 py-4 lg:grid-cols-[1fr_150px_110px] lg:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-slate-950">
            {reportReasonLabels[report.reason] ?? report.reason}
          </p>
          <Badge variant="neutral">{reportStatusLabels[report.status]}</Badge>
        </div>
        <p className="mt-1 line-clamp-1 text-sm text-slate-600">
          {report.productName ?? "Producto sin asociar"}
        </p>
        <p className="mt-1 line-clamp-1 text-xs font-medium text-slate-400">
          {report.offerTitle ?? "Reporte general"}
          {report.userEmail ? ` - ${report.userEmail}` : ""}
        </p>
      </div>
      <div className="text-sm text-slate-500">
        <p>Creado {formatDate(report.createdAt)}</p>
        <p className="text-xs">Actualizado {formatDate(report.updatedAt)}</p>
      </div>
      <Link
        className="inline-flex h-10 items-center justify-center rounded-lg border border-blue-200 bg-white px-4 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
        href={`/admin/reportes/${report.id}`}
      >
        Abrir
      </Link>
    </div>
  );
}

export default async function AdminReportsPage({
  searchParams,
}: AdminReportsPageProps) {
  await requireAdmin();
  const params = await searchParams;
  const result = await listAdminReports(getSearchParam(params.status));
  const totalReports = Object.values(result.reportStatusCounts).reduce(
    (total, count) => total + count,
    0,
  );

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
            Reportes
          </div>
          <div className="px-6 py-8 md:px-8">
            <Badge className="border-blue-400/40 bg-blue-400/10 text-blue-100">
              Admin · Calidad
            </Badge>
            <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">
              Reportes de usuarios
            </h1>
            <p className="mt-3 max-w-2xl leading-7 text-slate-300">
              Lista operativa para revisar problemas reportados y abrir cada
              caso con su detalle.
            </p>
          </div>
        </section>

        <Card className="border-slate-200 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <div className="flex flex-wrap gap-2">
            <ReportStatusFilterLink
              active={result.selectedStatus === null}
              count={totalReports}
              href="/admin/reportes"
              label="Todos"
            />
            {ADMIN_REPORT_STATUSES.map((status) => (
              <ReportStatusFilterLink
                active={result.selectedStatus === status}
                count={result.reportStatusCounts[status]}
                href={`/admin/reportes?status=${status}`}
                key={status}
                label={reportStatusLabels[status]}
              />
            ))}
          </div>
        </Card>

        {result.status !== "ready" ? (
          <Card className="border-amber-200 bg-amber-50 p-6 text-amber-950 shadow-none">
            <h2 className="text-xl font-semibold">Reportes no disponibles</h2>
            <p className="mt-2 text-sm leading-6">{result.reason}</p>
          </Card>
        ) : (
          <Card className="overflow-hidden border-slate-200 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            <div className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">
                  {result.selectedStatus
                    ? reportStatusLabels[result.selectedStatus]
                    : "Todos los reportes"}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Mostrando hasta 50 reportes recientes.
                </p>
              </div>
              <Badge variant="neutral">
                {formatCount(result.totalCount)} reportes
              </Badge>
            </div>

            {result.reports.length > 0 ? (
              result.reports.map((report) => (
                <ReportListItem key={report.id} report={report} />
              ))
            ) : (
              <p className="border-t border-slate-100 p-5 text-sm text-slate-500">
                No hay reportes para este filtro.
              </p>
            )}
          </Card>
        )}
      </Container>
    </main>
  );
}
