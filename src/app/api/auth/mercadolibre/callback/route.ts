import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { exchangeCodeForTokens } from "@/lib/mercadolibre/oauth";
import { recordProviderLog } from "@/services/providerLogService";

export const dynamic = "force-dynamic";

const stateCookieName = "ml_oauth_state";

function constantTimeEquals(a: string, b: string) {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const cookieStore = await cookies();
  const stateCookie = cookieStore.get(stateCookieName)?.value ?? null;
  cookieStore.delete({ name: stateCookieName, path: "/api/auth/mercadolibre" });

  if (error) {
    await recordProviderLog({
      action: "oauth.callbackError",
      errorMessage: `MercadoLibre devolvio error=${error}`,
      provider: "mercadolibre",
      status: "failed",
      storeSlug: "mercadolibre",
    });
    redirect("/admin?meli=denied");
  }

  if (!code || !state || !stateCookie || !constantTimeEquals(state, stateCookie)) {
    await recordProviderLog({
      action: "oauth.callbackError",
      errorMessage: "State invalido o code faltante en callback de MercadoLibre.",
      provider: "mercadolibre",
      status: "failed",
      storeSlug: "mercadolibre",
    });
    redirect("/admin?meli=state-mismatch");
  }

  const tokens = await exchangeCodeForTokens(code);
  if (!tokens) {
    redirect("/admin?meli=exchange-failed");
  }

  redirect("/admin?meli=ok");
}
