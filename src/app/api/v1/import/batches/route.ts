import { authenticateMachineRequest } from "@/data/server/machine-identity.server";
import { createConfiguredProductionImportService } from "@/data/server/production-import-runtime.server";
import { handleImportApiRequest } from "@/data/server/production-import-service";

export const runtime = "nodejs";
export const POST = (request: Request) => handleImportApiRequest(
  request,
  createConfiguredProductionImportService,
  authenticateMachineRequest,
  { kind: "submit" },
);
