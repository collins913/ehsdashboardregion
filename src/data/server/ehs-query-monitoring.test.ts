import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EnvironmentQueryResult } from "@/data/contracts/environment";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  getEnvironment: vi.fn<() => Promise<EnvironmentQueryResult>>(),
  recordEvent: vi.fn(async () => null),
}));

vi.mock("@/data/repositories/create-ehs-repository.server", () => ({
  createEhsRepository: () => ({ getEnvironment: mocks.getEnvironment }),
}));
vi.mock("@/lib/access/access-service.server", () => ({
  authorizeBusinessScope: async (scope: unknown) => scope,
}));
vi.mock("@/data/server/monitoring/monitoring-service.server", () => ({
  recordOperationalEvent: mocks.recordEvent,
}));

import { queryEnvironment } from "./ehs-query-actions";

const input = {
  referenceDateIso: "2026-10-10T00:00:00+08:00",
  query: { region: { kind: "ALL" }, area: { kind: "ALL" }, store: { kind: "ALL" } },
} as const;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("EHS_DATA_SOURCE", "mock");
  mocks.getEnvironment.mockResolvedValue({ availability: "INCOMPLETE", items: [] });
});
afterEach(() => vi.unstubAllEnvs());

describe("Server Action monitoring classification", () => {
  it.each([
    ["mock", "Mock Repository"],
    ["production", "Production Repository"],
  ])("identifies %s data without changing the returned availability", async (mode, source) => {
    vi.stubEnv("EHS_DATA_SOURCE", mode);
    const result = await queryEnvironment(input);

    expect(result.availability).toBe("INCOMPLETE");
    expect(mocks.recordEvent).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      source,
      severity: "WARNING",
      errorCode: "SOURCE_DATA_INCOMPLETE",
      phenomenon: "数据结果包含 0 个不可用项、1 个不完整项。",
      diagnostics: [{ code: "SOURCE_DATA_INCOMPLETE", severity: "WARNING", message: "查询结果包含 1 个不完整项。" }],
    }));
    if (mode === "mock") {
      expect(mocks.recordEvent).toHaveBeenCalledWith(expect.objectContaining({
        safeMessage: "模拟数据查询结果包含不完整项。",
        nextStep: expect.stringContaining("此记录不代表生产数据故障"),
      }));
    }
  });

  it("retains ERROR severity for unavailable sources", async () => {
    mocks.getEnvironment.mockResolvedValue({ availability: "UNAVAILABLE", items: [] });
    await queryEnvironment(input);
    expect(mocks.recordEvent).toHaveBeenCalledWith(expect.objectContaining({
      severity: "ERROR", errorCode: "REQUIRED_DATA_UNAVAILABLE",
      diagnostics: [{ code: "REQUIRED_DATA_UNAVAILABLE", severity: "ERROR", message: "查询结果包含 1 个不可用项。" }],
    }));
  });

  it("does not report confirmed-empty business results as faults", async () => {
    mocks.getEnvironment.mockResolvedValue({ availability: "CONFIRMED_EMPTY", items: [] });
    await queryEnvironment(input);
    expect(mocks.recordEvent).not.toHaveBeenCalled();
  });

  it("records rejected query input as INFO instead of a server failure", async () => {
    await expect(queryEnvironment({ ...input, query: { ...input.query, unexpected: true } } as never))
      .rejects.toMatchObject({ code: "INVALID_QUERY_INPUT" });
    expect(mocks.getEnvironment).not.toHaveBeenCalled();
    expect(mocks.recordEvent).toHaveBeenCalledWith(expect.objectContaining({
      severity: "INFO", errorCode: "INVALID_QUERY_INPUT", causeStatus: "KNOWN",
    }));
  });

  it("still captures genuine exceptions without including their raw message", async () => {
    const failure = new Error("private database connection detail");
    mocks.getEnvironment.mockRejectedValueOnce(failure);
    await expect(queryEnvironment(input)).rejects.toBe(failure);
    expect(mocks.recordEvent).toHaveBeenCalledWith(expect.objectContaining({
      severity: "ERROR", errorCode: "SERVER_ACTION_FAILED", causeStatus: "UNKNOWN",
    }));
    expect(JSON.stringify(mocks.recordEvent.mock.calls)).not.toContain(failure.message);
  });
});
