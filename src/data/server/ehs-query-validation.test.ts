import { beforeEach, describe, expect, it, vi } from "vitest";

const { repositoryFactory, getActions, getEvents, getTakeChargeGoals, authorize } = vi.hoisted(() => {
  const getActions = vi.fn(async () => ({ availability: "CONFIRMED_EMPTY", items: [], totalCount: 0, pageIndex: 0, pageSize: 5 }));
  const getEvents = vi.fn(async () => ({ availability: "CONFIRMED_EMPTY", items: [], totalCount: 0, pageIndex: 0, pageSize: 5, availableEventTypes: [] }));
  const getTakeChargeGoals = vi.fn(async () => ({ period: {}, annual: {} }));
  const repositoryFactory = vi.fn(() => ({ getActions, getEvents, getTakeChargeGoals }));
  const authorize = vi.fn(async (scope: unknown) => scope);
  return { repositoryFactory, getActions, getEvents, getTakeChargeGoals, authorize };
});

vi.mock("@/data/repositories/create-ehs-repository.server", () => ({ createEhsRepository: repositoryFactory }));
vi.mock("@/lib/access/access-service.server", () => ({ authorizeBusinessScope: authorize }));

import { queryActions, queryEvents, queryTakeChargeGoals } from "@/data/server/ehs-query-actions";
import { InvalidQueryInputError } from "@/data/server/query-input-validation";

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
    await expect(queryActions(actionInput(query))).rejects.toMatchObject<Partial<InvalidQueryInputError>>({
      name: "InvalidQueryInputError",
      code: "INVALID_QUERY_INPUT",
    });
    expect(authorize).not.toHaveBeenCalled();
    expect(repositoryFactory).not.toHaveBeenCalled();
  });

  it("rejects malformed reference dates before constructing a Repository", async () => {
    await expect(queryActions(actionInput(validActionQuery, "2026-02-30T00:00:00Z")))
      .rejects.toMatchObject({ code: "INVALID_QUERY_INPUT" });
    expect(repositoryFactory).not.toHaveBeenCalled();
  });

  it("rejects malformed envelope and nested Event sorting inputs", async () => {
    await expect(queryActions(null as never)).rejects.toMatchObject({ code: "INVALID_QUERY_INPUT" });
    await expect(queryEvents(actionInput({
      context: validContext,
      viewMode: "ALL",
      sorting: { key: "certificateType", direction: "asc" },
      pageIndex: 0,
      pageSize: 5,
    }))).rejects.toMatchObject({ code: "INVALID_QUERY_INPUT" });
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

  it("preserves valid dynamic Event Type filters", async () => {
    await queryEvents(actionInput({ ...validActionQuery, eventType: "Non-Agency Event" }));
    expect(getEvents).toHaveBeenCalledWith(expect.objectContaining({ eventType: "Non-Agency Event" }));
  });

  it("accepts the direct Period-aware context used by the Goals summary query", async () => {
    await queryTakeChargeGoals(actionInput(validContext));
    expect(authorize).toHaveBeenCalledWith(validContext);
    expect(getTakeChargeGoals).toHaveBeenCalledWith({ context: validContext });
  });
});
