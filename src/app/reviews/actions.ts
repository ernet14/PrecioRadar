"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/auth";
import { syncAuthUserToPrisma } from "@/services/userSyncService";
import { createReview, type CreateReviewResult } from "@/services/reviewService";
import { reviewProductSchema } from "@/lib/validation/schemas";

const DEFAULT_RETURN_TO = "/buscar";

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

function redirectWithReviewStatus(returnTo: string, status: string): never {
  const url = new URL(returnTo, "http://precioradar.local");
  url.searchParams.set("review", status);
  redirect(`${url.pathname}${url.search}#resenas`);
}

function mapReviewStatus(result: CreateReviewResult) {
  if (result.status === "created") return "ok";
  if (result.status === "rejected") return "rejected";
  if (result.status === "too_new") return "too-new";
  if (result.status === "invalid_rating") return "invalid";
  if (result.status === "not_found") return "not-found";
  if (result.status === "database_unavailable") return "unavailable";
  return "error";
}

export async function reviewProductAction(formData: FormData) {
  const returnTo = getSafeReturnTo(getStringValue(formData, "returnTo"));
  const parsed = reviewProductSchema.safeParse({
    slug: getStringValue(formData, "slug"),
    rating: getStringValue(formData, "rating"),
    body: getStringValue(formData, "body"),
  });

  if (!parsed.success) {
    redirectWithReviewStatus(returnTo, "invalid");
  }

  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  }

  await syncAuthUserToPrisma(user);

  const result = await createReview({
    userId: user.id,
    slug: parsed.data.slug,
    rating: parsed.data.rating,
    body: parsed.data.body,
  });

  revalidatePath(new URL(returnTo, "http://precioradar.local").pathname);
  redirectWithReviewStatus(returnTo, mapReviewStatus(result));
}
