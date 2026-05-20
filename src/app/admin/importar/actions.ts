"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/auth";
import {
  createImportDraftsFromLinks,
  publishImportDraft,
  saveImportDraft,
  type SaveImportDraftInput,
} from "@/services/productImportService";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getPrice(formData: FormData, key: string) {
  const raw = getString(formData, key);

  if (!raw) return null;

  const normalized = raw.replace(/\./g, "").replace(",", ".");
  const value = Number(normalized);

  return Number.isFinite(value) && value >= 0 ? value : null;
}

function getDraftInput(formData: FormData): SaveImportDraftInput {
  return {
    affiliateUrl: getString(formData, "affiliateUrl"),
    categorySlug: getString(formData, "categorySlug"),
    currentPrice: getPrice(formData, "currentPrice"),
    externalUrl: getString(formData, "externalUrl"),
    imageUrl: getString(formData, "imageUrl"),
    previousPrice: getPrice(formData, "previousPrice"),
    productName: getString(formData, "productName"),
    shortDescription: getString(formData, "shortDescription"),
    storeName: getString(formData, "storeName"),
    storeSlug: getString(formData, "storeSlug"),
  };
}

function redirectWith(params: Record<string, string | number>): never {
  const query = new URLSearchParams(
    Object.entries(params).map(([key, value]) => [key, String(value)]),
  );

  redirect(`/admin/importar?${query.toString()}`);
}

export async function createImportDraftsAction(formData: FormData) {
  await requireAdmin();

  const result = await createImportDraftsFromLinks(getString(formData, "links") ?? "");

  revalidatePath("/admin");
  revalidatePath("/admin/importar");

  if (result.status === "created") {
    redirectWith({ created: result.createdCount });
  }

  if (result.status === "database_unavailable" || result.status === "invalid") {
    redirectWith({ error: result.reason });
  }

  redirectWith({ error: "No pudimos crear los borradores." });
}

export async function saveImportDraftAction(formData: FormData) {
  await requireAdmin();

  const id = getString(formData, "id");

  if (!id) {
    redirectWith({ error: "Falta el ID del borrador." });
  }

  await saveImportDraft(id, getDraftInput(formData));
  revalidatePath("/admin/importar");
  redirectWith({ saved: 1 });
}

export async function publishImportDraftAction(formData: FormData) {
  await requireAdmin();

  const id = getString(formData, "id");

  if (!id) {
    redirectWith({ error: "Falta el ID del borrador." });
  }

  const result = await publishImportDraft(id, getDraftInput(formData));

  revalidatePath("/admin");
  revalidatePath("/admin/importar");

  if (result.status === "published") {
    redirectWith({ published: result.productSlug });
  }

  if (result.status === "invalid") {
    redirectWith({
      error: `Completá estos campos antes de publicar: ${result.missingFields.join(", ")}`,
    });
  }

  if (result.status === "already_published") {
    redirectWith({ error: "Este borrador ya fue publicado." });
  }

  if (result.status === "database_unavailable" || result.status === "not_found") {
    redirectWith({ error: result.reason });
  }

  redirectWith({ error: "No pudimos publicar el borrador." });
}
