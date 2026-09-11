import { describe, expect, it } from "vitest";
import { createKpiMockData } from "@/data/mock/kpi-mock-factory";
import { parseActionStatus } from "@/data/parse-action-status";
import { createMockEhsRepository } from "./mock-ehs-repository";

const referenceDate = new Date("2026-02-15T00:00:00+08:00");
const mockData = createKpiMockData(referenceDate);
const mockEhsRepository = createMockEhsRepository(referenceDate);

describe("Action source status parsing", () => {
  it("passes source Status values through the parser in the Repository", () => {
    const repositoryRecords = mockEhsRepository.listActionRecords();

    expect(repositoryRecords).toHaveLength(mockData.actionRecords.length);
    expect(repositoryRecords.map(({ Status }) => Status)).toEqual(
      mockData.actionRecords.map(({ Status }) => parseActionStatus(Status)),
    );
  });

  it("preserves an undocumented source Status as UNKNOWN", () => {
    expect(parseActionStatus("PendingReview")).toEqual({
      kind: "UNKNOWN",
      value: "PendingReview",
    });
  });
});

describe("normalized filter stores", () => {
  it("exposes canonical storeId values through the Repository boundary", () => {
    const stores = mockEhsRepository.listFilterStores();

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
