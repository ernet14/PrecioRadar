"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function ShareButton({
  title,
  text,
  className,
}: {
  title: string;
  text?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const shareData = { title, text: text ?? title, url };

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // Cancelado o no disponible: caemos al copiado.
      }
    }

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Sin clipboard: no hay más fallback razonable.
      }
    }
  }

  return (
    <Button
      type="button"
      onClick={handleShare}
      className={className}
      size="lg"
      variant="ghost"
    >
      {copied ? "Enlace copiado" : "Compartir"}
    </Button>
  );
}
