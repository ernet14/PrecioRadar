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
