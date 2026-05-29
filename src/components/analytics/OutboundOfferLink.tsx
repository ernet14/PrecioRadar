"use client";

import type { ReactNode } from "react";
import { trackEvent } from "@/lib/analytics/track";

// Link de salida a tienda. Mide store_click EN el click, antes de navegar a
// /api/out (que es un redirect server-side sin HTML donde no se puede taggear).
// Abre en pestaña nueva (target="_blank"), así la página actual no se descarga
// y el evento llega de forma confiable.
export function OutboundOfferLink({
  href,
  className,
  store,
  itemId,
  value,
  children,
}: {
  href: string;
  className?: string;
  store?: string;
  itemId?: string;
  value?: number;
  children: ReactNode;
}) {
  return (
    <a
      className={className}
      href={href}
      rel="noreferrer"
      target="_blank"
      onClick={() =>
        trackEvent("store_click", {
          store,
          item_id: itemId,
          value,
          currency: "ARS",
        })
      }
    >
      {children}
    </a>
  );
}
