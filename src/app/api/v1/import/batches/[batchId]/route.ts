import { authenticateMachineRequest } from "@/data/server/machine-identity.server";
import { createConfiguredProductionImportService } from "@/data/server/production-import-runtime.server";
import { handleImportApiRequest } from "@/data/server/production-import-service";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ batchId: string }> };
export async function GET(request: Request, context: RouteContext) {
  const { batchId } = await context.params;
  return handleImportApiRequest(request, createConfiguredProductionImportService, authenticateMachineRequest, { kind: "get", batchId });
}
