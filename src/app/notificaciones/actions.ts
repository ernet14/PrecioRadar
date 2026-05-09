"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/auth";
import { evaluateUserAlerts } from "@/services/alertService";
import {
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type UpdateNotificationResult,
} from "@/services/notificationService";

function getStringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getSafeReturnTo(value: string) {
  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
}

function redirectWithNotificationStatus(returnTo: string, status: string): never {
  const url = new URL(returnTo, "http://precioradar.local");
  url.searchParams.set("notification", status);
  redirect(`${url.pathname}${url.search}`);
}

function mapReadStatus(result: UpdateNotificationResult) {
  if (result.status === "read") {
    return "read";
  }

  if (result.status === "not_found") {
    return "not-found";
  }

  if (result.status === "database_unavailable") {
    return "unavailable";
  }

  return "error";
}

export async function evaluateAlertsAction(formData: FormData) {
  const returnTo = getSafeReturnTo(getStringValue(formData, "returnTo"));
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  }

  const result = await evaluateUserAlerts(user.id);
  revalidatePath("/dashboard");
  revalidatePath("/alertas");

  if (result.status === "evaluated") {
    redirectWithNotificationStatus(
      returnTo,
      result.createdCount > 0 ? "created" : "none",
    );
  }

  if (result.status === "database_unavailable") {
    redirectWithNotificationStatus(returnTo, "unavailable");
  }

  redirectWithNotificationStatus(returnTo, "error");
}

export async function markNotificationAsReadAction(formData: FormData) {
  const notificationId = getStringValue(formData, "notificationId");
  const returnTo = getSafeReturnTo(getStringValue(formData, "returnTo"));
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  }

  const result = await markNotificationAsRead(user.id, notificationId);
  revalidatePath("/dashboard");
  redirectWithNotificationStatus(returnTo, mapReadStatus(result));
}

export async function markAllNotificationsAsReadAction(formData: FormData) {
  const returnTo = getSafeReturnTo(getStringValue(formData, "returnTo"));
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  }

  const result = await markAllNotificationsAsRead(user.id);
  revalidatePath("/dashboard");
  redirectWithNotificationStatus(returnTo, mapReadStatus(result));
}
