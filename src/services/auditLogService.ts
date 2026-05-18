import { createHash } from "node:crypto";
import { getPrismaClient } from "@/lib/prisma";

export type AuditEvent =
  | "auth.login"
  | "auth.logout"
  | "auth.register"
  | "auth.password_change"
  | "account.delete"
  | "alert.create_burst"
  | "newsletter.subscribe"
  | "newsletter.unsubscribe"
  | "admin.promo_update"
  | "admin.report_update";

export type AuditMetadata = Record<string, unknown>;

export type RecordAuditResult =
  | { status: "logged" }
  | { status: "skipped"; reason: string }
  | { status: "error"; reason: string };

function hashIp(ip: string | null | undefined): string | null {
  const trimmed = ip?.trim();
  if (!trimmed) return null;

  const salt = process.env.AUDIT_IP_HASH_SALT ?? "precioradar-default-salt";
  return createHash("sha256").update(`${salt}:${trimmed}`).digest("hex");
}

function truncate(value: string | null | undefined, max: number) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed.length > max ? trimmed.slice(0, max - 3) + "..." : trimmed;
}

export async function recordAuditEvent({
  actorEmail,
  actorId,
  event,
  ip,
  metadata,
  resource,
  resourceId,
  userAgent,
}: {
  event: AuditEvent;
  actorId?: string | null;
  actorEmail?: string | null;
  resource?: string | null;
  resourceId?: string | null;
  metadata?: AuditMetadata | null;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<RecordAuditResult> {
  const prisma = getPrismaClient();

  if (!prisma) {
    return { status: "skipped", reason: "DATABASE_URL no configurado." };
  }

  try {
    await prisma.auditLog.create({
      data: {
        actorEmail: truncate(actorEmail, 320),
        actorId: actorId ?? null,
        event,
        ipHash: hashIp(ip),
        metadata: (metadata ?? null) as never,
        resource: truncate(resource, 100),
        resourceId: truncate(resourceId, 200),
        userAgent: truncate(userAgent, 500),
      },
    });

    return { status: "logged" };
  } catch (error) {
    console.error("Unable to record audit log entry.", error);
    return {
      status: "error",
      reason: "No pudimos registrar el evento de auditoría.",
    };
  }
}
