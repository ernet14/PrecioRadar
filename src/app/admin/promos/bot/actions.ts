"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/auth";
import { importBankPromosFromConfiguredSources } from "@/services/bankPromoBotService";

export async function runBankPromoBotAction() {
  await requireAdmin();
  await importBankPromosFromConfiguredSources();
  revalidatePath("/admin/promos/bot");
  revalidatePath("/admin/promos");
  revalidatePath("/promos-hoy");
}
