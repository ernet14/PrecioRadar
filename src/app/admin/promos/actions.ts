"use server";

import { requireAdmin } from "@/lib/supabase/auth";
import {
  createBankPromo,
  deleteBankPromo,
  toggleBankPromoActive,
} from "@/services/bankPromoService";
import {
  parseBankPromoText,
  type ParsedBankPromoDraft,
} from "@/services/bankPromoParser";
import { extractFirstUrl, fetchBankPromoText } from "@/services/bankPromoFetcher";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export type CreatePromoState = {
  error?: string;
  success?: boolean;
};

function emptyStringToNull(value: unknown) {
  return typeof value === "string" && value.trim() === "" ? null : value;
}

function parseDateStart(value: string | null | undefined) {
  if (!value) return new Date();
  return new Date(`${value}T00:00:00`);
}

function parseDateEnd(value: string | null | undefined) {
  if (!value) return null;
  return new Date(`${value}T23:59:59.999`);
}

const optionalText = z.preprocess(
  emptyStringToNull,
  z.string().trim().nullable().optional(),
);
const optionalUrl = z.preprocess(
  emptyStringToNull,
  z.string().trim().url().nullable().optional(),
);
const optionalPositiveInt = z.preprocess(
  emptyStringToNull,
  z.coerce.number().int().positive().nullable().optional(),
);

const createPromoSchema = z
  .object({
    categorySlug: optionalText,
    commerceChannel: z.enum(["online", "physical", "both"]).default("online"),
    discountPct: z.coerce.number().int().min(0).max(100),
    day_0: z.string().optional(),
    day_1: z.string().optional(),
    day_2: z.string().optional(),
    day_3: z.string().optional(),
    day_4: z.string().optional(),
    day_5: z.string().optional(),
    day_6: z.string().optional(),
    entity: z.string().trim().min(1, "El nombre del banco es requerido."),
    entitySlug: z
      .string()
      .trim()
      .min(1, "El slug es requerido.")
      .regex(/^[a-z0-9-]+$/, "Solo letras minusculas, numeros y guiones."),
    installments: optionalPositiveInt,
    maxAmount: optionalPositiveInt,
    notes: optionalText,
    paymentType: z.string().default("cualquiera"),
    promoType: z.enum(["percentage", "refund", "installments"]).default("percentage"),
    sourceUrl: optionalUrl,
    storeSlug: optionalText,
    validFrom: z.string().optional().transform((v) => parseDateStart(v)),
    validUntil: z.string().optional().nullable().transform((v) => parseDateEnd(v)),
  })
  .refine(
    (data) => data.promoType !== "installments" || Boolean(data.installments),
    {
      message: "Las cuotas sin interes requieren cantidad de cuotas.",
      path: ["installments"],
    },
  );

export async function createPromoAction(
  _prev: CreatePromoState,
  formData: FormData,
): Promise<CreatePromoState> {
  await requireAdmin();

  const parsed = createPromoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos invalidos." };
  }

  const {
    day_0,
    day_1,
    day_2,
    day_3,
    day_4,
    day_5,
    day_6,
    sourceUrl,
    ...rest
  } = parsed.data;
  const dayOfWeek = [day_0, day_1, day_2, day_3, day_4, day_5, day_6]
    .map((value, index) => (value !== undefined ? index : -1))
    .filter((index) => index >= 0);

  await createBankPromo({
    ...rest,
    categorySlug: rest.categorySlug ?? null,
    dayOfWeek,
    installments: rest.installments ?? null,
    maxAmount: rest.maxAmount ?? null,
    notes: rest.notes ?? null,
    sourceUrl: sourceUrl ?? null,
    storeSlug: rest.storeSlug ?? null,
    validUntil: rest.validUntil ?? null,
  });

  revalidatePath("/admin/promos");
  revalidatePath("/promos-hoy");
  return { success: true };
}

export type ParsePromoState = {
  draft: ParsedBankPromoDraft | null;
  key?: string;
  error?: string;
  note?: string;
};

export async function parsePromoTextAction(
  _prev: ParsePromoState,
  formData: FormData,
): Promise<ParsePromoState> {
  await requireAdmin();

  const text = String(formData.get("text") ?? "").trim();
  if (!text) {
    return { draft: null, error: "Pega el texto o el link de la promo para analizarlo." };
  }

  // Si hay un link de banco conocido, lo leemos y combinamos con el texto pegado.
  let combined = text;
  let note: string | undefined;
  const url = extractFirstUrl(text);

  if (url) {
    const fetched = await fetchBankPromoText(url);
    if (fetched.status === "ok") {
      combined = `${fetched.text}\n\n${text}`;
      note = "Leí el contenido del link y lo combiné con el texto pegado.";
    } else if (fetched.status === "not_allowed") {
      note =
        "El link no es de un banco/billetera reconocido: usé solo el texto pegado. Pegá también los términos y condiciones para mejor detección.";
    } else {
      note = `No pude leer el link (${fetched.reason}): usé el texto pegado. Pegá también los términos y condiciones para mejor detección.`;
    }
  }

  const draft = parseBankPromoText(combined);

  // Si quedó "flaco" (solo el banco, sin beneficio/día), avisamos que conviene
  // pegar los términos y condiciones completos (los links de banco son SPA y el
  // fetch trae poco).
  const isThin =
    draft.discountPct === null &&
    draft.installments === null &&
    draft.dayOfWeek.length === 0;
  if (isThin) {
    const hint =
      "Saqué pocos datos. Pegá los términos y condiciones completos (no solo el link) para completar tipo, %, tope, cuotas y días.";
    note = note ? `${note} ${hint}` : hint;
  }

  return { draft, key: Date.now().toString(), note };
}

export async function togglePromoAction(
  id: string,
  active: boolean,
): Promise<void> {
  await requireAdmin();
  await toggleBankPromoActive(id, active);
  revalidatePath("/admin/promos");
  revalidatePath("/promos-hoy");
}

export async function deletePromoAction(id: string): Promise<void> {
  await requireAdmin();
  await deleteBankPromo(id);
  revalidatePath("/admin/promos");
  revalidatePath("/promos-hoy");
}
