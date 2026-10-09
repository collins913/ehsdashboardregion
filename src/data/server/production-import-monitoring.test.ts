import { beforeEach, describe, expect, it, vi } from "vitest";

const recordOperationalEvent = vi.hoisted(() => vi.fn());
vi.mock("@/data/server/monitoring/monitoring-service.server", () => ({ recordOperationalEvent, importDiagnosticsToOperationalDiagnostics: (items: unknown[]) => items }));

import type { MachinePrincipal } from "@/data/contracts/production-import";
import { handleImportApiRequest } from "./production-import-service";

const principal: MachinePrincipal = { principalId: "trusted-machine", allowedDomains: ["events"], allowedOperations: ["SUBMIT", "READ", "VALIDATE", "PUBLISH"] };

describe("Production Import API operational capture", () => {
  beforeEach(() => recordOperationalEvent.mockReset().mockResolvedValue(null));

  it("correlates runtime failures to the authenticated batch operation without exposing internals", async () => {
    const response = await handleImportApiRequest(
      new Request("https://dashboard.invalid/api/v1/import/batches/batch-1", { method: "GET", headers: { "x-request-id": "request-1" } }),
      () => { throw new Error("database password=do-not-log"); },
      async () => principal,
      { kind: "get", batchId: "batch-1" },
    );
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body).toMatchObject({ error: { code: "IMPORT_SERVICE_UNAVAILABLE" } });
    expect(JSON.stringify(body)).not.toContain("do-not-log");
    expect(recordOperationalEvent).toHaveBeenCalledWith(expect.objectContaining({
      source: "Production API", errorCode: "IMPORT_SERVICE_UNAVAILABLE", correlationId: "request-1",
      relatedBatchId: "batch-1", severity: "ERROR",
    }));
  });
});
