import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryError } from "@/data/contracts/query-result";

const harness = vi.hoisted(() => ({ effect: undefined as undefined | (() => (() => void) | void), current: null as Record<string, unknown> | null, states: [] as Record<string, unknown>[], report: vi.fn() }));
vi.mock("react", () => ({
  useState: () => [harness.current, (value: Record<string, unknown>) => { harness.current = value; harness.states.push(value); }],
  useEffect: (effect: typeof harness.effect) => { harness.effect = effect; },
}));
vi.mock("@/data/server/error-diagnostics-actions", () => ({ reportPageError: harness.report }));
import { useErrorDiagnostics } from "./use-error-diagnostics";

beforeEach(() => {
  harness.current = null; harness.states = []; harness.report.mockReset();
  vi.stubGlobal("window", { location: { pathname: "/overview", search: "?secret=value" } });
  vi.stubGlobal("navigator", { onLine: true });
});
afterEach(() => vi.unstubAllGlobals());

describe("error report receipt", () => {
  it("shows recorded only after a confirmed server receipt", async () => {
    const diagnostics = { requestId: "server-id", occurredAt: "2026-10-19T00:00:00Z", origin: "CLIENT_REPORT" };
    harness.report.mockResolvedValue(diagnostics);
    useErrorDiagnostics(new Error("secret")); harness.effect!();
    expect(harness.states[0].reporting).toBe("PENDING");
    await vi.waitFor(() => expect(harness.states.at(-1)).toMatchObject({ reporting: "RECORDED", diagnostics }));
    expect(harness.report).toHaveBeenCalledWith({ path: "/overview", code: "UNKNOWN_ERROR", digest: undefined });
  });

  it("does not invent an ID or a cause when the reporting request fails", async () => {
    harness.report.mockRejectedValue(new Error("Failed to fetch"));
    useErrorDiagnostics(new Error("Failed to fetch")); harness.effect!();
    await vi.waitFor(() => expect(harness.states.at(-1)).toMatchObject({ reporting: "FAILED", code: "UNKNOWN_ERROR" }));
    expect(harness.states.at(-1)?.diagnostics).toBeUndefined();
  });

  it("retains the original query log ID and skips a redundant report", () => {
    const diagnostics = { requestId: "original-id", occurredAt: "2026-10-19T00:00:00Z", origin: "SERVER_QUERY" as const };
    useErrorDiagnostics(new QueryError("ACCESS_DENIED", diagnostics)); harness.effect!();
    expect(harness.states.at(-1)).toMatchObject({ diagnostics, code: "ACCESS_DENIED", reporting: "RECORDED" });
    expect(harness.report).not.toHaveBeenCalled();
  });

  it("does not report previews or apply a receipt after unmount", async () => {
    useErrorDiagnostics(undefined, true); harness.effect!();
    expect(harness.states.at(-1)?.reporting).toBe("PREVIEW");
    expect(harness.report).not.toHaveBeenCalled();
    harness.report.mockResolvedValue({ requestId: "late" });
    useErrorDiagnostics(new Error("test")); const cleanup = harness.effect!();
    cleanup!();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(harness.states.at(-1)?.reporting).toBe("PENDING");
  });

  it("hides the previous request ID immediately when a different error arrives", () => {
    const original = new QueryError("ACCESS_DENIED", { requestId: "previous-id", occurredAt: "2026-10-19T00:00:00Z", origin: "SERVER_QUERY" });
    useErrorDiagnostics(original); harness.effect!();
    expect(useErrorDiagnostics(original)?.diagnostics?.requestId).toBe("previous-id");
    expect(useErrorDiagnostics(new Error("new failure"))).toBeNull();
  });

  it("handles a synchronous reporting failure without crashing the error page", async () => {
    harness.report.mockImplementation(() => { throw new Error("missing dispatcher"); });
    useErrorDiagnostics(new Error("original failure"));
    expect(() => harness.effect!()).not.toThrow();
    await vi.waitFor(() => expect(harness.states.at(-1)).toMatchObject({ reporting: "FAILED" }));
    expect(harness.states.at(-1)?.diagnostics).toBeUndefined();
  });
});
