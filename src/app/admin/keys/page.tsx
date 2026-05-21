import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Card } from "@/components/ui/Card";
import { listApiKeys } from "@/services/apiKeyService";
import { API_TIERS } from "@/lib/apiTiers";
import { CreateApiKeyForm } from "./CreateApiKeyForm";
import { revokeApiKeyAction } from "./actions";

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function formatDate(date: Date | null) {
  return date ? dateFormatter.format(date) : "—";
}

export default async function ApiKeysPage() {
  const keys = await listApiKeys();
  const activeCount = keys.filter((key) => key.active).length;

  return (
    <main className="bg-[#f4f7fb] py-10 text-slate-950">
      <Container className="space-y-8">
        <section className="flex items-center justify-between gap-4">
          <div>
            <Link
              className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900"
              href="/admin"
            >
              &lt;- Admin
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">API keys (Etapa 18)</h1>
            <p className="mt-1 text-sm text-slate-500">
              Claves de la API pública de pricing. Se guarda solo el hash; la
              clave en claro se muestra una sola vez al crearla.
            </p>
          </div>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-semibold text-slate-700">
            {keys.length} claves · {activeCount} activas
          </span>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-2">
            {keys.length > 0 ? (
              keys.map((key) => (
                <div
                  className="rounded-xl border border-slate-200 bg-white p-4"
                  key={key.id}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-950">{key.name}</p>
                      <p className="mt-1 font-mono text-xs text-slate-500">
                        {key.prefix}… · {key.tier} ({API_TIERS[key.tier].dailyLimit} req/día)
                        {key.ownerEmail ? ` · ${key.ownerEmail}` : ""}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Creada {formatDate(key.createdAt)} · Último uso{" "}
                        {key.lastUsedAt ? formatDate(key.lastUsedAt) : "nunca"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                          key.active
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-slate-50 text-slate-500"
                        }`}
                      >
                        {key.active ? "Activa" : "Revocada"}
                      </span>
                      {key.active ? (
                        <form
                          action={async () => {
                            "use server";
                            await revokeApiKeyAction(key.id);
                          }}
                        >
                          <button
                            className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                            type="submit"
                          >
                            Revocar
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
                Todavía no hay API keys. Creá la primera con el formulario.
              </p>
            )}
          </div>

          <Card className="border-slate-200 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
            <h2 className="text-lg font-semibold text-slate-950">Nueva API key</h2>
            <p className="mt-1 text-sm text-slate-500">
              El titular usa la clave como <code>Authorization: Bearer …</code>.
            </p>
            <div className="mt-4">
              <CreateApiKeyForm />
            </div>
          </Card>
        </section>
      </Container>
    </main>
  );
}
