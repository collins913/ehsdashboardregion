import { describe, expect, it } from "vitest";
import { createKpiMockData } from "@/data/mock/kpi-mock-factory";
import { parseActionStatus } from "@/data/parse-action-status";
import { createMockEhsRepository } from "./mock-ehs-repository";

const referenceDate = new Date("2026-02-15T00:00:00+08:00");
const mockData = createKpiMockData(referenceDate);
const mockEhsRepository = createMockEhsRepository(referenceDate);

describe("Action source status parsing", () => {
  it("passes source Status values through the parser in the Repository", async () => {
    const repositoryRecords = (await mockEhsRepository.getActions({
      context: {
        region: { kind: "ALL" },
        area: { kind: "ALL" },
        store: { kind: "ALL" },
        period: mockData.supportedPeriod,
      },
      viewMode: "ALL",
      pageIndex: 0,
      pageSize: 100,
    })).items;

    expect(repositoryRecords).toHaveLength(mockData.actionRecords.length);
    expect(new Set(mockData.actionRecords.map(({ Status }) => Status))).toEqual(
      new Set([
        "Assigned",
        "In Progress",
        "Closed",
        "Cancelled",
        "In Review",
        "Sign Off",
        "Pending Verification",
      ]),
    );
    expect(new Set(repositoryRecords.map(({ sourceStatus }) => JSON.stringify(sourceStatus))))
      .toEqual(new Set(mockData.actionRecords.map(({ Status }) => JSON.stringify(parseActionStatus(Status)))));
  });

  it.each([
    "Assigned",
    "In Progress",
    "In Review",
    "Sign Off",
    "Closed",
    "Cancelled",
  ] as const)("preserves the known raw Action status %s", (status) => {
    expect(parseActionStatus(status)).toEqual({ kind: "KNOWN", value: status });
  });

  it("preserves an undocumented source Status as UNKNOWN", () => {
    expect(parseActionStatus("PendingReview")).toEqual({
      kind: "UNKNOWN",
      value: "PendingReview",
    });
  });
});

describe("normalized filter stores", () => {
  it("exposes canonical storeId values through the Repository boundary", async () => {
    const stores = await mockEhsRepository.getFilterStores();

    expect(stores.length).toBeGreaterThan(0);
    expect(stores[0]).toEqual({
      storeId: expect.any(String),
      displayName: expect.any(String),
      region: expect.any(String),
      area: expect.any(String),
    });
    expect(Object.keys(stores[0]).sort()).toEqual([
      "area",
      "displayName",
      "region",
      "storeId",
    ]);
  });
});
