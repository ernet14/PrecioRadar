// Semáforo operativo de Fase 3 (read-only salvo --persist).
//
// Uso:
//   node --import tsx --env-file=.env scripts/phase-readiness.ts
//   node --import tsx --env-file=.env scripts/phase-readiness.ts --persist
import {
  buildPhase3ReadinessReport,
  persistPhase3ReadinessReport,
} from "../src/services/phaseReadinessService";

const PERSIST = process.argv.includes("--persist");

function printScope(scope: Awaited<ReturnType<typeof buildPhase3ReadinessReport>>["scopes"][number]) {
  const missing = scope.missing.length > 0 ? ` falta: ${scope.missing.join(", ")}` : "";
  console.log(
    `${scope.label.padEnd(24)} ${scope.status.padEnd(10)} días=${String(scope.days).padStart(2)} prod=${String(scope.productsTracked).padStart(3)} sample=${String(scope.latestSample).padStart(3)}${missing}`,
  );
}

async function main() {
  const report = await buildPhase3ReadinessReport();

  console.log("=== Fase 3 readiness ===");
  console.log(`Estado: ${report.status}`);
  console.log(`Comparables: ${report.comparableProducts}/${report.indexableProducts} (${report.comparableRate}%)`);
  console.log(`Long-tail marca/categoría: ${report.brandCategoryPages} páginas\n`);
  for (const scope of report.scopes) printScope(scope);

  console.log("\nPróximas acciones:");
  for (const action of report.nextActions) console.log(`- ${action}`);

  if (PERSIST) {
    const persistence = await persistPhase3ReadinessReport(report);
    console.log(`\nPersistencia: ${JSON.stringify(persistence)}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
