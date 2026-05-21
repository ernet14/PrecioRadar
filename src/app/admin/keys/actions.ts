"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/supabase/auth";
import { createApiKeyRecord, revokeApiKey } from "@/services/apiKeyService";
import type { ApiTier } from "@/lib/apiTiers";

export type CreateKeyState = {
  rawKey?: string;
  name?: string;
  error?: string;
};

const createKeySchema = z.object({
  name: z.string().trim().min(2, "Poné un nombre identificable.").max(80),
  tier: z.enum(["FREE", "PRO", "BUSINESS"]),
  ownerEmail: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    z.string().trim().email("Email inválido.").nullable().optional(),
  ),
});

export async function createApiKeyAction(
  _prev: CreateKeyState,
  formData: FormData,
): Promise<CreateKeyState> {
  await requireAdmin();

  const parsed = createKeySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const result = await createApiKeyRecord({
    name: parsed.data.name,
    tier: parsed.data.tier as ApiTier,
    ownerEmail: parsed.data.ownerEmail ?? null,
  });

  if (!result) {
    return { error: "No se pudo crear la clave (base no disponible)." };
  }

  revalidatePath("/admin/keys");
  return { rawKey: result.rawKey, name: parsed.data.name };
}

export async function revokeApiKeyAction(id: string): Promise<void> {
  await requireAdmin();
  await revokeApiKey(id);
  revalidatePath("/admin/keys");
}
