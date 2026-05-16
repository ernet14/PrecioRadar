"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/auth";
import { syncAuthUserToPrisma } from "@/services/userSyncService";
import {
  followProduct,
  type FollowProductResult,
  type UnfollowProductResult,
  unfollowProduct,
} from "@/services/trackedProductService";
import { followProductSchema, unfollowProductSchema } from "@/lib/validation/schemas";

const DEFAULT_RETURN_TO = "/dashboard";

function getStringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getSafeReturnTo(value: string) {
  if (!value.startsWith("/") || value.startsWith("//")) {
    return DEFAULT_RETURN_TO;
  }

  return value;
}

function redirectWithTrackingStatus(returnTo: string, status: string): never {
  const url = new URL(returnTo, "http://precioradar.local");
  url.searchParams.set("tracking", status);
  redirect(`${url.pathname}${url.search}`);
}

function getRevalidationPath(returnTo: string) {
  const url = new URL(returnTo, "http://precioradar.local");
  return url.pathname;
}

function mapFollowStatus(result: FollowProductResult) {
  if (result.status === "tracked") return "tracked";
  if (result.status === "already_tracked") return "already-tracked";
  if (result.status === "limit_reached") return "limit";
  if (result.status === "not_found") return "not-found";
  if (result.status === "database_unavailable") return "unavailable";
  return "error";
}

function mapUnfollowStatus(result: UnfollowProductResult) {
  if (result.status === "untracked") return "untracked";
  if (result.status === "not_tracked") return "not-tracked";
  if (result.status === "database_unavailable") return "unavailable";
  return "error";
}

export async function followProductAction(formData: FormData) {
  const returnTo = getSafeReturnTo(getStringValue(formData, "returnTo"));
  const parsed = followProductSchema.safeParse({
    slug: getStringValue(formData, "slug"),
    offerKey: getStringValue(formData, "offerKey"),
  });

  if (!parsed.success) {
    redirectWithTrackingStatus(returnTo, "invalid");
  }

  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  }

  await syncAuthUserToPrisma(user);

  const result = await followProduct(user.id, parsed.data.slug, parsed.data.offerKey);
  revalidatePath("/dashboard");
  revalidatePath(getRevalidationPath(returnTo));
  redirectWithTrackingStatus(returnTo, mapFollowStatus(result));
}

export async function unfollowProductAction(formData: FormData) {
  const returnTo = getSafeReturnTo(getStringValue(formData, "returnTo"));
  const parsed = unfollowProductSchema.safeParse({
    trackedProductId: getStringValue(formData, "trackedProductId"),
  });

  if (!parsed.success) {
    redirectWithTrackingStatus(returnTo, "invalid");
  }

  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  }

  const result = await unfollowProduct(user.id, parsed.data.trackedProductId);
  revalidatePath("/dashboard");
  revalidatePath(getRevalidationPath(returnTo));
  redirectWithTrackingStatus(returnTo, mapUnfollowStatus(result));
}
