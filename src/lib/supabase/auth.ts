import { redirect } from "next/navigation";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AppUserRole = "USER" | "ADMIN";

function normalizeRole(value: unknown): AppUserRole | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  return normalized === "ADMIN" ? "ADMIN" : normalized === "USER" ? "USER" : null;
}

export function getUserRole(user: SupabaseUser | null): AppUserRole {
  if (!user) {
    return "USER";
  }

  return (
    normalizeRole(user.app_metadata?.role) ??
    normalizeRole(user.app_metadata?.user_role) ??
    "USER"
  );
}

export async function getCurrentUser() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      return null;
    }

    return user;
  } catch {
    return null;
  }
}

export async function requireUser(nextPath = "/dashboard") {
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  return user;
}

// Allowlist de emails admin (env ADMIN_EMAILS, separados por coma).
// En producción es obligatoria: el rol debe venir de app_metadata y el email
// debe estar explícitamente autorizado.
function getAdminEmailAllowlist(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdmin(user: SupabaseUser | null): boolean {
  if (!user) return false;

  const allowlist = getAdminEmailAllowlist();
  const email = user.email?.toLowerCase() ?? "";
  const passesAllowlist = allowlist.includes(email);

  if (process.env.NODE_ENV === "production" && allowlist.length === 0) {
    return false;
  }

  return getUserRole(user) === "ADMIN" && (allowlist.length === 0 || passesAllowlist);
}

export async function requireAdmin() {
  const user = await requireUser("/admin");

  if (!isAdmin(user)) {
    redirect("/dashboard?error=admin");
  }

  return user;
}
