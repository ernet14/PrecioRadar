import type { User as SupabaseUser } from "@supabase/supabase-js";
import { getPrismaClient } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export type UserSyncResult =
  | { status: "synced" }
  | { status: "skipped"; reason: string }
  | { status: "error"; reason: string };

function getDisplayName(user: SupabaseUser, nameOverride?: string) {
  const override = nameOverride?.trim();

  if (override) {
    return override;
  }

  const metadataName = user.user_metadata?.name;
  return typeof metadataName === "string" && metadataName.trim()
    ? metadataName.trim()
    : null;
}

export async function syncAuthUserToPrisma(
  user: SupabaseUser | null,
  nameOverride?: string,
): Promise<UserSyncResult> {
  if (!user?.id || !user.email) {
    return { status: "skipped", reason: "Supabase user without id or email." };
  }

  const prisma = getPrismaClient();

  if (!prisma) {
    return {
      status: "skipped",
      reason: "DATABASE_URL is not configured; Prisma user sync is pending.",
    };
  }

  const name = getDisplayName(user, nameOverride);

  try {
    await prisma.user.upsert({
      where: { id: user.id },
      update: name ? { email: user.email, name } : { email: user.email },
      create: {
        id: user.id,
        email: user.email,
        name,
      },
    });

    return { status: "synced" };
  } catch (error) {
    logger.error("Unable to sync Supabase user with Prisma User model.", {
      error,
      route: "userSyncService.syncAuthUserToPrisma",
    });
    return {
      status: "error",
      reason: "Prisma user sync failed; auth session remains valid.",
    };
  }
}
