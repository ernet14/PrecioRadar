"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/auth";
import { syncAuthUserToPrisma } from "@/services/userSyncService";
import { castVote, type VoteValue } from "@/services/voteService";
import { voteProductSchema } from "@/lib/validation/schemas";

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

function redirectWithVoteStatus(returnTo: string, status: string): never {
  const url = new URL(returnTo, "http://precioradar.local");
  url.searchParams.set("vote", status);
  redirect(`${url.pathname}${url.search}#votos`);
}

export async function voteProductAction(formData: FormData) {
  const returnTo = getSafeReturnTo(getStringValue(formData, "returnTo"));
  const parsed = voteProductSchema.safeParse({
    slug: getStringValue(formData, "slug"),
    value: getStringValue(formData, "value"),
  });

  if (!parsed.success) {
    redirectWithVoteStatus(returnTo, "invalid");
  }

  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  }

  await syncAuthUserToPrisma(user);

  const result = await castVote({
    userId: user.id,
    slug: parsed.data.slug,
    value: parsed.data.value as VoteValue,
  });

  revalidatePath(new URL(returnTo, "http://precioradar.local").pathname);
  redirectWithVoteStatus(returnTo, result.status === "voted" ? "ok" : result.status);
}
