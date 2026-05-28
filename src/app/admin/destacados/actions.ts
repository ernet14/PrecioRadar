"use server";

import { requireAdmin } from "@/lib/supabase/auth";
import { generateWeeklyFeaturedProducts } from "@/services/weeklyFeaturedService";
import { revalidatePath } from "next/cache";

export type RefreshResult = {
  status: "generated" | "skipped" | "database_unavailable" | "error";
  count: number;
  reason?: string;
};

export async function forceRefreshAction(): Promise<RefreshResult> {
  await requireAdmin();

  const result = await generateWeeklyFeaturedProducts({ force: true });

  revalidatePath("/admin/destacados");
  revalidatePath("/");

  return result;
}
