import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));

const { repositoryFactory, getActions, getEvents, getTakeChargeGoals, getEnvironmentAnalytics, getOverviewScoreData, authorize } = vi.hoisted(() => {
  const getActions = vi.fn(async () => ({ availability: "CONFIRMED_EMPTY", items: [], totalCount: 0, pageIndex: 0, pageSize: 5 }));
  const getEvents = vi.fn(async () => ({ availability: "CONFIRMED_EMPTY", items: [], totalCount: 0, pageIndex: 0, pageSize: 5, availableEventTypes: [] }));
  const getTakeChargeGoals = vi.fn(async () => ({ period: {}, annual: {} }));
  const getEnvironmentAnalytics = vi.fn(async () => ({ availability: "CONFIRMED_EMPTY", periodMonths: ["2026-09"], hazardousWasteContractHolding: {}, solidWasteContractHolding: {}, expiringContractCount: 0, excludedContractMissingOrInvalidExpiryDateCount: 0 }));
  const getOverviewScoreData = vi.fn(async () => ({ stores: [], attentionStores: [], months: ["2026-09"], contributions: [], availability: "UNAVAILABLE" }));
  const repositoryFactory = vi.fn(() => ({ getActions, getEvents, getTakeChargeGoals, getEnvironmentAnalytics, getOverviewScoreData }));
  const authorize = vi.fn(async (scope: unknown) => scope);
  return { repositoryFactory, getActions, getEvents, getTakeChargeGoals, getEnvironmentAnalytics, getOverviewScoreData, authorize };
});

vi.mock("@/data/repositories/create-ehs-repository.server", () => ({ createEhsRepository: repositoryFactory }));
vi.mock("@/lib/access/access-service.server", () => ({ authorizeBusinessScope: authorize }));

import { queryActions, queryEnvironmentAnalytics, queryEvents, queryOverview, queryTakeChargeGoals } from "@/data/server/ehs-query-actions";
import { QueryError } from "@/data/contracts/query-result";

const validContext = {
  region: { kind: "ALL" },
  area: { kind: "ALL" },
  store: { kind: "ALL" },
  period: {
    startInclusive: "2026-07-01T00:00:00+08:00",
    endExclusive: "2026-10-01T00:00:00+08:00",
    includedMonths: ["2026-07", "2026-08", "2026-09"],
  },
};

const validActionQuery = {
  context: validContext,
  viewMode: "ALL",
  pageIndex: 0,
  pageSize: 5,
};

function actionInput(query: unknown, referenceDateIso = "2026-09-22T00:00:00.000Z") {
  return { referenceDateIso, query } as never;
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.clearAllMocks();
});

describe("read-only Server Action input validation", () => {
  it.each([
    ["unknown sorting key", { ...validActionQuery, sorting: { key: "notAColumn", direction: "asc" } }],
    ["invalid sorting direction", { ...validActionQuery, sorting: { key: "store", direction: "sideways" } }],
    ["malformed FilterScope", { ...validActionQuery, context: { ...validContext, store: { kind: "INCLUDE", values: "TEST-001" } } }],
    ["invalid period", { ...validActionQuery, context: { ...validContext, period: { ...validContext.period, endExclusive: "2026-08-01T00:00:00+08:00" } } }],
    ["invalid pagination", { ...validActionQuery, pageIndex: -1 }],
    ["non-integer pagination", { ...validActionQuery, pageSize: 1.5 }],
    ["illegal view enum", { ...validActionQuery, viewMode: "CANCELLED" }],
  ])("rejects %s before authorization or repository access", async (_label, query) => {
    await expect(queryActions(actionInput(query))).resolves.toMatchObject({ queryError: { code: "INVALID_QUERY_INPUT" } });
    expect(authorize).not.toHaveBeenCalled();
    expect(repositoryFactory).not.toHaveBeenCalled();
  });

  it("rejects malformed reference dates before constructing a Repository", async () => {
    await expect(queryActions(actionInput(validActionQuery, "2026-02-30T00:00:00Z")))
      .resolves.toMatchObject({ queryError: { code: "INVALID_QUERY_INPUT" } });
    expect(repositoryFactory).not.toHaveBeenCalled();
  });

  it("rejects malformed envelope and nested Event sorting inputs", async () => {
    await expect(queryActions(null as never)).resolves.toMatchObject({ queryError: { code: "INVALID_QUERY_INPUT" } });
    await expect(queryEvents(actionInput({
      context: validContext,
      viewMode: "ALL",
      sorting: { key: "certificateType", direction: "asc" },
      pageIndex: 0,
      pageSize: 5,
    }))).resolves.toMatchObject({ queryError: { code: "INVALID_QUERY_INPUT" } });
    expect(repositoryFactory).not.toHaveBeenCalled();
  });

  it("accepts a valid query and passes normalized typed input into the existing boundary", async () => {
    await queryActions(actionInput({ ...validActionQuery, sorting: { key: "submittedDate", direction: "desc" } }));
    expect(authorize).toHaveBeenCalledWith(validContext);
    expect(repositoryFactory).toHaveBeenCalledWith(new Date("2026-09-22T00:00:00.000Z"));
    expect(getActions).toHaveBeenCalledWith({
      context: validContext,
      viewMode: "ALL",
      pageIndex: 0,
      pageSize: 5,
      sorting: { key: "submittedDate", direction: "desc" },
    });
  });

  it("does not initialize the business Repository when scope authorization fails", async () => {
    authorize.mockRejectedValueOnce(new QueryError("ACCESS_DENIED"));
    await expect(queryActions(actionInput(validActionQuery))).resolves.toMatchObject({ queryError: { code: "ACCESS_DENIED" } });
    expect(repositoryFactory).not.toHaveBeenCalled();
  });

  it("preserves valid dynamic Event Type filters", async () => {
    await queryEvents(actionInput({ ...validActionQuery, eventType: "Non-Agency Event" }));
    expect(getEvents).toHaveBeenCalledWith(expect.objectContaining({ eventType: "Non-Agency Event" }));
  });

  it("accepts the direct Period-aware context used by the Goals summary query", async () => {
    await queryTakeChargeGoals(actionInput(validContext));
    expect(authorize).toHaveBeenCalledWith(validContext);
    expect(getTakeChargeGoals).toHaveBeenCalledWith({ context: validContext });
  });

  it("Overview accepts only organization scope and prepares its month from referenceDate", async () => {
    const scope = { region: { kind: "ALL" }, area: { kind: "ALL" }, store: { kind: "ALL" } };
    await queryOverview(actionInput({ context: scope }));
    expect(getOverviewScoreData).toHaveBeenCalledWith({ scope, attentionScope: scope });
    await expect(queryOverview(actionInput({ context: validContext }))).resolves.toMatchObject({ queryError: { code: "INVALID_QUERY_INPUT" } });
  });

  it("Environment Analytics derives the reference month and rejects client Period", async () => {
    const scope = { region: { kind: "ALL" }, area: { kind: "ALL" }, store: { kind: "ALL" } };
    await queryEnvironmentAnalytics(actionInput({ context: scope }, "2026-09-10T00:00:00+08:00"));
    expect(getEnvironmentAnalytics).toHaveBeenCalledWith({ context: scope, period: {
      startInclusive: "2026-09-01T00:00:00+08:00",
      endExclusive: "2026-10-01T00:00:00+08:00",
      includedMonths: ["2026-09"],
    } });
    await expect(queryEnvironmentAnalytics(actionInput({ context: scope, period: validContext.period }))).resolves.toMatchObject({ queryError: { code: "INVALID_QUERY_INPUT" } });
  });
});
