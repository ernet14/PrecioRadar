import { randomBytes } from "node:crypto";
import { requireAdmin } from "@/lib/supabase/auth";
import { buildAuthorizationUrl } from "@/lib/mercadolibre/oauth";

export const dynamic = "force-dynamic";

const stateCookieName = "ml_oauth_state";
const stateCookieMaxAgeSec = 10 * 60;

export async function GET() {
  await requireAdmin();

  const state = randomBytes(32).toString("hex");
  const authorizationUrl = buildAuthorizationUrl(state);
  if (!authorizationUrl) {
    return new Response(
      "MercadoLibre OAuth no esta configurado. Faltan CLIENT_ID, CLIENT_SECRET o REDIRECT_URI.",
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  const secureCookie = process.env.NODE_ENV === "production";
  const cookieParts = [
    `${stateCookieName}=${state}`,
    "Path=/api/auth/mercadolibre",
    `Max-Age=${stateCookieMaxAgeSec}`,
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (secureCookie) cookieParts.push("Secure");

  return new Response(null, {
    status: 302,
    headers: {
      Location: authorizationUrl,
      "Set-Cookie": cookieParts.join("; "),
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}
