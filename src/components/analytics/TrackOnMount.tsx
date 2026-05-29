"use client";

import { useEffect, useRef } from "react";
import { trackEvent, type TrackParams } from "@/lib/analytics/track";

// Dispara un evento de GA4 una sola vez al montar. Sirve para eventos ligados al
// renderizado de una página (view_item, search, sign_up, etc.) sin tener que
// convertir el server component contenedor en cliente.
export function TrackOnMount({
  event,
  params,
}: {
  event: string;
  params?: TrackParams;
}) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    trackEvent(event, params);
  }, [event, params]);

  return null;
}
