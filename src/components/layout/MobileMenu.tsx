"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { logoutAction } from "@/app/auth/actions";

const navLinks = [
  { href: "/#buscar", label: "Buscar" },
  { href: "/#categorias", label: "Categorías" },
  { href: "/guias", label: "Guías" },
  { href: "/promos-hoy", label: "Promos" },
  { href: "/como-funciona", label: "Cómo funciona" },
];

const panelLinkClass =
  "flex h-11 items-center rounded-lg px-3 text-sm font-semibold text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-700";

type MobileMenuProps = {
  isAuthenticated: boolean;
  isAdminUser: boolean;
};

export function MobileMenu({ isAuthenticated, isAdminUser }: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Evita scroll de fondo mientras el panel está abierto.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    const trigger = triggerRef.current;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    const focusFrame = window.requestAnimationFrame(() => {
      firstLinkRef.current?.focus();
    });

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", handleKeyDown);
      trigger?.focus();
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className="md:hidden">
      <button
        aria-controls="mobile-menu-panel"
        aria-expanded={open}
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        className="inline-flex size-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-indigo-300 hover:text-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
        onClick={() => setOpen((value) => !value)}
        ref={triggerRef}
        type="button"
      >
        <svg
          aria-hidden
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          {open ? (
            <path d="M6 6 18 18M6 18 18 6" />
          ) : (
            <>
              <path d="M4 7h16" />
              <path d="M4 12h16" />
              <path d="M4 17h16" />
            </>
          )}
        </svg>
      </button>

      {open ? (
        <>
          <button
            aria-hidden
            className="fixed inset-0 top-16 z-40 cursor-default bg-slate-950/20 backdrop-blur-sm"
            onClick={close}
            tabIndex={-1}
            type="button"
          />
          <div
            className="absolute inset-x-0 top-full z-50 border-b border-slate-200 bg-white shadow-[0_24px_50px_-20px_rgba(8,11,30,0.35)]"
            id="mobile-menu-panel"
          >
            <nav
              aria-label="Navegación principal"
              className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-5 py-4"
            >
              {navLinks.map((link, index) => (
                <Link
                  className={panelLinkClass}
                  href={link.href}
                  key={link.href}
                  onClick={close}
                  ref={index === 0 ? firstLinkRef : undefined}
                >
                  {link.label}
                </Link>
              ))}

              <span className="my-2 h-px bg-slate-100" />

              {isAuthenticated ? (
                <>
                  {isAdminUser ? (
                    <Link className={panelLinkClass} href="/admin" onClick={close}>
                      Admin
                    </Link>
                  ) : null}
                  <Link
                    className={panelLinkClass}
                    href="/sellers"
                    onClick={close}
                  >
                    Precios PRO
                  </Link>
                  <Link
                    className={panelLinkClass}
                    href="/dashboard"
                    onClick={close}
                  >
                    Dashboard
                  </Link>
                  <form action={logoutAction} onSubmit={close}>
                    <button
                      className="flex h-11 w-full items-center rounded-lg px-3 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
                      type="submit"
                    >
                      Salir
                    </button>
                  </form>
                </>
              ) : (
                <div className="flex flex-col gap-2 pt-1">
                  <Link
                    className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-800 shadow-sm transition hover:border-indigo-300 hover:text-indigo-700"
                    href="/login"
                    onClick={close}
                  >
                    Ingresar
                  </Link>
                  <Link
                    className="inline-flex h-11 items-center justify-center rounded-lg bg-gradient-to-b from-indigo-500 to-indigo-600 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_rgba(79,70,229,0.55)] transition hover:from-indigo-500 hover:to-indigo-700"
                    href="/registro"
                    onClick={close}
                  >
                    Registrarse
                  </Link>
                </div>
              )}
            </nav>
          </div>
        </>
      ) : null}
    </div>
  );
}
