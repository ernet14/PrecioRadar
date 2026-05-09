import { Container } from "@/components/layout/Container";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { requireAdmin } from "@/lib/supabase/auth";

export default async function AdminPage() {
  const user = await requireAdmin();

  return (
    <main className="bg-slate-50 py-10 text-slate-950">
      <Container className="space-y-6">
        <section className="space-y-3">
          <Badge variant="brand">Admin</Badge>
          <h1 className="text-3xl font-semibold text-slate-950">
            Panel admin preparado
          </h1>
          <p className="max-w-2xl leading-7 text-slate-600">
            Acceso permitido para{" "}
            <span className="font-semibold text-slate-900">{user.email}</span>.
            La protecci&oacute;n por rol queda lista, sin implementar herramientas
            administrativas todav&iacute;a.
          </p>
        </section>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-slate-950">
            Sin acciones admin en esta etapa
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            El rol admin se leer&aacute; desde metadata de Supabase por ahora y podr&aacute;
            alinearse con el campo role del modelo User cuando se active la base real.
          </p>
        </Card>
      </Container>
    </main>
  );
}
