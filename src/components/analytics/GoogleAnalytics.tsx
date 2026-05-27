"use client";

import { useSyncExternalStore } from "react";
import Script from "next/script";
import { CONSENT_EVENT, readConsent } from "@/lib/consent";

// ID de medición de GA4. Es público (viaja en el HTML del cliente), no un secreto;
// se puede override por entorno sin tocar código.
const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? "G-95LPD91C5Y";

// Suscripción al consentimiento como store externo: el banner dispara CONSENT_EVENT
// al guardar, así GA arranca (o no) sin recargar la página.
function subscribe(onChange: () => void) {
  window.addEventListener(CONSENT_EVENT, onChange);
  return () => window.removeEventListener(CONSENT_EVENT, onChange);
}

function getAnalyticsConsent() {
  return readConsent()?.analytics === true;
}

// En SSR no hay cookie disponible: nunca renderizamos GA en el servidor.
function getServerSnapshot() {
  return false;
}

// Carga Google Analytics solo si el usuario aceptó analytics en el banner de cookies.
export function GoogleAnalytics() {
  const enabled = useSyncExternalStore(
    subscribe,
    getAnalyticsConsent,
    getServerSnapshot,
  );

  if (!GA_ID || !enabled) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}');
        `}
      </Script>
    </>
  );
}
