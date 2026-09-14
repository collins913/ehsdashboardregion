import { describe, expect, it } from "vitest";
import type { EventsViewMode } from "@/data/contracts/events";
import type { EhsFilterContext } from "@/data/contracts/kpi";
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
): EhsFilterContext {
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
  filters: EhsFilterContext = context(),
  eventType?: EventType,
) {
  return createMockEhsRepository(referenceDate).getEvents({
    context: filters,
    viewMode,
    eventType,
    pageIndex: 0,
    pageSize: 100,
  });
}

describe("scoped Events repository query", () => {
  it("uses TRTID and the existing English-name fallback for canonical stores", async () => {
    const repository = createMockEhsRepository(referenceDate, {
      eventRecords: [
        event({ eventId: "TRTID" }),
        event({
          eventId: "ENGLISH",
          storeReference: { storeNameEn: mockStores[1].storeNameEn },
        }),
      ],
    });
    const result = await repository.getEvents({ context: context(), viewMode: "ALL", pageIndex: 0, pageSize: 100 });

    expect(result.items.map(({ storeId }) => storeId).sort()).toEqual([
      mockStores[0].trtid,
      mockStores[1].trtid,
    ]);
    expect(result.items.map(({ storeDisplayName }) => storeDisplayName).sort()).toEqual([
      mockStores[0].storeNameCn,
      mockStores[1].storeNameCn,
    ]);
  });

  it("applies Region, Area and canonical Store scopes", async () => {
    const base = context();
    const region = await query("ALL", {
      ...base,
      region: { kind: "INCLUDE", values: [mockStores[0].region] },
    });
    const area = await query("ALL", {
      ...base,
      area: { kind: "INCLUDE", values: [mockStores[0].area] },
    });
    const store = await query("ALL", {
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

  it("uses Event Date and the half-open Period boundary", async () => {
    const repository = createMockEhsRepository(referenceDate, {
      eventRecords: [
        event({ eventId: "BEFORE", eventDate: "2026-06-30T23:59:59" }),
        event({ eventId: "START", eventDate: "2026-07-01T00:00:00" }),
        event({ eventId: "END", eventDate: "2026-10-01T00:00:00" }),
      ],
    });
    const result = await repository.getEvents({ context: context(), viewMode: "ALL", pageIndex: 0, pageSize: 100 });

    expect(result.items.map(({ eventId }) => eventId)).toEqual(["START"]);
    expect(result.items[0]?.eventDate).toBe("2026-07-01T00:00:00+08:00");
  });

  it("supports Current Open and All with centralized states", async () => {
    const repository = createMockEhsRepository(referenceDate, {
      eventRecords: [
        event({ eventId: "OPEN", Status: "Open" }),
        event({ eventId: "CLOSED", Status: "Closed" }),
      ],
    });

    const open = await repository.getEvents({ context: context(), viewMode: "OPEN_ONLY", pageIndex: 0, pageSize: 100 });
    const all = await repository.getEvents({ context: context(), viewMode: "ALL", pageIndex: 0, pageSize: 100 });
    expect(open.items.map(({ eventId }) => eventId)).toEqual(["OPEN"]);
    expect(all.items.map(({ recordState }) => recordState).sort()).toEqual(["CLOSED", "OPEN"]);
  });

  it("filters by the normalized source Event Type without a fixed taxonomy", async () => {
    const newType = "Community Visit";
    const repository = createMockEhsRepository(referenceDate, {
      eventRecords: [
        event({ eventId: "AGENCY", eventType: "Agency Contact" }),
        event({ eventId: "NEW", eventType: newType }),
      ],
    });
    const result = await repository.getEvents({
      context: context(),
      viewMode: "ALL",
      eventType: newType,
      pageIndex: 0,
      pageSize: 100,
    });

    expect(result.items.map(({ eventId }) => eventId)).toEqual(["NEW"]);
    expect(result.items[0]?.eventType).toBe(newType);
  });

  it("generates a deterministic current-quarter set large enough for adaptive pagination", async () => {
    const repository = createMockEhsRepository(referenceDate);
    const openEvents = await repository.getEvents({
      context: context(),
      viewMode: "OPEN_ONLY",
      pageIndex: 0,
      pageSize: 100,
    });
    const allEvents = await repository.getEvents({ context: context(), viewMode: "ALL", pageIndex: 0, pageSize: 100 });
    expect(allEvents.items).toHaveLength(18);
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

  it("feeds KPI ASTM data from the same normalized Events query", async () => {
    const repository = createMockEhsRepository(referenceDate);
    const filters = context();

    const snapshot = await repository.getKpiData(filters);
    const events = await repository.getEvents({ context: filters, viewMode: "ALL", pageIndex: 0, pageSize: 100 });
    expect(events.items.map(({ eventId }) => eventId).sort()).toEqual(
      snapshot.events.items.map(({ eventId }) => eventId).sort(),
    );
  });

  it("returns INCOMPLETE outside Event source coverage", async () => {
    expect(await query("ALL", {
      ...context(),
      period: periodFromMonthRange("2026-10", "2026-10")!,
    })).toMatchObject({ availability: "INCOMPLETE", items: [] });
  });

  it("returns CONFIRMED_EMPTY only for a covered empty result", async () => {
    const repository = createMockEhsRepository(referenceDate, {
      eventRecords: [],
    });

    expect(await repository.getEvents({ context: context(), viewMode: "ALL", pageIndex: 0, pageSize: 100 })).toMatchObject({
      availability: "CONFIRMED_EMPTY",
      items: [],
    });
  });

  it("marks conflicting Store references incomplete", async () => {
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

    expect(await repository.getEvents({ context: context(), viewMode: "ALL", pageIndex: 0, pageSize: 100 })).toMatchObject({
      availability: "INCOMPLETE",
      items: [],
    });
  });

  it("keeps a correct TRTID available when the raw English name is historical", async () => {
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
    const result = await repository.getEvents({ context: context(), viewMode: "ALL", pageIndex: 0, pageSize: 100 });

    expect(result.availability).toBe("AVAILABLE");
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      storeId: mockStores[0].trtid,
      storeDisplayName: mockStores[0].storeNameCn,
    });
  });

  it("sorts before pagination and keeps filter metadata independent of the page", async () => {
    const repository = createMockEhsRepository(referenceDate, {
      eventRecords: [
        event({ eventId: "EVENT-C", eventType: "Near Miss" }),
        event({ eventId: "EVENT-A", eventType: "Agency Contact" }),
        event({ eventId: "EVENT-B", eventType: "Community Visit" }),
      ],
    });
    const result = await repository.getEvents({
      context: context(),
      viewMode: "ALL",
      sorting: { key: "eventId", direction: "asc" },
      pageIndex: 1,
      pageSize: 2,
    });

    expect(result).toMatchObject({ totalCount: 3, pageIndex: 1, pageSize: 2 });
    expect(result.items.map(({ eventId }) => eventId)).toEqual(["EVENT-C"]);
    expect(result.availableEventTypes).toEqual([
      "Agency Contact",
      "Community Visit",
      "Near Miss",
    ]);
  });

  it.each([5, 7, 10] as const)("supports pageSize %i with stable record identities", async (pageSize) => {
    const repository = createMockEhsRepository(referenceDate);
    const firstPage = await repository.getEvents({
      context: context(), viewMode: "ALL", pageIndex: 0, pageSize,
    });
    const secondPage = await repository.getEvents({
      context: context(), viewMode: "ALL", pageIndex: 1, pageSize,
    });

    expect(firstPage.items).toHaveLength(pageSize);
    expect(secondPage.items.length).toBeGreaterThan(0);
    expect(new Set([...firstPage.items, ...secondPage.items].map(({ eventId }) => eventId)).size)
      .toBe(firstPage.items.length + secondPage.items.length);
    expect(firstPage.availableEventTypes).toEqual(secondPage.availableEventTypes);
  });
});
