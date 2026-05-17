"use client";

import { useActionState, useEffect, useRef } from "react";
import { subscribeToNewsletter } from "@/app/newsletter/actions";

const initial = { status: "idle" as const, message: "" };

export function NewsletterForm({ source = "guide" }: { source?: string }) {
  const [state, action, pending] = useActionState(subscribeToNewsletter, initial);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.status === "success" && inputRef.current) {
      inputRef.current.value = "";
    }
  }, [state.status]);

  return (
    <form action={action} className="mt-4">
      <input type="hidden" name="source" value={source} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          ref={inputRef}
          type="email"
          name="email"
          required
          placeholder="tu@email.com"
          className="h-11 flex-1 rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-950 placeholder-slate-400 outline-none ring-blue-500 focus:ring-2"
        />
        <button
          type="submit"
          disabled={pending}
          className="h-11 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? "Suscribiendo..." : "Suscribirse gratis"}
        </button>
      </div>
      {state.message && (
        <p
          className={`mt-2 text-sm font-medium ${
            state.status === "success"
              ? "text-emerald-700"
              : state.status === "duplicate"
                ? "text-slate-500"
                : "text-red-600"
          }`}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
