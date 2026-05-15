import { getPrismaClient } from "@/lib/prisma";
import type { InputType, SearchResult } from "@/types";

export type RecordSearchLogResult =
  | { status: "logged" }
  | { status: "skipped"; reason: string }
  | { status: "error"; reason: string };

const missingDatabaseReason =
  "Falta configurar DATABASE_URL o DIRECT_URL con la conexion Postgres de Supabase.";

export function getSearchLogCategorySlug(result: SearchResult) {
  const candidates = [...result.exactMatches, ...result.similarMatches];
  const categoryId = candidates.find(
    (item) => item.product.categoryId && item.product.categoryId !== "demo",
  )?.product.categoryId;

  return categoryId ?? null;
}

async function getExistingUserId(userId: string | null | undefined) {
  if (!userId) {
    return null;
  }

  const prisma = getPrismaClient();

  if (!prisma) {
    return null;
  }

  const user = await prisma.user.findUnique({
    select: { id: true },
    where: { id: userId },
  });

  return user?.id ?? null;
}

async function getCategoryId(categorySlug: string | null | undefined) {
  if (!categorySlug) {
    return null;
  }

  const prisma = getPrismaClient();

  if (!prisma) {
    return null;
  }

  const category = await prisma.category.findUnique({
    select: { id: true },
    where: { slug: categorySlug },
  });

  return category?.id ?? null;
}

export async function recordSearchLog({
  detectedType,
  query,
  categorySlug,
  userId,
}: {
  detectedType: InputType;
  query: string;
  categorySlug?: string | null;
  userId?: string | null;
}): Promise<RecordSearchLogResult> {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return { status: "skipped", reason: "empty_query" };
  }

  const prisma = getPrismaClient();

  if (!prisma) {
    return { status: "skipped", reason: missingDatabaseReason };
  }

  try {
    const [existingUserId, categoryId] = await Promise.all([
      getExistingUserId(userId),
      getCategoryId(categorySlug),
    ]);

    await prisma.searchLog.create({
      data: {
        categoryId,
        detectedType,
        query: normalizedQuery,
        userId: existingUserId,
      },
    });

    return { status: "logged" };
  } catch (error) {
    console.error("Unable to record search log.", error);
    return {
      status: "error",
      reason: "No pudimos registrar la busqueda.",
    };
  }
}
