"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/auth";
import {
  createProductReport,
  type CreateProductReportResult,
} from "@/services/reportService";
import { syncAuthUserToPrisma } from "@/services/userSyncService";

function getStringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getSafeReturnTo(value: string) {
  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/buscar";
  }

  return value;
}

function redirectWithReportStatus(returnTo: string, status: string): never {
  const url = new URL(returnTo, "http://precioradar.local");
  url.searchParams.set("report", status);
  redirect(`${url.pathname}${url.search}`);
}

function mapReportStatus(result: CreateProductReportResult) {
  if (result.status === "created") {
    return "created";
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

export async function reportProductProblemAction(formData: FormData) {
  const returnTo = getSafeReturnTo(getStringValue(formData, "returnTo"));
  const user = await getCurrentUser();
  let reportUserId: string | null = null;

  if (user) {
    const syncResult = await syncAuthUserToPrisma(user);
    reportUserId = syncResult.status === "synced" ? user.id : null;
  }

  const result = await createProductReport(reportUserId, {
    message: getStringValue(formData, "message"),
    offerKey: getStringValue(formData, "offerKey"),
    productSlug: getStringValue(formData, "productSlug"),
    reason: getStringValue(formData, "reason"),
  });

  revalidatePath("/admin");
  revalidatePath(returnTo);
  redirectWithReportStatus(returnTo, mapReportStatus(result));
}
