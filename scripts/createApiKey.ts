import "dotenv/config";
import { generateApiKey } from "../src/lib/apiAuth";
import { API_TIERS, type ApiTier } from "../src/lib/apiTiers";
import { getPrismaClient } from "../src/lib/prisma";

// Crea una API key para la API pública pagada (Etapa 18) e imprime la clave en
// claro UNA sola vez (después solo queda el hash en la base).
//
// Uso: npx tsx scripts/createApiKey.ts "Nombre descriptivo" <FREE|PRO|BUSINESS> [owner@email]

async function main() {
  const [, , name, tierArg, ownerEmail] = process.argv;

  if (!name || !tierArg) {
    console.error('Uso: npx tsx scripts/createApiKey.ts "Nombre" <FREE|PRO|BUSINESS> [owner@email]');
    process.exit(1);
  }

  const tier = tierArg.toUpperCase() as ApiTier;
  if (!(tier in API_TIERS)) {
    console.error(`Tier inválido: ${tierArg}. Opciones: ${Object.keys(API_TIERS).join(", ")}`);
    process.exit(1);
  }

  const prisma = getPrismaClient();
  if (!prisma) {
    console.error("DATABASE_URL/DIRECT_URL no configurado.");
    process.exit(1);
  }

  const { raw, keyHash, prefix } = generateApiKey();
  const record = await prisma.apiKey.create({
    data: { name, tier, keyHash, prefix, ownerEmail: ownerEmail ?? null },
  });

  console.log("API key creada:");
  console.log(`  id:    ${record.id}`);
  console.log(`  name:  ${record.name}`);
  console.log(`  tier:  ${record.tier} (${API_TIERS[tier].dailyLimit} req/día)`);
  console.log(`  clave: ${raw}`);
  console.log("\n⚠️  Guardá la clave ahora: no se vuelve a mostrar.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => process.exit(0));
