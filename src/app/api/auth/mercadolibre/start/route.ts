import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/auth";
import { buildAuthorizationUrl } from "@/lib/mercadolibre/oauth";

export const dynamic = "force-dynamic";

const stateCookieName = "ml_oauth_state";
const stateCookieMaxAgeSec = 10 * 60;

export async function GET() {
  await requireAdmin();

  const authorizationUrl = buildAuthorizationUrl("__placeholder__");
  if (!authorizationUrl) {
    return new Response(
      "MercadoLibre OAuth no esta configurado. Faltan CLIENT_ID, CLIENT_SECRET o REDIRECT_URI.",
      { status: 500 },
    );
  }

  const state = randomBytes(32).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set({
    name: stateCookieName,
    value: state,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth/mercadolibre",
    maxAge: stateCookieMaxAgeSec,
  });

  const finalUrl = authorizationUrl.replace(
    "state=__placeholder__",
    `state=${encodeURIComponent(state)}`,
  );

  redirect(finalUrl);
}
