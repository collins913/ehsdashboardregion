import "server-only";
import type { ProductionImportService } from "./production-import-service";

/** Must be replaced by a company-managed machine-auth and persistent batch adapter. */
export function createConfiguredProductionImportService(): ProductionImportService {
  throw new Error("PRODUCTION_IMPORT_RUNTIME_NOT_CONFIGURED");
}
