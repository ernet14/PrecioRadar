"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/auth";
import {
  updateAdminReportStatus,
  type UpdateAdminReportStatusResult,
} from "@/services/adminService";

function getStringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getReportPath(reportId: string) {
  return reportId ? `/admin/reportes/${reportId}` : "/admin";
}

function mapUpdateStatus(result: UpdateAdminReportStatusResult) {
  if (result.status === "updated") {
    return "updated";
  }

  if (result.status === "invalid") {
    return "invalid";
  }

  if (result.status === "not_found") {
    return "not-found";
  }

  if (result.status === "database_unavailable") {
    return "unavailable";
  }

  return "error";
}

function redirectWithAdminReportStatus(reportId: string, status: string): never {
  const url = new URL(getReportPath(reportId), "http://precioradar.local");
  url.searchParams.set("adminReport", status);
  redirect(`${url.pathname}${url.search}`);
}

export async function updateAdminReportStatusAction(formData: FormData) {
  await requireAdmin();

  const reportId = getStringValue(formData, "reportId");
  const result = await updateAdminReportStatus(
    reportId,
    getStringValue(formData, "status"),
  );

  revalidatePath("/admin");
  revalidatePath(getReportPath(reportId));
  redirectWithAdminReportStatus(reportId, mapUpdateStatus(result));
}
