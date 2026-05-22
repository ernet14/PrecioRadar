import React from "react";

interface LogoProps {
  iconOnly?: boolean;
  className?: string;
}

export function Logo({ iconOnly = false, className = "" }: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Isotipo: Radar Clásico de Datos (Monocromático, Limpio y Técnico) */}
      <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 text-white shadow-[0_8px_20px_-6px_rgba(79,70,229,0.5)]">
        {/* Borde sutil interno */}
        <span className="absolute inset-0.5 rounded-[10px] border border-white/20" />

        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 36 36"
          className="h-6 w-6"
          fill="none"
        >
          {/* Círculo de radar exterior */}
          <circle
            cx="18"
            cy="18"
            r="14"
            stroke="currentColor"
            strokeWidth="2"
            strokeOpacity="0.3"
          />

          {/* Círculo de radar medio */}
          <circle
            cx="18"
            cy="18"
            r="9"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeOpacity="0.2"
            strokeDasharray="2 2"
          />

          {/* Círculo de radar central */}
          <circle
            cx="18"
            cy="18"
            r="4"
            stroke="currentColor"
            strokeWidth="1"
            strokeOpacity="0.15"
          />

          {/* Cruz de ejes de precisión */}
          <line
            x1="18"
            y1="4"
            x2="18"
            y2="32"
            stroke="currentColor"
            strokeWidth="1"
            strokeOpacity="0.15"
          />
          <line
            x1="4"
            y1="18"
            x2="32"
            y2="18"
            stroke="currentColor"
            strokeWidth="1"
            strokeOpacity="0.15"
          />

          {/* Línea de barrido del radar principal */}
          <line
            x1="18"
            y1="18"
            x2="28"
            y2="8"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            className="text-white"
          />

          {/* Rastro de barrido secundario (efecto movimiento) */}
          <line
            x1="18"
            y1="18"
            x2="30"
            y2="13"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeOpacity="0.5"
          />
          <line
            x1="18"
            y1="18"
            x2="31"
            y2="19"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeOpacity="0.2"
          />

          {/* Precios detectados (Puntos blancos monocromáticos con diferentes opacidades) */}
          <circle
            cx="27"
            cy="9"
            r="1.8"
            fill="currentColor"
            fillOpacity="0.9"
          />
          <circle
            cx="11"
            cy="24"
            r="1.5"
            fill="currentColor"
            fillOpacity="0.4"
          />
          <circle
            cx="24"
            cy="26"
            r="1.8"
            fill="currentColor"
            fillOpacity="0.2"
          />
        </svg>
      </span>

      {/* Wordmark (Texto) */}
      {!iconOnly && (
        <span className="font-sans text-lg font-bold tracking-tight text-slate-900 leading-none">
          Precio<span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">Radar</span>
        </span>
      )}
    </div>
  );
}
