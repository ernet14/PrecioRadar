"use server";

import { requireAdmin } from "@/lib/supabase/auth";
import {
  createBankPromo,
  toggleBankPromoActive,
  deleteBankPromo,
} from "@/services/bankPromoService";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const createPromoSchema = z.object({
  entity: z.string().trim().min(1, "El nombre del banco es requerido."),
  entitySlug: z.string().trim().min(1, "El slug es requerido.").regex(/^[a-z0-9-]+$/, "Solo letras minúsculas, números y guiones."),
  discountPct: z.coerce.number().int().min(1).max(100),
  promoType: z.string().default("percentage"),
  maxAmount: z.coerce.number().int().positive().nullable().optional(),
  storeSlug: z.string().trim().nullable().optional(),
  paymentType: z.string().default("cualquiera"),
  day_0: z.string().optional(),
  day_1: z.string().optional(),
  day_2: z.string().optional(),
  day_3: z.string().optional(),
  day_4: z.string().optional(),
  day_5: z.string().optional(),
  day_6: z.string().optional(),
  validFrom: z.string().optional().transform((v) => (v ? new Date(v) : new Date())),
  validUntil: z.string().optional().nullable().transform((v) => (v ? new Date(v) : null)),
  sourceUrl: z.string().trim().url().nullable().optional().or(z.literal("")),
  notes: z.string().trim().nullable().optional(),
});

export type CreatePromoState = {
  error?: string;
  success?: boolean;
};

export async function createPromoAction(
  _prev: CreatePromoState,
  formData: FormData,
): Promise<CreatePromoState> {
  await requireAdmin();

  const parsed = createPromoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const { sourceUrl, day_0, day_1, day_2, day_3, day_4, day_5, day_6, ...rest } = parsed.data;
  const dayOfWeek = [day_0, day_1, day_2, day_3, day_4, day_5, day_6]
    .map((v, i) => (v !== undefined ? i : -1))
    .filter((i) => i >= 0);

  await createBankPromo({
    ...rest,
    dayOfWeek,
    maxAmount: rest.maxAmount ?? null,
    storeSlug: rest.storeSlug ?? null,
    validUntil: rest.validUntil ?? null,
    sourceUrl: sourceUrl || null,
    notes: rest.notes ?? null,
  });

  revalidatePath("/admin/promos");
  return { success: true };
}

export async function togglePromoAction(id: string, active: boolean): Promise<void> {
  await requireAdmin();
  await toggleBankPromoActive(id, active);
  revalidatePath("/admin/promos");
}

export async function deletePromoAction(id: string): Promise<void> {
  await requireAdmin();
  await deleteBankPromo(id);
  revalidatePath("/admin/promos");
}
