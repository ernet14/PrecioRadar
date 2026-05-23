"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/auth";
import {
  deleteBankPromo,
  toggleBankPromoActive,
} from "@/services/bankPromoService";
import {
  addBankPromoBotSource,
  deleteBankPromoBotSource,
  importBankPromosFromConfiguredSources,
  setBankPromoBotSourceActive,
} from "@/services/bankPromoBotService";

function revalidateBankPromoBotPaths() {
  revalidatePath("/admin/promos/bot");
  revalidatePath("/admin/promos");
  revalidatePath("/promos-hoy");
}

export async function runBankPromoBotAction() {
  await requireAdmin();
  await importBankPromosFromConfiguredSources();
  revalidateBankPromoBotPaths();
}

export async function addBankPromoBotSourceAction(formData: FormData) {
  await requireAdmin();
  await addBankPromoBotSource(String(formData.get("url") ?? ""));
  revalidateBankPromoBotPaths();
}

export async function pauseBankPromoBotSourceAction(formData: FormData) {
  await requireAdmin();
  await setBankPromoBotSourceActive(String(formData.get("id") ?? ""), false);
  revalidateBankPromoBotPaths();
}

export async function resumeBankPromoBotSourceAction(formData: FormData) {
  await requireAdmin();
  await setBankPromoBotSourceActive(String(formData.get("id") ?? ""), true);
  revalidateBankPromoBotPaths();
}

export async function deleteBankPromoBotSourceAction(formData: FormData) {
  await requireAdmin();
  await deleteBankPromoBotSource(String(formData.get("id") ?? ""));
  revalidateBankPromoBotPaths();
}

export async function publishBotPromoAction(formData: FormData) {
  await requireAdmin();
  await toggleBankPromoActive(String(formData.get("id") ?? ""), true);
  revalidateBankPromoBotPaths();
}

export async function pauseBotPromoAction(formData: FormData) {
  await requireAdmin();
  await toggleBankPromoActive(String(formData.get("id") ?? ""), false);
  revalidateBankPromoBotPaths();
}

export async function deleteBotPromoAction(formData: FormData) {
  await requireAdmin();
  await deleteBankPromo(String(formData.get("id") ?? ""));
  revalidateBankPromoBotPaths();
}
