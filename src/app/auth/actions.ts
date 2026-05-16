"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import {
  getSupabaseConfigErrorMessage,
  isSupabaseConfigured,
} from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { syncAuthUserToPrisma } from "@/services/userSyncService";
import { rateLimit } from "@/lib/ratelimit";
import type { AuthFormState } from "@/types/auth";

async function getIp() {
  const hdrs = await headers();
  return hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
}

function getStringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getSafeRedirectPath(value: string) {
  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
}

function validateCredentials(email: string, password: string): AuthFormState | null {
  if (!email || !email.includes("@")) {
    return {
      status: "error",
      message: "Ingresa un email valido.",
      fields: { email },
    };
  }

  if (password.length < 6) {
    return {
      status: "error",
      message: "La contrasena debe tener al menos 6 caracteres.",
      fields: { email },
    };
  }

  return null;
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
  const email = getStringValue(formData, "email").toLowerCase();
  const password = getStringValue(formData, "password");
  const nextPath = getSafeRedirectPath(getStringValue(formData, "next"));
  const validationError = validateCredentials(email, password);

  if (validationError) {
    return validationError;
  }

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
  redirect(nextPath);
}

export async function registerAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const name = getStringValue(formData, "name");
  const email = getStringValue(formData, "email").toLowerCase();
  const password = getStringValue(formData, "password");
  const nextPath = getSafeRedirectPath(getStringValue(formData, "next"));
  const validationError = validateCredentials(email, password);

  if (validationError) {
    return {
      ...validationError,
      fields: { ...validationError.fields, name },
    };
  }

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
  if (isSupabaseConfigured()) {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut();
  }

  redirect("/");
}
