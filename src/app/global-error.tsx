"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", {
      digest: error.digest,
      message: error.message,
      name: error.name,
    });
  }, [error]);

  return (
    <html lang="es-AR">
      <body
        style={{
          backgroundColor: "#f8fafc",
          color: "#0f172a",
          fontFamily: "Arial, sans-serif",
          margin: 0,
          minHeight: "100vh",
        }}
      >
        <main
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "32px",
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: "48px", margin: 0 }}>⚠️</p>
          <h1 style={{ fontSize: "24px", fontWeight: 700, marginTop: "16px" }}>
            Algo se rompió en PrecioRadar
          </h1>
          <p
            style={{
              color: "#475569",
              fontSize: "15px",
              marginTop: "12px",
              maxWidth: "440px",
            }}
          >
            Si vuelve a pasar, escribinos a privacidad@precioradar.com.ar con
            el código de error.
          </p>
          {error.digest ? (
            <p
              style={{
                color: "#94a3b8",
                fontFamily: "monospace",
                fontSize: "12px",
                marginTop: "12px",
              }}
            >
              error: {error.digest}
            </p>
          ) : null}
          <button
            onClick={reset}
            style={{
              backgroundColor: "#0f172a",
              border: "none",
              borderRadius: "8px",
              color: "white",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: 600,
              marginTop: "24px",
              padding: "12px 20px",
            }}
            type="button"
          >
            Reintentar
          </button>
        </main>
      </body>
    </html>
  );
}
