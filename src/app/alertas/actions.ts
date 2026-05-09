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
    return "/alertas";
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
  if (result.status === "created") {
    return "created";
  }

  if (result.status === "limit_reached") {
    return "limit";
  }

  if (result.status === "not_found") {
    return "not-found";
  }

  if (result.status === "invalid") {
    return "invalid";
  }

  if (result.status === "database_unavailable") {
    return "unavailable";
  }

  return "error";
}

function mapUpdateStatus(result: UpdateAlertStatusResult) {
  if (result.status === "paused") {
    return "paused";
  }

  if (result.status === "reactivated") {
    return "reactivated";
  }

  if (result.status === "deleted") {
    return "deleted";
  }

  if (result.status === "limit_reached") {
    return "limit";
  }

  if (result.status === "not_found") {
    return "not-found";
  }

  if (result.status === "database_unavailable") {
    return "unavailable";
  }

  return "error";
}

function getCreateAlertInput(formData: FormData): CreateAlertInput | null {
  const productSlug = getStringValue(formData, "slug");
  const alertType = getStringValue(formData, "alertType");

  if (alertType === "TARGET_PRICE") {
    return {
      alertType,
      productSlug,
      targetPrice: getNumberValue(formData, "targetPrice"),
    };
  }

  if (alertType === "PERCENTAGE_DROP") {
    return {
      alertType,
      productSlug,
      targetPercentage: getNumberValue(formData, "targetPercentage"),
    };
  }

  return null;
}

export async function createAlertAction(formData: FormData) {
  const returnTo = getSafeReturnTo(getStringValue(formData, "returnTo"));
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  }

  const input = getCreateAlertInput(formData);

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
  const alertId = getStringValue(formData, "alertId");
  const returnTo = getSafeReturnTo(getStringValue(formData, "returnTo"));
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  }

  const result = await pauseAlert(user.id, alertId);
  revalidatePath("/alertas");
  revalidatePath("/dashboard");
  redirectWithAlertStatus(returnTo, mapUpdateStatus(result));
}

export async function reactivateAlertAction(formData: FormData) {
  const alertId = getStringValue(formData, "alertId");
  const returnTo = getSafeReturnTo(getStringValue(formData, "returnTo"));
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  }

  const result = await reactivateAlert(user.id, alertId);
  revalidatePath("/alertas");
  revalidatePath("/dashboard");
  redirectWithAlertStatus(returnTo, mapUpdateStatus(result));
}

export async function deleteAlertAction(formData: FormData) {
  const alertId = getStringValue(formData, "alertId");
  const returnTo = getSafeReturnTo(getStringValue(formData, "returnTo"));
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  }

  const result = await deleteAlert(user.id, alertId);
  revalidatePath("/alertas");
  revalidatePath("/dashboard");
  redirectWithAlertStatus(returnTo, mapUpdateStatus(result));
}
