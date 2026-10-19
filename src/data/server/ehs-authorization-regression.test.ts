import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EhsStoreScope } from "@/data/contracts/kpi";
import { periodForMode } from "@/data/contracts/kpi-period";
import { QueryError, unwrapQueryOutcome } from "@/data/contracts/query-result";
import type { EhsRepository } from "@/data/repositories/ehs-repository";
import * as identity from "@/data/server/identity-provider.server";

vi.mock("server-only", () => ({}));
const reads = vi.hoisted(() => [] as { method: string; input: unknown }[]);
vi.mock("@/data/repositories/create-ehs-repository.server", async (original) => {
  const actual = await original<typeof import("@/data/repositories/create-ehs-repository.server")>();
  return { createEhsRepository: vi.fn((date: Date): EhsRepository => {
    const repository = actual.createEhsRepository(date);
    return new Proxy(repository, { get(target, key) {
      const method = Reflect.get(target, key);
      if (typeof method !== "function") return method;
      return (input: unknown) => { reads.push({ method: String(key), input }); return method.call(target, input); };
    } });
  }) };
});
import { createEhsRepository } from "@/data/repositories/create-ehs-repository.server";
import * as actions from "./ehs-query-actions";

const referenceDateIso = "2026-09-22T00:00:00+08:00";
const all: EhsStoreScope = { region: { kind: "ALL" }, area: { kind: "ALL" }, store: { kind: "ALL" } };
const period = periodForMode("THIS_YEAR", new Date(referenceDateIso));
const context = (scope: EhsStoreScope) => ({ ...scope, period });
const page = (scope: EhsStoreScope) => ({ context: context(scope), viewMode: "ALL" as const, pageIndex: 0, pageSize: 1000 });
const detail = (scope: EhsStoreScope, storeId = "TEST-001") => ({ context: context(scope), storeId });
const envelope = <T>(query: T) => ({ referenceDateIso, query });
const queries = [
  { name: "queryKpiRows", run: (scope: EhsStoreScope) => actions.queryKpiRows(envelope(context(scope))) },
  { name: "queryOverview", run: (scope: EhsStoreScope) => actions.queryOverview(envelope({ context: scope })) },
  { name: "queryKpiTrainingDetails", run: (scope: EhsStoreScope) => actions.queryKpiTrainingDetails(envelope(detail(scope))) },
  { name: "queryKpiDrillDetails", run: (scope: EhsStoreScope) => actions.queryKpiDrillDetails(envelope(detail(scope))) },
  { name: "queryKpiInspectionDetails", run: (scope: EhsStoreScope) => actions.queryKpiInspectionDetails(envelope(detail(scope))) },
  { name: "queryKpiAstmDetails", run: (scope: EhsStoreScope) => actions.queryKpiAstmDetails(envelope(detail(scope))) },
  { name: "queryActions", run: (scope: EhsStoreScope) => actions.queryActions(envelope(page(scope))) },
  { name: "queryActionsAnalytics", run: (scope: EhsStoreScope) => actions.queryActionsAnalytics(envelope({ context: context(scope) })) },
  { name: "queryEvents", run: (scope: EhsStoreScope) => actions.queryEvents(envelope(page(scope))) },
  { name: "queryEventsAnalytics", run: (scope: EhsStoreScope) => actions.queryEventsAnalytics(envelope({ context: context(scope) })) },
  { name: "queryTakeChargeGoals", run: (scope: EhsStoreScope) => actions.queryTakeChargeGoals(envelope(context(scope))) },
  { name: "queryTakeChargeRecords", run: (scope: EhsStoreScope) => actions.queryTakeChargeRecords(envelope(page(scope))) },
  { name: "queryStores", run: (scope: EhsStoreScope) => actions.queryStores(envelope(scope)) },
  { name: "queryEnvironment", run: (scope: EhsStoreScope) => actions.queryEnvironment(envelope(scope)) },
  { name: "queryEnvironmentAnalytics", run: (scope: EhsStoreScope) => actions.queryEnvironmentAnalytics(envelope({ context: scope })) },
  { name: "queryCertificates", run: (scope: EhsStoreScope) => actions.queryCertificates(envelope(scope)) },
];

beforeEach(() => {
  vi.clearAllMocks(); reads.length = 0;
  vi.stubEnv("EHS_MOCK_PROFILE", "standard");
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubEnv("EHS_DATA_SOURCE", "mock"); vi.stubEnv("EHS_IDENTITY_MODE", "mock");
  vi.stubEnv("EHS_MOCK_USER_EMAIL", "manager.1@example.test");
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

describe("every EHS Server Action authorization boundary", () => {
  it("covers every exported query", () => {
    expect(queries.map(({ name }) => name).sort()).toEqual(Object.keys(actions).sort());
  });
  it.each(queries)("$name rejects forged scope before repository initialization", async ({ run }) => {
    await expect(run({ ...all, store: { kind: "INCLUDE", values: ["TEST-002"] } }))
      .resolves.toMatchObject({ queryError: { code: "ACCESS_DENIED" } });
    expect(createEhsRepository).not.toHaveBeenCalled();
  });
  it.each(queries)("$name rejects missing identity before repository initialization", async ({ run }) => {
    vi.spyOn(identity, "requireVerifiedServerPrincipal").mockRejectedValueOnce(new QueryError("AUTHENTICATION_REQUIRED"));
    await expect(run(all)).resolves.toMatchObject({ queryError: { code: "AUTHENTICATION_REQUIRED" } });
    expect(createEhsRepository).not.toHaveBeenCalled();
  });
  it.each(queries)("$name scopes lists, counts, analytics and options with real access rules", async ({ run, name }) => {
    const result = await run(all);
    expect(result).not.toHaveProperty("queryError");
    expect(reads.length).toBeGreaterThan(0);
    for (const { input } of reads) {
      const query = input as { context?: EhsStoreScope; scope?: EhsStoreScope; attentionScope?: EhsStoreScope };
      const scopes = query.scope ? [query.scope, query.attentionScope!] : [query.context ?? input as EhsStoreScope];
      for (const scope of scopes) expect(scope.store).toEqual({ kind: "INCLUDE", values: ["TEST-001"] });
    }
    expect(JSON.stringify(result)).not.toContain("TEST-002");
    // A globally authorized user with the exact same scope must receive the same
    // data, counts and filter options. Overview's label describes requested scope.
    vi.stubEnv("EHS_MOCK_USER_EMAIL", "admin@example.test");
    const scoped = await run({ ...all, store: { kind: "INCLUDE", values: ["TEST-001"] } });
    if (name !== "queryOverview") expect(result).toEqual(scoped);
    else {
      const overview = unwrapQueryOutcome(await actions.queryOverview(envelope({ context: all })));
      expect(overview.storeCount).toBeGreaterThan(1);
      expect(result).toMatchObject({ storeCount: 1, stores: [expect.objectContaining({ storeId: "TEST-001" })] });
    }
  });
  it.each([actions.queryKpiTrainingDetails, actions.queryKpiDrillDetails, actions.queryKpiInspectionDetails, actions.queryKpiAstmDetails])
    ("rejects a forged detail Store ID inside an otherwise authorized context", async (run) => {
      await expect(run(envelope(detail(all, "TEST-002")))).resolves.toMatchObject({ queryError: { code: "ACCESS_DENIED" } });
      expect(createEhsRepository).not.toHaveBeenCalled();
    });
});
