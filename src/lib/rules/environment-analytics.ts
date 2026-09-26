import type {
  EnvironmentAnalyticsResult,
} from "@/data/contracts/environment";
import type {
  DataAvailability,
  KpiPeriod,
} from "@/data/contracts/kpi";
import type { NormalizedEnvironmentRecord } from "@/data/contracts/environment";
import { parseKpiPeriod } from "@/data/contracts/kpi-period";
import { isValidIsoDate } from "@/lib/rules/expiry";

function hasValidContractOnDate(
  record: NormalizedEnvironmentRecord,
  category: "hazardousWaste" | "generalIndustrialSolidWaste",
  referenceDate: string,
) {
  return record.wasteContracts[category].some(
    ({ validTo }) =>
      isValidIsoDate(referenceDate) &&
      validTo !== null &&
      isValidIsoDate(validTo) &&
      validTo >= referenceDate,
  );
}

export function buildEnvironmentAnalytics(
  availability: DataAvailability,
  records: readonly NormalizedEnvironmentRecord[],
  eligibleStoreCount: number,
  period: KpiPeriod | null,
  referenceDate: string,
): EnvironmentAnalyticsResult {
  const canCalculateHoldingRate =
    eligibleStoreCount > 0 &&
    (availability === "AVAILABLE" || availability === "CONFIRMED_EMPTY");
  const hazardousStoresWithValidContract = records.filter((record) =>
    hasValidContractOnDate(record, "hazardousWaste", referenceDate),
  ).length;
  const solidStoresWithValidContract = records.filter((record) =>
    hasValidContractOnDate(record, "generalIndustrialSolidWaste", referenceDate),
  ).length;
  const hazardousWasteContractHolding = {
    storesWithValidContractCount: hazardousStoresWithValidContract,
    eligibleStoreCount,
    rate: canCalculateHoldingRate
      ? (hazardousStoresWithValidContract / eligibleStoreCount) * 100
      : null,
  } as const;
  const solidWasteContractHolding = {
    storesWithValidContractCount: solidStoresWithValidContract,
    eligibleStoreCount,
    rate: canCalculateHoldingRate
      ? (solidStoresWithValidContract / eligibleStoreCount) * 100
      : null,
  } as const;

  const periodMonths =
      period === null || parseKpiPeriod(period) === null
        ? null
      : new Set<string>(period.includedMonths);
  let expiringContractCount = 0;
  let excludedContractMissingOrInvalidExpiryDateCount = 0;

  for (const record of records) {
    for (const contract of [
      ...record.wasteContracts.hazardousWaste,
      ...record.wasteContracts.generalIndustrialSolidWaste,
    ]) {
      const expiryDate = contract.validTo;
      if (expiryDate === null || !isValidIsoDate(expiryDate)) {
        excludedContractMissingOrInvalidExpiryDateCount += 1;
      } else if (periodMonths?.has(expiryDate.slice(0, 7))) {
        expiringContractCount += 1;
      }
    }
  }

  return {
    availability,
    periodMonths: period?.includedMonths ?? null,
    hazardousWasteContractHolding,
    solidWasteContractHolding,
    expiringContractCount:
      periodMonths !== null &&
      (availability === "AVAILABLE" || availability === "CONFIRMED_EMPTY")
        ? expiringContractCount
        : null,
    excludedContractMissingOrInvalidExpiryDateCount,
  };
}
