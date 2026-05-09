import { Container } from "@/components/layout/Container";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <Container className="flex flex-col gap-4 py-8 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
        <p>
          Algunos enlaces pueden generar una comisi&oacute;n para mantener
          PrecioRadar, sin costo extra para vos.
        </p>
        <p className="font-medium text-slate-700">PrecioRadar</p>
      </Container>
    </footer>
  );
}
