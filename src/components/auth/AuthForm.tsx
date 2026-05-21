"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { authFormInitialState, type AuthFormState } from "@/types/auth";

type AuthFormMode = "login" | "register";
type AuthAction = (
  previousState: AuthFormState,
  formData: FormData,
) => Promise<AuthFormState>;

type AuthFormProps = {
  action: AuthAction;
  mode: AuthFormMode;
  nextPath?: string;
};

const modeCopy = {
  login: {
    title: "Ingresar",
    description: "Accede para preparar productos seguidos, alertas y dashboard.",
    submit: "Ingresar",
    pending: "Ingresando...",
    switchText: "No tenes cuenta?",
    switchHref: "/registro",
    switchLabel: "Registrate",
  },
  register: {
    title: "Crear cuenta",
    description: "Usá tu nombre, email y una contraseña segura.",
    submit: "Registrarme",
    pending: "Creando cuenta...",
    switchText: "Ya tenes cuenta?",
    switchHref: "/login",
    switchLabel: "Ingresa",
  },
} satisfies Record<AuthFormMode, Record<string, string>>;

function SubmitButton({
  pendingText,
  submitText,
}: {
  submitText: string;
  pendingText: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button className="w-full" disabled={pending} type="submit">
      {pending ? pendingText : submitText}
    </Button>
  );
}

export function AuthForm({ action, mode, nextPath = "/dashboard" }: AuthFormProps) {
  const [state, formAction] = useActionState(action, authFormInitialState);
  const copy = modeCopy[mode];

  return (
    <Card className="mx-auto w-full max-w-md p-6 sm:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-normal text-slate-950">
          {copy.title}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">{copy.description}</p>
      </div>

      <form action={formAction} className="space-y-4">
        <input name="next" type="hidden" value={nextPath} />

        {mode === "register" ? (
          <div>
            <label className="text-sm font-medium text-slate-700" htmlFor="name">
              Nombre
            </label>
            <input
              autoComplete="name"
              className="mt-2 h-12 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
              defaultValue={state.fields?.name ?? ""}
              id="name"
              minLength={2}
              name="name"
              placeholder="Tu nombre y apellido"
              required
              type="text"
            />
          </div>
        ) : null}

        <div>
          <label className="text-sm font-medium text-slate-700" htmlFor="email">
            Email
          </label>
          <input
            autoComplete="email"
            className="mt-2 h-12 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
            defaultValue={state.fields?.email ?? ""}
            id="email"
            name="email"
            placeholder="tu@email.com"
            required
            type="email"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700" htmlFor="password">
            Contraseña
          </label>
          <input
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            className="mt-2 h-12 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
            id="password"
            minLength={mode === "register" ? 8 : 6}
            name="password"
            placeholder={mode === "register" ? "Minimo 8 caracteres" : "Tu contraseña"}
            required
            type="password"
          />
          {mode === "register" ? (
            <p className="mt-1 text-xs text-slate-500">
              Al menos 8 caracteres, con letras y números.
            </p>
          ) : null}
        </div>

        {state.message ? (
          <p
            aria-live="polite"
            className={cn(
              "rounded-lg border px-4 py-3 text-sm leading-6",
              state.status === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-red-200 bg-red-50 text-red-900",
            )}
          >
            {state.message}
          </p>
        ) : null}

        <SubmitButton pendingText={copy.pending} submitText={copy.submit} />
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        {copy.switchText}{" "}
        <Link className="font-semibold text-emerald-700 hover:text-emerald-800" href={copy.switchHref}>
          {copy.switchLabel}
        </Link>
      </p>
    </Card>
  );
}
