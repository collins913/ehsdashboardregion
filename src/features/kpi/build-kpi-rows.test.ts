import { evaluateKpiDomain } from "@/lib/rules/kpi-domain";
import { describe, expect, it } from "vitest";
import {
  mockStores,
} from "@/data/mock";
import { MOCK_V1_REQUIRED_TRAINING_ITEMS } from "@/data/mock/overview-required-sets";
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
import type { NormalizedEventRecord } from "@/data/contracts/event-record";
import { buildKpiRows } from "@/features/kpi/build-kpi-rows";
import type { StoreMasterData } from "@/types/ehs";

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
  const source = {
    stores,
    training: confirmedEmpty<KpiTrainingRecord>(),
    drills: confirmedEmpty<KpiDrillRecord>(),
    inspections: confirmedEmpty<import("@/data/contracts/kpi").KpiInspectionRecord>(),
    actionClosureRates: confirmedEmpty<KpiActionClosureRateRecord>(),
    events: confirmedEmpty<NormalizedEventRecord>(),
    ...overrides,
  };
  return { ...source, domainResults: source.stores.map((store) => {
    const scoped = <T extends { storeId: string }>(data: DataSet<T>) => ({
      availability: data.availability === "AVAILABLE" && !data.items.some((item) => item.storeId === store.storeId) ? "CONFIRMED_EMPTY" as const : data.availability,
      items: data.items.filter((item) => item.storeId === store.storeId),
    });
    return evaluateKpiDomain({ store, months: q1Context.period.includedMonths,
      training: scoped(source.training), drills: scoped(source.drills), inspections: scoped(source.inspections),
      actionClosureRates: scoped(source.actionClosureRates), events: scoped(source.events) }, null);
  }) };
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

    expect(rows).toHaveLength(mockStores.filter(({ region }) => region === "南屿区").length);
    expect(rows.every(({ store }) => store.region === "南屿区")).toBe(true);
  });

  it("honors repository Area filtering", async () => {
    const context: EhsFilterContext = {
      ...q1Context,
      area: { kind: "INCLUDE", values: ["西岭二部"] },
    };
    const rows = buildKpiRows(context, await mockEhsRepository.getKpiData(context));

    expect(rows.map(({ store }) => store.storeId)).toEqual(
      mockStores.filter(({ area }) => area === "西岭二部").map(({ trtid }) => trtid),
    );
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

    expect(data.training.items.map(({ month }) => month)).toEqual(
      Array(MOCK_V1_REQUIRED_TRAINING_ITEMS.length).fill("2026-03"),
    );
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
      trtid: "TEST-051",
      regionOwner: null,
      regionOwnerEmail: null,
      areaOwner: null,
      areaOwnerEmail: null,
      manager: "测试经理",
      managerEmail: null,
      ehsAmbassador: "测试专员",
      ehsAmbassadorEmail: null,
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

  it("does not infer the Training requirement KPI from source fields", () => {
    const training: KpiTrainingRecord = {
      storeId: "STORE-1",
      month: "2026-01",
      trainingName: "培训项目",
      completionRate: 100,
      incompletePeople: [],
    };
    const row = buildKpiRows(
      q1Context,
      snapshot({ training: available(training) }),
    )[0];

    expect(row.training).toEqual({
      availability: "AVAILABLE",
      result: "UNDETERMINED",
    });
  });

  it("keeps requirement-dependent Training and Inspection results undetermined", () => {
    const row = buildKpiRows(q1Context, snapshot())[0];

    expect(row.training).toEqual({
      availability: "CONFIRMED_EMPTY",
      result: "UNDETERMINED",
    });
    expect(row.drill).toEqual({
      availability: "CONFIRMED_EMPTY",
      result: "NOT_ACHIEVED",
    });
    expect(row.inspections).toEqual({
      availability: "CONFIRMED_EMPTY",
      result: "UNDETERMINED",
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
      status: "已完成",
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

  it("keeps the source Action aggregate in the summary without detail records", () => {
    const actionClosureRates = available<KpiActionClosureRateRecord>({
      storeId: "STORE-1",
      value: 92,
    });
    const actions = buildKpiRows(
      q1Context,
      snapshot({ actionClosureRates }),
    )[0].actions;

    expect(actions).toEqual({
      availability: "AVAILABLE",
      value: 92,
      result: "ACHIEVED",
    });
    expect("openActions" in actions).toBe(false);
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
