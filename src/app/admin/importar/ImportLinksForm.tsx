"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { createImportDraftsAction } from "./actions";

const textareaClass =
  "mt-2 min-h-44 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100";

export function ImportLinksForm() {
  const [links, setLinks] = useState("");
  const [clipboardError, setClipboardError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function pasteFromClipboard() {
    setClipboardError(null);

    startTransition(async () => {
      try {
        const text = await navigator.clipboard.readText();
        setLinks((current) => [current, text].filter(Boolean).join("\n"));
      } catch {
        setClipboardError("No pudimos leer el portapapeles desde el navegador.");
      }
    });
  }

  return (
    <form action={createImportDraftsAction}>
      <label className="block text-sm font-semibold text-slate-700" htmlFor="product-links">
        Links de producto
      </label>
      <textarea
        className={textareaClass}
        id="product-links"
        name="links"
        onChange={(event) => setLinks(event.target.value)}
        placeholder="Pega uno o varios links, uno por linea."
        value={links}
      />
      {clipboardError ? (
        <p className="mt-2 text-sm font-medium text-rose-700">{clipboardError}</p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-3">
        <Button
          disabled={pending}
          onClick={pasteFromClipboard}
          type="button"
          variant="secondary"
        >
          {pending ? "Leyendo..." : "Pegar desde portapapeles"}
        </Button>
        <Button disabled={links.trim().length === 0} type="submit">
          Crear borradores
        </Button>
      </div>
    </form>
  );
}
