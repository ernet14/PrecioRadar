import { type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { rateLimit } from "@/lib/ratelimit";
import { pushSubscribeSchema, pushUnsubscribeSchema } from "@/lib/validation/schemas";
import {
  deletePushSubscription,
  savePushSubscription,
} from "@/services/pushService";

export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store" };

function clientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
}

export async function POST(request: NextRequest) {
  const { success } = await rateLimit("out", clientIp(request));

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

  const parsed = pushSubscribeSchema.safeParse(payload);

  if (!parsed.success) {
    return Response.json(
      { status: "error", reason: "invalid_subscription" },
      { headers: noStoreHeaders, status: 400 },
    );
  }

  const user = await getCurrentUser();
  const result = await savePushSubscription({
    subscription: parsed.data,
    userId: user?.id ?? null,
    userAgent: request.headers.get("user-agent"),
  });

  if (result !== "saved") {
    return Response.json(
      { status: "error", reason: result },
      { headers: noStoreHeaders, status: 503 },
    );
  }

  return Response.json({ status: "ok" }, { headers: noStoreHeaders });
}

export async function DELETE(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json(
      { status: "error", reason: "invalid_json" },
      { headers: noStoreHeaders, status: 400 },
    );
  }

  const parsed = pushUnsubscribeSchema.safeParse(payload);

  if (!parsed.success) {
    return Response.json(
      { status: "error", reason: "invalid_endpoint" },
      { headers: noStoreHeaders, status: 400 },
    );
  }

  await deletePushSubscription(parsed.data.endpoint);

  return Response.json({ status: "ok" }, { headers: noStoreHeaders });
}
