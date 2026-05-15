import { getPrismaClient } from "@/lib/prisma";

export type RecordProviderLogResult =
  | { status: "logged" }
  | { status: "skipped"; reason: string }
  | { status: "error"; reason: string };

const maxErrorMessageLength = 500;
const missingDatabaseReason =
  "Falta configurar DATABASE_URL o DIRECT_URL con la conexion Postgres de Supabase.";

export function getProviderErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }

  return "Error desconocido del provider.";
}

function truncateErrorMessage(errorMessage: string | null | undefined) {
  const trimmed = errorMessage?.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed.length > maxErrorMessageLength
    ? `${trimmed.slice(0, maxErrorMessageLength - 3)}...`
    : trimmed;
}

export async function recordProviderLog({
  action,
  errorMessage,
  provider,
  status,
  storeSlug,
}: {
  action: string;
  errorMessage?: string | null;
  provider: string;
  status: string;
  storeSlug?: string | null;
}): Promise<RecordProviderLogResult> {
  const prisma = getPrismaClient();

  if (!prisma) {
    return { status: "skipped", reason: missingDatabaseReason };
  }

  try {
    const store = storeSlug
      ? await prisma.store.findUnique({
          select: { id: true },
          where: { slug: storeSlug },
        })
      : null;

    await prisma.providerLog.create({
      data: {
        action,
        errorMessage: truncateErrorMessage(errorMessage),
        provider,
        status,
        storeId: store?.id ?? null,
      },
    });

    return { status: "logged" };
  } catch (error) {
    console.error("Unable to record provider log.", error);
    return {
      status: "error",
      reason: "No pudimos registrar el log del provider.",
    };
  }
}
