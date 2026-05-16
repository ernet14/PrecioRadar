"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/auth";
import { syncAuthUserToPrisma } from "@/services/userSyncService";
import {
  createAlert,
  deleteAlert,
  pauseAlert,
  reactivateAlert,
  type CreateAlertInput,
  type CreateAlertResult,
  type UpdateAlertStatusResult,
} from "@/services/alertService";
import {
  alertIdSchema,
  createAlertSchema,
} from "@/lib/validation/schemas";

const DEFAULT_RETURN_TO = "/alertas";

function getStringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getNumberValue(formData: FormData, key: string) {
  const normalizedValue = getStringValue(formData, key)
    .replace(/\$/g, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const value = Number(normalizedValue);
  return Number.isFinite(value) ? value : 0;
}

function getSafeReturnTo(value: string) {
  if (!value.startsWith("/") || value.startsWith("//")) {
    return DEFAULT_RETURN_TO;
  }

  return value;
}

function getRevalidationPath(returnTo: string) {
  const url = new URL(returnTo, "http://precioradar.local");
  return url.pathname;
}

function redirectWithAlertStatus(returnTo: string, status: string): never {
  const url = new URL(returnTo, "http://precioradar.local");
  url.searchParams.set("alert", status);
  redirect(`${url.pathname}${url.search}`);
}

function mapCreateStatus(result: CreateAlertResult) {
  if (result.status === "created") return "created";
  if (result.status === "limit_reached") return "limit";
  if (result.status === "not_found") return "not-found";
  if (result.status === "invalid") return "invalid";
  if (result.status === "database_unavailable") return "unavailable";
  return "error";
}

function mapUpdateStatus(result: UpdateAlertStatusResult) {
  if (result.status === "paused") return "paused";
  if (result.status === "reactivated") return "reactivated";
  if (result.status === "deleted") return "deleted";
  if (result.status === "limit_reached") return "limit";
  if (result.status === "not_found") return "not-found";
  if (result.status === "database_unavailable") return "unavailable";
  return "error";
}

function parseCreateAlertInput(formData: FormData): CreateAlertInput | null {
  const alertType = getStringValue(formData, "alertType");
  const productSlug = getStringValue(formData, "slug");

  const parsed = createAlertSchema.safeParse(
    alertType === "TARGET_PRICE"
      ? { alertType, productSlug, targetPrice: getNumberValue(formData, "targetPrice") }
      : { alertType, productSlug, targetPercentage: getNumberValue(formData, "targetPercentage") },
  );

  if (!parsed.success) return null;

  const { returnTo: _returnTo, ...input } = parsed.data;
  return input as CreateAlertInput;
}

export async function createAlertAction(formData: FormData) {
  const returnTo = getSafeReturnTo(getStringValue(formData, "returnTo"));
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  }

  const input = parseCreateAlertInput(formData);

  if (!input) {
    redirectWithAlertStatus(returnTo, "invalid");
  }

  await syncAuthUserToPrisma(user);

  const result = await createAlert(user.id, input);
  revalidatePath("/alertas");
  revalidatePath("/dashboard");
  revalidatePath(getRevalidationPath(returnTo));
  redirectWithAlertStatus(returnTo, mapCreateStatus(result));
}

export async function pauseAlertAction(formData: FormData) {
  const returnTo = getSafeReturnTo(getStringValue(formData, "returnTo"));
  const parsed = alertIdSchema.safeParse({ alertId: getStringValue(formData, "alertId") });

  if (!parsed.success) redirectWithAlertStatus(returnTo, "invalid");

  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  }

  const result = await pauseAlert(user.id, parsed.data.alertId);
  revalidatePath("/alertas");
  revalidatePath("/dashboard");
  redirectWithAlertStatus(returnTo, mapUpdateStatus(result));
}

export async function reactivateAlertAction(formData: FormData) {
  const returnTo = getSafeReturnTo(getStringValue(formData, "returnTo"));
  const parsed = alertIdSchema.safeParse({ alertId: getStringValue(formData, "alertId") });

  if (!parsed.success) redirectWithAlertStatus(returnTo, "invalid");

  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  }

  const result = await reactivateAlert(user.id, parsed.data.alertId);
  revalidatePath("/alertas");
  revalidatePath("/dashboard");
  redirectWithAlertStatus(returnTo, mapUpdateStatus(result));
}

export async function deleteAlertAction(formData: FormData) {
  const returnTo = getSafeReturnTo(getStringValue(formData, "returnTo"));
  const parsed = alertIdSchema.safeParse({ alertId: getStringValue(formData, "alertId") });

  if (!parsed.success) redirectWithAlertStatus(returnTo, "invalid");

  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  }

  const result = await deleteAlert(user.id, parsed.data.alertId);
  revalidatePath("/alertas");
  revalidatePath("/dashboard");
  redirectWithAlertStatus(returnTo, mapUpdateStatus(result));
}
