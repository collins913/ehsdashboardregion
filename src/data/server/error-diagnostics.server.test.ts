import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { QueryError, unwrapQueryOutcome } from "@/data/contracts/query-result";
import { errorPresentation, pageErrorCode } from "@/data/contracts/error-presentation";
import { logQueryFailure } from "./error-diagnostics.server";
import { reportPageError } from "./error-diagnostics-actions";
import { onRequestError } from "@/instrumentation";

afterEach(() => vi.restoreAllMocks());

describe("error diagnostic correlation", () => {
  it("preserves the server log ID through JSON transport and the client exception", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new QueryError("ACCESS_DENIED");
    const outcome = JSON.parse(JSON.stringify(logQueryFailure(error, "queryStores")));
    const record = JSON.parse(log.mock.calls[0][0]);
    expect(outcome.queryError.diagnostics.requestId).toBe(record.requestId);
    expect(record).toMatchObject({ event: "query_failure", code: "ACCESS_DENIED", operation: "queryStores" });
    try { unwrapQueryOutcome(outcome); throw new Error("expected failure"); }
    catch (received) {
      expect(received).toBeInstanceOf(QueryError);
      expect((received as QueryError).diagnostics?.requestId).toBe(record.requestId);
      expect(pageErrorCode(received as Error)).toBe("ACCESS_DENIED");
    }
  });

  it("links a page report by digest to the original server render error log", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const original = Object.assign(new Error("private source failure"), { digest: "234567" });
    await onRequestError(original, { path: "/overview?secret=value", method: "GET", headers: {} }, { routerKind: "App Router", routePath: "/overview", routeType: "render", revalidateReason: undefined });
    const originalRecord = JSON.parse(log.mock.calls[0][0]);
    const report = await reportPageError({ path: "/overview", digest: "234567", code: "UNKNOWN_ERROR" });
    const reportRecord = JSON.parse(log.mock.calls[1][0]);
    expect(report.requestId).toBe(reportRecord.requestId);
    expect(reportRecord.digest).toBe(originalRecord.digest);
    expect(originalRecord.path).toBe("/overview");
    expect(log.mock.calls[0][1]).toBe(original);
    expect(JSON.stringify(report)).not.toContain("private");
  });

  it("does not infer causes from exception wording or fabricate a network cause", () => {
    expect(pageErrorCode(new Error("Failed to fetch network database timeout"))).toBe("UNKNOWN_ERROR");
    expect(pageErrorCode(new Error("anything"), true)).toBe("BROWSER_OFFLINE");
    expect(errorPresentation("BROWSER_OFFLINE").reason).toContain("尚不能确认");
  });

  it("rejects reports containing query strings, invalid codes or arbitrary digest text", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    for (const input of [
      { path: "/overview?token=secret", code: "UNKNOWN_ERROR" },
      { path: "/overview", code: "DATABASE_PASSWORD" },
      { path: "/overview", code: "UNKNOWN_ERROR", digest: "private text\n" },
    ]) await expect(reportPageError(input)).rejects.toThrow("INVALID_ERROR_REPORT");
    expect(log).not.toHaveBeenCalled();
  });
});
