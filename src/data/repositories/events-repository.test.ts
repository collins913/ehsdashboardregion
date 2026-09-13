import { describe, expect, it } from "vitest";
import type { EventsViewMode } from "@/data/contracts/events";
import type { KpiFilterContext } from "@/data/contracts/kpi";
import { periodFromMonthRange } from "@/data/contracts/kpi-period";
import { mockStores } from "@/data/mock/stores";
import { createMockEhsRepository } from "@/data/repositories/mock-ehs-repository";
import type {
  EventRecord,
  EventType,
  IsoDateTime,
  StoreReference,
} from "@/types/ehs";

const referenceDate = new Date("2026-09-11T00:00:00+08:00");

function context(
  startMonth = "2026-07" as const,
  endMonth = "2026-09" as const,
): KpiFilterContext {
  return {
    region: { kind: "ALL" },
    area: { kind: "ALL" },
    store: { kind: "ALL" },
    period: periodFromMonthRange(startMonth, endMonth)!,
  };
}

function event({
  eventId,
  storeReference = { trtid: mockStores[0].trtid },
  eventType = "Agency Contact",
  eventDate = "2026-09-01T09:30:00",
  Status = "Open",
}: {
  eventId: string;
  storeReference?: StoreReference;
  eventType?: EventType;
  eventDate?: IsoDateTime;
  Status?: string;
}): EventRecord {
  return {
    eventId,
    storeReference,
    eventType,
    submittedBy: "提交人",
    eventDate,
    EventDetail: { Description: `${eventId} 的完整描述` },
    Status,
    ASTMInjuryIllness: "No",
  };
}

function query(
  viewMode: EventsViewMode,
  filters: KpiFilterContext = context(),
  eventType?: EventType,
) {
  return createMockEhsRepository(referenceDate).getEvents({
    context: filters,
    viewMode,
    eventType,
  });
}

describe("scoped Events repository query", () => {
  it("uses TRTID and the existing English-name fallback for canonical stores", () => {
    const repository = createMockEhsRepository(referenceDate, {
      eventRecords: [
        event({ eventId: "TRTID" }),
        event({
          eventId: "ENGLISH",
          storeReference: { storeNameEn: mockStores[1].storeNameEn },
        }),
      ],
    });
    const result = repository.getEvents({ context: context(), viewMode: "ALL" });

    expect(result.items.map(({ storeId }) => storeId)).toEqual([
      mockStores[0].trtid,
      mockStores[1].trtid,
    ]);
    expect(result.items.map(({ storeDisplayName }) => storeDisplayName)).toEqual([
      mockStores[0].storeNameCn,
      mockStores[1].storeNameCn,
    ]);
  });

  it("applies Region, Area and canonical Store scopes", () => {
    const base = context();
    const region = query("ALL", {
      ...base,
      region: { kind: "INCLUDE", values: [mockStores[0].region] },
    });
    const area = query("ALL", {
      ...base,
      area: { kind: "INCLUDE", values: [mockStores[0].area] },
    });
    const store = query("ALL", {
      ...base,
      store: { kind: "INCLUDE", values: [mockStores[0].trtid] },
    });

    expect(region.items.length).toBeGreaterThan(0);
    expect(area.items.length).toBeGreaterThan(0);
    expect(store.items.length).toBeGreaterThan(0);
    expect(region.items.every(({ storeId }) =>
      mockStores.filter(({ region }) => region === mockStores[0].region)
        .some(({ trtid }) => trtid === storeId),
    )).toBe(true);
    expect(area.items.every(({ storeId }) =>
      mockStores.filter(({ area }) => area === mockStores[0].area)
        .some(({ trtid }) => trtid === storeId),
    )).toBe(true);
    expect(store.items.every(({ storeId }) => storeId === mockStores[0].trtid)).toBe(true);
  });

  it("uses Event Date and the half-open Period boundary", () => {
    const repository = createMockEhsRepository(referenceDate, {
      eventRecords: [
        event({ eventId: "BEFORE", eventDate: "2026-06-30T23:59:59" }),
        event({ eventId: "START", eventDate: "2026-07-01T00:00:00" }),
        event({ eventId: "END", eventDate: "2026-10-01T00:00:00" }),
      ],
    });
    const result = repository.getEvents({ context: context(), viewMode: "ALL" });

    expect(result.items.map(({ eventId }) => eventId)).toEqual(["START"]);
    expect(result.items[0]?.eventDate).toBe("2026-07-01T00:00:00+08:00");
  });

  it("supports Current Open and All with centralized states", () => {
    const repository = createMockEhsRepository(referenceDate, {
      eventRecords: [
        event({ eventId: "OPEN", Status: "Open" }),
        event({ eventId: "CLOSED", Status: "Closed" }),
      ],
    });

    expect(
      repository.getEvents({ context: context(), viewMode: "OPEN_ONLY" }).items
        .map(({ eventId }) => eventId),
    ).toEqual(["OPEN"]);
    expect(
      repository.getEvents({ context: context(), viewMode: "ALL" }).items
        .map(({ recordState }) => recordState),
    ).toEqual(["OPEN", "CLOSED"]);
  });

  it("filters by the normalized source Event Type without a fixed taxonomy", () => {
    const newType = "Community Visit";
    const repository = createMockEhsRepository(referenceDate, {
      eventRecords: [
        event({ eventId: "AGENCY", eventType: "Agency Contact" }),
        event({ eventId: "NEW", eventType: newType }),
      ],
    });
    const result = repository.getEvents({
      context: context(),
      viewMode: "ALL",
      eventType: newType,
    });

    expect(result.items.map(({ eventId }) => eventId)).toEqual(["NEW"]);
    expect(result.items[0]?.eventType).toBe(newType);
  });

  it("generates a deterministic current-quarter set large enough for adaptive pagination", () => {
    const repository = createMockEhsRepository(referenceDate);
    const openEvents = repository.getEvents({
      context: context(),
      viewMode: "OPEN_ONLY",
    });

    expect(repository.getEvents({ context: context(), viewMode: "ALL" }).items)
      .toHaveLength(18);
    expect(openEvents.items).toHaveLength(15);
    expect(new Set(openEvents.items.map(({ eventType }) => eventType))).toEqual(
      new Set([
        "Injury/Illness",
        "Auto Event",
        "General Liability",
        "Environmental",
        "Agency Contact",
        "Near Miss",
      ]),
    );
  });

  it("feeds KPI ASTM data from the same normalized Events query", () => {
    const repository = createMockEhsRepository(referenceDate);
    const filters = context();

    expect(repository.getKpiData(filters).events).toEqual(
      repository.getEvents({ context: filters, viewMode: "ALL" }),
    );
  });

  it("returns INCOMPLETE outside Event source coverage", () => {
    expect(query("ALL", {
      ...context(),
      period: periodFromMonthRange("2026-10", "2026-10")!,
    })).toEqual({ availability: "INCOMPLETE", items: [] });
  });

  it("returns CONFIRMED_EMPTY only for a covered empty result", () => {
    const repository = createMockEhsRepository(referenceDate, {
      eventRecords: [],
    });

    expect(repository.getEvents({ context: context(), viewMode: "ALL" })).toEqual({
      availability: "CONFIRMED_EMPTY",
      items: [],
    });
  });

  it("marks conflicting Store references incomplete", () => {
    const repository = createMockEhsRepository(referenceDate, {
      eventRecords: [
        event({
          eventId: "CONFLICT",
          storeReference: {
            trtid: mockStores[0].trtid,
            storeNameEn: mockStores[1].storeNameEn,
          },
        }),
      ],
    });

    expect(repository.getEvents({ context: context(), viewMode: "ALL" })).toEqual({
      availability: "INCOMPLETE",
      items: [],
    });
  });

  it("keeps a correct TRTID available when the raw English name is historical", () => {
    const repository = createMockEhsRepository(referenceDate, {
      eventRecords: [
        event({
          eventId: "HISTORICAL-NAME",
          storeReference: {
            trtid: mockStores[0].trtid,
            storeNameEn: "Historical Pine Store Name",
          },
        }),
      ],
    });
    const result = repository.getEvents({ context: context(), viewMode: "ALL" });

    expect(result.availability).toBe("AVAILABLE");
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      storeId: mockStores[0].trtid,
      storeDisplayName: mockStores[0].storeNameCn,
    });
  });
});
