import { headers } from "next/headers";
import { z } from "zod";
import { recordAuditEvent } from "@/services/auditLogService";
import { rateLimit } from "@/lib/ratelimit";

const noStoreHeaders = { "Cache-Control": "no-store" };

const consentSchema = z.object({
  analytics: z.boolean(),
  marketing: z.boolean(),
  essential: z.literal(true),
});

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  const { success } = await rateLimit("out", ip ?? "anonymous");
  if (!success) {
    return Response.json(
      { status: "error", reason: "rate_limited" },
      { headers: noStoreHeaders, status: 429 },
    );
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return Response.json(
      { status: "error", reason: "invalid_json" },
      { headers: noStoreHeaders, status: 400 },
    );
  }

  const parsed = consentSchema.safeParse(payload);

  if (!parsed.success) {
    return Response.json(
      { status: "error", reason: "invalid_payload" },
      { headers: noStoreHeaders, status: 400 },
    );
  }

  const userAgent = hdrs.get("user-agent");

  await recordAuditEvent({
    event: "cookies.consent",
    ip,
    metadata: { categories: parsed.data },
    resource: "cookies",
    userAgent,
  });

  return Response.json({ status: "ok" }, { headers: noStoreHeaders });
}
