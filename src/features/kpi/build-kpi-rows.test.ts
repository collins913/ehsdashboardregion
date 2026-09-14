import { describe, expect, it } from "vitest";
import {
  mockStores,
} from "@/data/mock";
import { createMockEhsRepository } from "@/data/repositories/mock-ehs-repository";
import type {
  DataSet,
  KpiActionClosureRateRecord,
  KpiDataSnapshot,
  KpiDrillRecord,
  EhsFilterContext,
  KpiStore,
  KpiTrainingRecord,
} from "@/data/contracts/kpi";
import type { NormalizedActionRecord } from "@/data/contracts/action-record";
import type { NormalizedEventRecord } from "@/data/contracts/event-record";
import { buildKpiRows } from "@/features/kpi/build-kpi-rows";
import type { ParsedActionStatus, StoreMasterData } from "@/types/ehs";
import type { RecordState } from "@/lib/rules/result-types";

const q1Context: EhsFilterContext = {
  region: { kind: "ALL" },
  area: { kind: "ALL" },
  store: { kind: "ALL" },
  period: {
    startInclusive: "2026-01-01T00:00:00+08:00",
    endExclusive: "2026-04-01T00:00:00+08:00",
    includedMonths: ["2026-01", "2026-02", "2026-03"],
  },
};
const mockEhsRepository = createMockEhsRepository(
  new Date("2026-03-15T00:00:00+08:00"),
);

const stores: readonly KpiStore[] = [
  {
    storeId: "STORE-1",
    displayName: "Store One",
    region: "North",
    area: "North One",
  },
  {
    storeId: "STORE-2",
    displayName: "Store Two",
    region: "South",
    area: "South One",
  },
];

function available<T>(first: T, ...rest: T[]): DataSet<T> {
  return { availability: "AVAILABLE", items: [first, ...rest] };
}

function confirmedEmpty<T>(): DataSet<T> {
  return { availability: "CONFIRMED_EMPTY", items: [] };
}

function unavailable<T>(): DataSet<T> {
  return { availability: "UNAVAILABLE", items: [] };
}

function incomplete<T>(...items: T[]): DataSet<T> {
  return { availability: "INCOMPLETE", items };
}

function snapshot(
  overrides: Partial<KpiDataSnapshot> = {},
): KpiDataSnapshot {
  return {
    stores,
    training: confirmedEmpty(),
    drills: confirmedEmpty(),
    inspections: confirmedEmpty(),
    actionClosureRates: confirmedEmpty(),
    actions: confirmedEmpty(),
    events: confirmedEmpty(),
    ...overrides,
  };
}

function action(
  storeId: string,
  actionId: string,
  sourceStatus: ParsedActionStatus,
  recordState: RecordState = "OPEN",
): NormalizedActionRecord {
  return {
    storeId,
    storeDisplayName: storeId,
    actionId,
    problem: actionId,
    action: actionId,
    submittedBy: "Submitter",
    owner: "Owner",
    submittedDate: "2026-01-01T09:00:00+08:00",
    dueDate: "2026-01-31T18:00:00+08:00",
    closedDate: null,
    sourceStatus,
    recordState,
  };
}

function event(
  storeId: string,
  astmInjuryIllness: string,
): NormalizedEventRecord {
  return {
    storeId,
    storeDisplayName: storeId,
    eventId: `EVENT-${storeId}`,
    eventType: "Injury/Illness",
    submittedBy: "Submitter",
    eventDate: "2026-01-01T09:30:00+08:00",
    description: "Event",
    sourceStatus: "Open",
    recordState: "OPEN",
    astmInjuryIllness,
  };
}

describe("KPI assembly", () => {
  it("builds one normalized row per store", () => {
    const rows = buildKpiRows(q1Context, snapshot());

    expect(rows.map(({ store }) => store.storeId)).toEqual([
      "STORE-1",
      "STORE-2",
    ]);
  });

  it("honors repository store filtering", async () => {
    const context: EhsFilterContext = {
      ...q1Context,
      store: { kind: "INCLUDE", values: ["TEST-002"] },
    };
    const rows = buildKpiRows(context, await mockEhsRepository.getKpiData(context));

    expect(rows).toHaveLength(1);
    expect(rows[0].store.storeId).toBe("TEST-002");
  });

  it("honors repository Region filtering", async () => {
    const context: EhsFilterContext = {
      ...q1Context,
      region: { kind: "INCLUDE", values: ["南屿区"] },
    };
    const rows = buildKpiRows(context, await mockEhsRepository.getKpiData(context));

    expect(rows).toHaveLength(4);
    expect(rows.every(({ store }) => store.region === "南屿区")).toBe(true);
  });

  it("honors repository Area filtering", async () => {
    const context: EhsFilterContext = {
      ...q1Context,
      area: { kind: "INCLUDE", values: ["西岭二部"] },
    };
    const rows = buildKpiRows(context, await mockEhsRepository.getKpiData(context));

    expect(rows.map(({ store }) => store.storeId)).toEqual([
      "TEST-011",
      "TEST-012",
    ]);
  });

  it("honors the explicit period supplied to the repository", async () => {
    const context: EhsFilterContext = {
      ...q1Context,
      store: { kind: "INCLUDE", values: ["TEST-003"] },
      period: {
        startInclusive: "2026-03-01T00:00:00+08:00",
        endExclusive: "2026-04-01T00:00:00+08:00",
        includedMonths: ["2026-03"],
      },
    };
    const data = await mockEhsRepository.getKpiData(context);

    expect(data.training.items.map(({ month }) => month)).toEqual(["2026-03"]);
    expect(data.events.items).toHaveLength(1);
  });

  it("does not infer confirmed empty outside declared fixture coverage", async () => {
    const context: EhsFilterContext = {
      ...q1Context,
      store: { kind: "INCLUDE", values: ["TEST-012"] },
      period: {
        startInclusive: "2026-09-01T00:00:00+08:00",
        endExclusive: "2026-10-01T00:00:00+08:00",
        includedMonths: ["2026-09"],
      },
    };
    const data = await mockEhsRepository.getKpiData(context);

    expect(data.training.availability).toBe("INCOMPLETE");
    expect(data.events.availability).toBe("INCOMPLETE");
  });

  it("returns confirmed empty only inside declared fixture coverage", async () => {
    const context: EhsFilterContext = {
      ...q1Context,
      store: { kind: "INCLUDE", values: ["TEST-012"] },
      period: {
        startInclusive: "2026-01-01T00:00:00+08:00",
        endExclusive: "2026-02-01T00:00:00+08:00",
        includedMonths: ["2026-01"],
      },
    };
    const data = await mockEhsRepository.getKpiData(context);

    expect(data.events.availability).toBe("CONFIRMED_EMPTY");
  });

  it("does not treat an uncovered store in ALL scope as confirmed empty ASTM", async () => {
    const uncoveredStore: StoreMasterData = {
      region: "北辰区",
      area: "北辰一部",
      storeNameCn: "未声明覆盖门店",
      storeNameEn: "Uncovered Store",
      trtid: "TEST-013",
      manager: "测试经理",
      ehsAmbassador: "测试专员",
    };
    const mutableStores = mockStores as StoreMasterData[];
    mutableStores.push(uncoveredStore);

    try {
      const data = await mockEhsRepository.getKpiData(q1Context);
      const row = buildKpiRows(q1Context, data).find(
        ({ store }) => store.storeId === uncoveredStore.trtid,
      );

      expect(data.events.availability).toBe("INCOMPLETE");
      expect(row?.astmEvents).toEqual({
        availability: "INCOMPLETE",
        result: null,
      });
    } finally {
      mutableStores.pop();
    }
  });

  it("evaluates only the Training records that exist in the Period", () => {
    const training: KpiTrainingRecord = {
      storeId: "STORE-1",
      month: "2026-01",
      isRequired: true,
      isFullyCompleted: true,
    };
    const row = buildKpiRows(
      q1Context,
      snapshot({ training: available(training) }),
    )[0];

    expect(row.training).toEqual({
      availability: "AVAILABLE",
      result: "ACHIEVED",
    });
  });

  it("returns NOT_ACHIEVED when an existing required Training is incomplete", () => {
    const training: KpiTrainingRecord = {
      storeId: "STORE-1",
      month: "2026-02",
      isRequired: true,
      isFullyCompleted: false,
    };
    const row = buildKpiRows(
      q1Context,
      snapshot({ training: available(training) }),
    )[0];

    expect(row.training).toEqual({
      availability: "AVAILABLE",
      result: "NOT_ACHIEVED",
    });
  });

  it("preserves confirmed empty semantics", () => {
    const row = buildKpiRows(q1Context, snapshot())[0];

    expect(row.training).toEqual({
      availability: "CONFIRMED_EMPTY",
      result: "ACHIEVED",
    });
    expect(row.drill).toEqual({
      availability: "CONFIRMED_EMPTY",
      result: "NOT_ACHIEVED",
    });
    expect(row.inspections).toEqual({
      availability: "CONFIRMED_EMPTY",
      result: "NOT_ACHIEVED",
    });
  });

  it("does not turn unavailable data into a conclusion", () => {
    const row = buildKpiRows(
      q1Context,
      snapshot({
        training: unavailable(),
        drills: unavailable(),
        inspections: unavailable(),
      }),
    )[0];

    expect(row.training.result).toBe("UNDETERMINED");
    expect(row.drill.result).toBe("UNDETERMINED");
    expect(row.inspections.result).toBe("UNDETERMINED");
  });

  it("keeps INCOMPLETE performance sources UNDETERMINED", () => {
    const drill: KpiDrillRecord = {
      storeId: "STORE-1",
      month: "2026-01",
      isCompleted: true,
    };
    const row = buildKpiRows(
      q1Context,
      snapshot({
        training: incomplete<KpiTrainingRecord>(),
        drills: incomplete(drill),
        inspections: incomplete(),
      }),
    )[0];

    expect(row.training).toEqual({
      availability: "INCOMPLETE",
      result: "UNDETERMINED",
    });
    expect(row.drill).toEqual({
      availability: "INCOMPLETE",
      result: "UNDETERMINED",
    });
    expect(row.inspections).toEqual({
      availability: "INCOMPLETE",
      result: "UNDETERMINED",
    });
  });

  it("distinguishes confirmed empty ASTM data from unavailable ASTM data", () => {
    const emptyResult = buildKpiRows(q1Context, snapshot())[0].astmEvents;
    const unavailableResult = buildKpiRows(
      q1Context,
      snapshot({ events: unavailable<NormalizedEventRecord>() }),
    )[0].astmEvents;

    expect(emptyResult).toEqual({
      availability: "CONFIRMED_EMPTY",
      result: "NOT_OCCURRED",
    });
    expect(unavailableResult).toEqual({
      availability: "UNAVAILABLE",
      result: null,
    });
  });

  it("keeps INCOMPLETE ASTM data inconclusive", () => {
    const result = buildKpiRows(
      q1Context,
      snapshot({ events: incomplete<NormalizedEventRecord>() }),
    )[0].astmEvents;

    expect(result).toEqual({ availability: "INCOMPLETE", result: null });
  });

  it("does not cross-contaminate records between stores", () => {
    const rowByStore = new Map(
      buildKpiRows(
        q1Context,
        snapshot({
          events: available(event("STORE-1", "Yes")),
        }),
      ).map((row) => [row.store.storeId, row]),
    );

    expect(rowByStore.get("STORE-1")?.astmEvents.result).toBe("OCCURRED");
    expect(rowByStore.get("STORE-2")?.astmEvents.result).toBe(
      "NOT_OCCURRED",
    );
  });

  it("treats a confirmed empty Action aggregate as no actions", () => {
    const actions = buildKpiRows(q1Context, snapshot())[0].actions;

    expect(actions.value).toBeNull();
    expect(actions.result).toBe("ACHIEVED");
    expect(actions.availability).toBe("CONFIRMED_EMPTY");
  });

  it.each([
    [92, "ACHIEVED"],
    [90, "ACHIEVED"],
    [89, "NOT_ACHIEVED"],
  ] as const)("evaluates an available Action aggregate of %s", (value, result) => {
    const aggregate: KpiActionClosureRateRecord = {
      storeId: "STORE-1",
      value,
    };
    const actions = buildKpiRows(
      q1Context,
      snapshot({ actionClosureRates: available(aggregate) }),
    )[0].actions;

    expect(actions).toMatchObject({ availability: "AVAILABLE", value, result });
  });

  it("preserves a null aggregate as confirmed no-actions without inventing 100", () => {
    const aggregate: KpiActionClosureRateRecord = {
      storeId: "STORE-1",
      value: null,
    };
    const actions = buildKpiRows(
      q1Context,
      snapshot({ actionClosureRates: available(aggregate) }),
    )[0].actions;

    expect(actions).toMatchObject({
      availability: "CONFIRMED_EMPTY",
      value: null,
      result: "ACHIEVED",
    });
    expect(actions.value).not.toBe(100);
  });

  it.each(["INCOMPLETE", "UNAVAILABLE"] as const)(
    "keeps %s Action data undetermined instead of displaying no-actions",
    (availability) => {
      const actionClosureRates =
        availability === "INCOMPLETE"
          ? incomplete<KpiActionClosureRateRecord>()
          : unavailable<KpiActionClosureRateRecord>();
      const actions = buildKpiRows(
        q1Context,
        snapshot({ actionClosureRates }),
      )[0].actions;

      expect(actions).toMatchObject({
        availability,
        value: null,
        result: "UNDETERMINED",
      });
    },
  );

  it("does not average multiple Action aggregate values", () => {
    const actions = buildKpiRows(
      q1Context,
      snapshot({
        actionClosureRates: available<KpiActionClosureRateRecord>(
          { storeId: "STORE-1", value: 40 },
          { storeId: "STORE-1", value: 80 },
        ),
      }),
    )[0].actions;

    expect(actions.value).toBeNull();
    expect(actions.availability).toBe("INCOMPLETE");
    expect(actions.result).toBe("UNDETERMINED");
  });

  it("preserves the repository-normalized OPEN Action query for the selected store", () => {
    const data = available(
      action("STORE-1", "ASSIGNED", { kind: "KNOWN", value: "Assigned" }),
      action("STORE-1", "IN-PROGRESS", {
        kind: "KNOWN",
        value: "In Progress",
      }),
      action("STORE-1", "IN-REVIEW", {
        kind: "KNOWN",
        value: "In Review",
      }),
      action("STORE-1", "SIGN-OFF", {
        kind: "KNOWN",
        value: "Sign Off",
      }),
      action("STORE-2", "OTHER-STORE", {
        kind: "KNOWN",
        value: "Assigned",
      }),
    );
    const openActions = buildKpiRows(
      q1Context,
      snapshot({ actions: data }),
    )[0].actions.openActions;

    expect(openActions.items.map(({ actionId }) => actionId)).toEqual([
      "ASSIGNED",
      "IN-PROGRESS",
      "IN-REVIEW",
      "SIGN-OFF",
    ]);
  });

  it("keeps the source Action aggregate independent of detail statuses", () => {
    const actionClosureRates = available<KpiActionClosureRateRecord>({
      storeId: "STORE-1",
      value: 92,
    });
    const openDetails = available(
      action("STORE-1", "OPEN", { kind: "KNOWN", value: "Assigned" }),
    );
    const noOpenDetails = confirmedEmpty<NormalizedActionRecord>();

    const withOpenDetails = buildKpiRows(
      q1Context,
      snapshot({ actionClosureRates, actions: openDetails }),
    )[0].actions;
    const withoutOpenDetails = buildKpiRows(
      q1Context,
      snapshot({ actionClosureRates, actions: noOpenDetails }),
    )[0].actions;

    expect(withOpenDetails).toMatchObject({ value: 92, result: "ACHIEVED" });
    expect(withoutOpenDetails).toMatchObject({ value: 92, result: "ACHIEVED" });
    expect(withOpenDetails.openActions.items).toHaveLength(1);
    expect(withoutOpenDetails.openActions.items).toHaveLength(0);
  });

  it("does not mutate its inputs", () => {
    const input = snapshot({
      events: available(event("STORE-1", "Yes")),
    });
    const before = structuredClone(input);
    Object.freeze(input.stores);
    Object.freeze(input.events.items);
    Object.freeze(input);

    buildKpiRows(q1Context, input);

    expect(input).toEqual(before);
  });
});
