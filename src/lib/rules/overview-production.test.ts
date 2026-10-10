import { describe, expect, it, vi } from "vitest";
import { produceOverviewScoreData, type OverviewDomainReaders } from "./overview-production";
import type { CertificatesStoreRow } from "@/data/contracts/certificates";
import { CERTIFICATE_CATEGORIES } from "./certificate-types";
import type { KpiDomainResult } from "@/data/contracts/domain-result";

const store = { storeId: "PRODUCTION-STORE", displayName: "门店", region: "区域", area: "小区" };
const available = { availability: "AVAILABLE" as const, result: "ACHIEVED" as const, reason: "ACHIEVED" as const };
const domain: KpiDomainResult = { store, training: available, drill: available, inspections: available,
  actions: { ...available, value: 100 }, astmEvents: { availability: "AVAILABLE", result: "NOT_OCCURRED", reason: "ACHIEVED" } };
const goal = { value: 100, result: "ACHIEVED" as const, reason: "ACHIEVED" as const };

describe("repository-independent Overview production", () => {
  it("maps already evaluated domain results and reasons without inferring or reevaluating source values", async () => {
    const referenceDate = vi.fn(() => "2026-01-31");
    const readers: OverviewDomainReaders = {
      performance: vi.fn(async (): Promise<readonly KpiDomainResult[]> => [{ ...domain,
        actions: { ...available, value: 1 }, // A consumer must not reinterpret this authoritative result.
        training: { availability: "INCOMPLETE", result: "UNDETERMINED", reason: "SOURCE_INVALID" },
      }]),
      goals: vi.fn(async () => [{ storeId: store.storeId, closeRate: goal, submissionsPerCapitaYtd: goal, participationRateYtd: goal }]),
      certificates: vi.fn(async (): Promise<readonly CertificatesStoreRow[]> => [{ storeId: store.storeId, storeDisplayName: store.displayName, categories:
        CERTIFICATE_CATEGORIES.map((category) => ({ certificateCategory: category, status: "NORMAL", reason: "ACHIEVED", records: [] })) }]),
    };
    const data = await produceOverviewScoreData([store], [store], ["2026-01"], referenceDate, readers);
    expect(data.contributions).toHaveLength(12);
    expect(data.contributions.find((row) => row.metricId === "ACTION_CLOSURE_RATE")?.earnedPoints).toBe(1);
    expect(data.contributions.find((row) => row.metricId === "TRAINING")).toMatchObject({ earnedPoints: 0, availablePoints: 1, reason: "SOURCE_INVALID" });
    expect(data.contributions.find((row) => row.metricId === "CERTIFICATE_FIRST_AID")?.earnedPoints).toBe(1);
    expect(referenceDate).toHaveBeenCalledTimes(1);
    expect(readers.performance).toHaveBeenCalledTimes(1);
    expect(readers.goals).toHaveBeenCalledTimes(1);
    expect(readers.certificates).toHaveBeenCalledTimes(1);
  });
});
