import { z } from "zod";

const slug = z.string().trim().min(1).max(200).regex(/^[\w-]+$/);
const offerKey = z.string().trim().min(1).max(200);
const uuid = z.string().uuid();
const safeReturnTo = z
  .string()
  .trim()
  .regex(/^\/(?!\/)/);

export const outRouteSchema = z.object({
  slug,
  offer: offerKey,
});

export const createAlertSchema = z
  .discriminatedUnion("alertType", [
    z.object({
      alertType: z.literal("TARGET_PRICE"),
      productSlug: slug,
      targetPrice: z.number().positive().finite(),
      returnTo: safeReturnTo.optional(),
    }),
    z.object({
      alertType: z.literal("PERCENTAGE_DROP"),
      productSlug: slug,
      targetPercentage: z.number().min(1).max(99).finite(),
      returnTo: safeReturnTo.optional(),
    }),
  ]);

export const alertIdSchema = z.object({
  alertId: uuid,
  returnTo: safeReturnTo.optional(),
});

export const followProductSchema = z.object({
  slug,
  offerKey: offerKey.optional().default(""),
  returnTo: safeReturnTo.optional(),
});

export const unfollowProductSchema = z.object({
  trackedProductId: uuid,
  returnTo: safeReturnTo.optional(),
});

export const reportProductSchema = z.object({
  productSlug: slug,
  offerKey: offerKey.optional().default(""),
  reason: z.string().trim().min(1).max(100),
  message: z.string().trim().max(2000).optional().default(""),
  returnTo: safeReturnTo.optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Ingresá un email válido."),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
  returnTo: safeReturnTo.optional(),
});

// Registro: más estricto que login (login no se endurece para no romper cuentas
// existentes con contraseñas viejas). Nombre real requerido + contraseña fuerte.
export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Ingresá tu nombre (al menos 2 caracteres).")
    .max(80, "El nombre es demasiado largo.")
    // Empieza y termina en letra; en el medio solo letras, marcas, espacios y . ' -
    // (rechaza < > & etc., defensa en profundidad contra inyección/XSS).
    .regex(/^[\p{L}\p{M}][\p{L}\p{M}\s.'-]*[\p{L}\p{M}]$/u, "Ingresá un nombre válido."),
  email: z.string().trim().email("Ingresá un email válido."),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres.")
    .regex(/[A-Za-z]/, "La contraseña debe incluir al menos una letra.")
    .regex(/\d/, "La contraseña debe incluir al menos un número."),
  returnTo: safeReturnTo.optional(),
});

export const pushSubscribeSchema = z.object({
  endpoint: z.string().url().max(2000),
  keys: z.object({
    p256dh: z.string().min(1).max(500),
    auth: z.string().min(1).max(500),
  }),
});

export const pushUnsubscribeSchema = z.object({
  endpoint: z.string().url().max(2000),
});

export const voteProductSchema = z.object({
  slug,
  value: z.coerce
    .number()
    .int()
    .refine((value) => value === 1 || value === -1, "Voto inválido"),
  returnTo: safeReturnTo.optional(),
});

export const reviewProductSchema = z.object({
  slug,
  rating: z.coerce.number().int().min(1).max(5),
  body: z.string().trim().min(10, "La reseña es muy corta.").max(1000),
  returnTo: safeReturnTo.optional(),
});
