import { getPrismaClient } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ensureProductForSlug } from "@/services/trackedProductService";

// Etapa 16 — votos comunitarios "¿esta oferta es real?" (👍 = real, 👎 = no real).
// Capa comunitaria sobre el detector algorítmico de la Etapa 12.

export type VoteValue = 1 | -1;

export type VoteSummary = {
  real: number;
  fake: number;
  total: number;
  myVote: VoteValue | null;
};

export type CastVoteResult =
  | { status: "voted"; summary: VoteSummary }
  | { status: "not_found" }
  | { status: "database_unavailable" }
  | { status: "error" };

const EMPTY_SUMMARY: VoteSummary = { real: 0, fake: 0, total: 0, myVote: null };

/** Tally puro de una lista de valores de voto (1 / -1). */
export function summarizeVotes(values: number[]): { real: number; fake: number; total: number } {
  const real = values.filter((value) => value > 0).length;
  const fake = values.filter((value) => value < 0).length;
  return { real, fake, total: real + fake };
}

export async function getVoteSummary({
  slug,
  userId,
}: {
  slug: string;
  userId?: string | null;
}): Promise<VoteSummary> {
  const prisma = getPrismaClient();

  if (!prisma) return EMPTY_SUMMARY;

  try {
    const product = await prisma.product.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!product) return EMPTY_SUMMARY;

    const votes = await prisma.productVote.findMany({
      where: { productId: product.id },
      select: { value: true, userId: true },
    });

    const { real, fake, total } = summarizeVotes(votes.map((vote) => vote.value));
    const myVote = userId
      ? (votes.find((vote) => vote.userId === userId)?.value ?? null)
      : null;

    return { real, fake, total, myVote: myVote === 1 || myVote === -1 ? myVote : null };
  } catch (error) {
    logger.error("Unable to load vote summary.", { error });
    return EMPTY_SUMMARY;
  }
}

export async function castVote({
  userId,
  slug,
  value,
}: {
  userId: string;
  slug: string;
  value: VoteValue;
}): Promise<CastVoteResult> {
  const prisma = getPrismaClient();

  if (!prisma) return { status: "database_unavailable" };

  try {
    const product = await ensureProductForSlug(slug);

    if (!product) return { status: "not_found" };

    await prisma.productVote.upsert({
      where: { productId_userId: { productId: product.id, userId } },
      create: { productId: product.id, userId, value },
      update: { value },
    });

    const summary = await getVoteSummary({ slug, userId });
    return { status: "voted", summary };
  } catch (error) {
    logger.error("Unable to cast vote.", { error });
    return { status: "error" };
  }
}
