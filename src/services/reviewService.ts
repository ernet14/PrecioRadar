import { getPrismaClient } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ensureProductForSlug } from "@/services/trackedProductService";

// Etapa 16 — reseñas de producto (rating 1..5 + comentario) con moderación.
// La moderación es local (longitud, spam, lenguaje), suficiente para el MVP;
// se puede enchufar la OpenAI Moderation API más adelante.

// Antigüedad mínima de cuenta para reseñar (anti-spam). En beta queda en 0
// (solo requiere login); subir a 7 cuando haya escala.
const MIN_ACCOUNT_AGE_DAYS = 0;
const MIN_BODY_LENGTH = 10;
const MAX_BODY_LENGTH = 1000;

// Lista mínima de términos bloqueados (insultos / spam evidente).
const BANNED_TERMS = [
  "puto", "puta", "mierda", "concha", "forro", "imbecil", "imbécil",
  "estafa garantizada", "viagra", "casino", "porn",
];

export type ModerationResult = { ok: true } | { ok: false; reason: string };

export function moderateReviewBody(body: string): ModerationResult {
  const text = body.trim();

  if (text.length < MIN_BODY_LENGTH) {
    return { ok: false, reason: "La reseña es muy corta (mínimo 10 caracteres)." };
  }

  if (text.length > MAX_BODY_LENGTH) {
    return { ok: false, reason: "La reseña es muy larga (máximo 1000 caracteres)." };
  }

  if (/https?:\/\/|www\.|\b\S+@\S+\.\S+/i.test(text)) {
    return { ok: false, reason: "No se permiten enlaces ni datos de contacto." };
  }

  const lower = text.toLowerCase();
  if (BANNED_TERMS.some((term) => lower.includes(term))) {
    return { ok: false, reason: "La reseña contiene lenguaje no permitido." };
  }

  // Spam: misma palabra/caracter repetido en exceso.
  if (/(.)\1{9,}/.test(text)) {
    return { ok: false, reason: "La reseña parece spam." };
  }

  return { ok: true };
}

export type CreateReviewResult =
  | { status: "created" }
  | { status: "rejected"; reason: string }
  | { status: "too_new" }
  | { status: "invalid_rating" }
  | { status: "not_found" }
  | { status: "database_unavailable" }
  | { status: "error" };

export async function createReview({
  userId,
  slug,
  rating,
  body,
}: {
  userId: string;
  slug: string;
  rating: number;
  body: string;
}): Promise<CreateReviewResult> {
  const prisma = getPrismaClient();

  if (!prisma) return { status: "database_unavailable" };

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { status: "invalid_rating" };
  }

  const moderation = moderateReviewBody(body);
  if (!moderation.ok) {
    return { status: "rejected", reason: moderation.reason };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true },
    });

    if (user && MIN_ACCOUNT_AGE_DAYS > 0) {
      const ageMs = Date.now() - user.createdAt.getTime();
      if (ageMs < MIN_ACCOUNT_AGE_DAYS * 24 * 60 * 60 * 1000) {
        return { status: "too_new" };
      }
    }

    const product = await ensureProductForSlug(slug);
    if (!product) return { status: "not_found" };

    await prisma.productReview.upsert({
      where: { productId_userId: { productId: product.id, userId } },
      create: { productId: product.id, userId, rating, body: body.trim(), status: "APPROVED" },
      update: { rating, body: body.trim(), status: "APPROVED" },
    });

    return { status: "created" };
  } catch (error) {
    logger.error("Unable to create review.", { error });
    return { status: "error" };
  }
}

export type ReviewListItem = {
  id: string;
  authorName: string;
  authorReputation: number;
  rating: number;
  body: string;
  createdAt: Date;
};

function authorAlias(name: string | null): string {
  return name?.trim() || "Usuario verificado";
}

export async function listProductReviews(slug: string): Promise<ReviewListItem[]> {
  const prisma = getPrismaClient();

  if (!prisma) return [];

  try {
    const product = await prisma.product.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!product) return [];

    const reviews = await prisma.productReview.findMany({
      where: { productId: product.id, status: "APPROVED" },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // Reputación mínima (karma): reseñas aprobadas por autor.
    const reputationGroups = await prisma.productReview.groupBy({
      by: ["userId"],
      where: { userId: { in: reviews.map((r) => r.user.id) }, status: "APPROVED" },
      _count: { _all: true },
    });
    const reputationByUser = new Map(
      reputationGroups.map((group) => [group.userId, group._count._all]),
    );

    return reviews.map((review) => ({
      id: review.id,
      authorName: authorAlias(review.user.name),
      authorReputation: reputationByUser.get(review.user.id) ?? 1,
      rating: review.rating,
      body: review.body,
      createdAt: review.createdAt,
    }));
  } catch (error) {
    logger.error("Unable to list reviews.", { error });
    return [];
  }
}

export type ReviewSummary = { average: number; count: number };

export function aggregateRatings(ratings: number[]): ReviewSummary {
  if (ratings.length === 0) return { average: 0, count: 0 };
  const sum = ratings.reduce((total, value) => total + value, 0);
  return { average: Math.round((sum / ratings.length) * 10) / 10, count: ratings.length };
}

export async function getReviewSummary(slug: string): Promise<ReviewSummary> {
  const prisma = getPrismaClient();

  if (!prisma) return { average: 0, count: 0 };

  try {
    const product = await prisma.product.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!product) return { average: 0, count: 0 };

    const reviews = await prisma.productReview.findMany({
      where: { productId: product.id, status: "APPROVED" },
      select: { rating: true },
    });

    return aggregateRatings(reviews.map((review) => review.rating));
  } catch (error) {
    logger.error("Unable to load review summary.", { error });
    return { average: 0, count: 0 };
  }
}
