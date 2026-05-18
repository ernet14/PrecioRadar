"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import {
  getSupabaseConfigErrorMessage,
  isSupabaseConfigured,
} from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { syncAuthUserToPrisma } from "@/services/userSyncService";
import { recordAuditEvent } from "@/services/auditLogService";
import { getCurrentUser } from "@/lib/supabase/auth";
import { rateLimit } from "@/lib/ratelimit";
import { loginSchema } from "@/lib/validation/schemas";
import type { AuthFormState } from "@/types/auth";

async function getIp() {
  const hdrs = await headers();
  return hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
}

async function getUserAgent() {
  const hdrs = await headers();
  return hdrs.get("user-agent");
}

function getSafeRedirectPath(value: string) {
  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
}

function mapAuthError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("invalid login credentials")) {
    return "Email o contrasena incorrectos.";
  }

  if (normalized.includes("email not confirmed")) {
    return "Tenes que confirmar tu email antes de ingresar.";
  }

  if (normalized.includes("user already registered")) {
    return "Ya existe una cuenta con ese email.";
  }

  return message || "No pudimos completar la operacion.";
}

export async function loginAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    const email = String(formData.get("email") ?? "").trim();
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Datos inválidos.",
      fields: { email },
    };
  }

  const { email: rawEmail, password } = parsed.data;
  const email = rawEmail.toLowerCase();
  const nextPath = getSafeRedirectPath(String(formData.get("next") ?? "").trim());

  const ip = await getIp();
  const { success } = await rateLimit("login", ip);

  if (!success) {
    return {
      status: "error",
      message: "Demasiados intentos. Esperá un minuto antes de reintentar.",
      fields: { email },
    };
  }

  if (!isSupabaseConfigured()) {
    return {
      status: "error",
      message: getSupabaseConfigErrorMessage(),
      fields: { email },
    };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      status: "error",
      message: mapAuthError(error.message),
      fields: { email },
    };
  }

  await syncAuthUserToPrisma(data.user);
  await recordAuditEvent({
    actorEmail: data.user?.email ?? email,
    actorId: data.user?.id ?? null,
    event: "auth.login",
    ip,
    userAgent: await getUserAgent(),
  });
  redirect(nextPath);
}

export async function registerAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  const name = String(formData.get("name") ?? "").trim();

  if (!parsed.success) {
    const email = String(formData.get("email") ?? "").trim();
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Datos inválidos.",
      fields: { email, name },
    };
  }

  const { email: rawEmail, password } = parsed.data;
  const email = rawEmail.toLowerCase();
  const nextPath = getSafeRedirectPath(String(formData.get("next") ?? "").trim());

  const ip = await getIp();
  const { success } = await rateLimit("register", ip);

  if (!success) {
    return {
      status: "error",
      message: "Demasiados intentos de registro. Intentá de nuevo en una hora.",
      fields: { email, name },
    };
  }

  if (!isSupabaseConfigured()) {
    return {
      status: "error",
      message: getSupabaseConfigErrorMessage(),
      fields: { email, name },
    };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: name ? { name } : undefined,
    },
  });

  if (error) {
    return {
      status: "error",
      message: mapAuthError(error.message),
      fields: { email, name },
    };
  }

  await recordAuditEvent({
    actorEmail: data.user?.email ?? email,
    actorId: data.user?.id ?? null,
    event: "auth.register",
    ip,
    metadata: { confirmed: Boolean(data.session) },
    userAgent: await getUserAgent(),
  });

  if (!data.session) {
    return {
      status: "success",
      message:
        "Cuenta creada. Revisa tu email para confirmar el registro antes de ingresar.",
      fields: { email, name },
    };
  }

  await syncAuthUserToPrisma(data.user, name);
  redirect(nextPath);
}

export async function logoutAction() {
  const currentUser = await getCurrentUser();

  if (isSupabaseConfigured()) {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut();
  }

  if (currentUser) {
    await recordAuditEvent({
      actorEmail: currentUser.email ?? null,
      actorId: currentUser.id,
      event: "auth.logout",
      ip: await getIp(),
      userAgent: await getUserAgent(),
    });
  }

  redirect("/");
}
