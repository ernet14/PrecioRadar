import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { Container } from "@/components/layout/Container";
import { loginAction } from "@/app/auth/actions";
import { getCurrentUser } from "@/lib/supabase/auth";

type LoginPageProps = {
  searchParams: Promise<{ next?: string | string[] }>;
};

export const metadata: Metadata = {
  title: "Ingresar",
  robots: { follow: false, index: false },
};

function getSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function getSafeNextPath(value: string) {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const nextPath = getSafeNextPath(getSearchParam(params.next));

  return (
    <main className="bg-slate-50 py-10 text-slate-950 sm:py-16">
      <Container>
        <AuthForm action={loginAction} mode="login" nextPath={nextPath} />
      </Container>
    </main>
  );
}
