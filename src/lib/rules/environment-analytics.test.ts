import { describe, expect, it } from "vitest";
import type { NormalizedEnvironmentRecord } from "@/data/contracts/environment";
import { periodFromMonthRange } from "@/data/contracts/kpi-period";
import type { IsoDate } from "@/types/ehs";
import { buildEnvironmentAnalytics } from "./environment-analytics";

function record(
  storeId: string,
  hazardousExpiryDates: readonly (IsoDate | null)[] = [],
  solidExpiryDates: readonly (IsoDate | null)[] = [],
): NormalizedEnvironmentRecord {
  const contracts = (expiryDates: readonly (IsoDate | null)[]) =>
    expiryDates.map((validTo, index) => ({
      supplierName: `供应商 ${index + 1}`,
      wasteType: "废弃物",
      validFrom: null,
      validTo,
    }));

  return {
    storeId,
    storeDisplayName: storeId,
    facilityInformation: null,
    environmentalLicenses: {
      environmentalImpactAssessment: {
        assessmentText: null,
        totalRequirements: {
          airParticulate: null,
          airVocs: null,
          waterAmmoniaNitrogen: null,
          waterTotalNitrogen: null,
          waterTotalPhosphorus: null,
          waterCodCr: null,
        },
      },
      dischargePermit: {
        permitText: null,
        executionReport: null,
        permitNumber: null,
        validFrom: null,
        validTo: null,
        totalRequirements: { productionCapacity: null, approvedCoatingUsage: null },
        remarks: null,
      },
      drainagePermit: {
        carWash: null,
        drainagePermitText: null,
        validFrom: null,
        validTo: null,
        remarks: null,
      },
    },
    emergencyPlan: { filingStatus: null, filingNumber: null, validFrom: null, validTo: null, remarks: null },
    monitoring: { monitoringText: "无" },
    wasteContracts: {
      hazardousWaste: contracts(hazardousExpiryDates),
      generalIndustrialSolidWaste: contracts(solidExpiryDates),
    },
  };
}

const period = periodFromMonthRange("2026-07", "2026-09")!;

describe("Environment Analytics rules", () => {
  it("counts holding once per store despite multiple contracts and keeps snapshot rates Period-independent", () => {
    const records = [
      record("STORE-1", ["2026-09-15", "2026-08-20", null, "2026-02-30"], ["2026-09-30"]),
      record("STORE-2", [], ["2026-08-01"]),
      record("STORE-3", [null, "2026-02-30"]),
    ];
    const referenceDate: IsoDate = "2026-09-15";
    const current = buildEnvironmentAnalytics("AVAILABLE", records, 3, period, referenceDate);
    const anotherPeriod = buildEnvironmentAnalytics("AVAILABLE", records, 3, periodFromMonthRange("2026-10", "2026-11"), referenceDate);

    expect(current.hazardousWasteContractHolding).toMatchObject({ storesWithValidContractCount: 1, eligibleStoreCount: 3 });
    expect(current.hazardousWasteContractHolding.rate).toBeCloseTo(100 / 3);
    expect(current.solidWasteContractHolding).toMatchObject({ storesWithValidContractCount: 1, eligibleStoreCount: 3 });
    expect(current.solidWasteContractHolding.rate).toBeCloseTo(100 / 3);
    expect(current.expiringContractCount).toBe(4);
    expect(current.excludedContractMissingOrInvalidExpiryDateCount).toBe(4);
    expect(anotherPeriod.hazardousWasteContractHolding).toEqual(current.hazardousWasteContractHolding);
    expect(anotherPeriod.solidWasteContractHolding).toEqual(current.solidWasteContractHolding);
    expect(anotherPeriod.expiringContractCount).toBe(0);
  });

  it("returns zero holdings for complete empty data and null results for incomplete data", () => {
    const empty = buildEnvironmentAnalytics("CONFIRMED_EMPTY", [], 3, period, "2026-09-15");
    expect(empty.hazardousWasteContractHolding).toEqual({ storesWithValidContractCount: 0, eligibleStoreCount: 3, rate: 0 });
    expect(empty.solidWasteContractHolding.rate).toBe(0);
    expect(empty.expiringContractCount).toBe(0);

    const incomplete = buildEnvironmentAnalytics("INCOMPLETE", [record("STORE-1", ["2026-09-30"])], 3, period, "2026-09-15");
    expect(incomplete.hazardousWasteContractHolding.rate).toBeNull();
    expect(incomplete.solidWasteContractHolding.rate).toBeNull();
    expect(incomplete.expiringContractCount).toBeNull();
  });

  it("does not produce holding rates with no eligible stores or an expiry count without a valid Period", () => {
    const result = buildEnvironmentAnalytics("AVAILABLE", [record("STORE-1", ["2026-09-30"])], 0, null, "2026-09-15");
    expect(result.hazardousWasteContractHolding.rate).toBeNull();
    expect(result.solidWasteContractHolding.rate).toBeNull();
    expect(result.periodMonths).toBeNull();
    expect(result.expiringContractCount).toBeNull();
  });
});
