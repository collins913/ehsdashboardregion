import type {
  CarWashDrainagePermitRecord,
  DischargePermitRecord,
  EiaRecord,
  EnvironmentalMonitoringRecord,
  WasteContractCategory,
  WasteContractRecord,
} from "@/types/ehs";
import { evaluateExpiry, type ExpiryPolicy } from "./expiry";
import type { AvailabilityState, ComplianceResult } from "./result-types";

function evaluateWasteContractCategory(
  records: readonly WasteContractRecord[],
  category: WasteContractCategory,
  expiryPolicy: ExpiryPolicy,
): ComplianceResult {
  const categoryRecords = records.filter(
    ({ contractCategory }) => contractCategory === category,
  );

  if (categoryRecords.length === 0) {
    return "ABNORMAL";
  }

  const expiryStates = categoryRecords.map(({ expiryDate }) =>
    evaluateExpiry(expiryDate, expiryPolicy),
  );

  if (expiryStates.includes("expired")) {
    return "ABNORMAL";
  }

  return expiryStates.includes("unknown") ? "UNDETERMINED" : "NORMAL";
}

export function evaluateHazardousWasteContracts(
  records: readonly WasteContractRecord[],
  expiryPolicy: ExpiryPolicy,
): ComplianceResult {
  return evaluateWasteContractCategory(
    records,
    "Hazardous Waste Contract",
    expiryPolicy,
  );
}

export function evaluateGeneralSolidWasteContracts(
  records: readonly WasteContractRecord[],
  expiryPolicy: ExpiryPolicy,
): ComplianceResult {
  return evaluateWasteContractCategory(
    records,
    "General Solid Waste Contract",
    expiryPolicy,
  );
}

export function combineWasteContractResults(
  hazardousResult: ComplianceResult,
  generalResult: ComplianceResult,
): ComplianceResult {
  if (hazardousResult === "ABNORMAL" || generalResult === "ABNORMAL") {
    return "ABNORMAL";
  }

  if (
    hazardousResult === "UNDETERMINED" ||
    generalResult === "UNDETERMINED"
  ) {
    return "UNDETERMINED";
  }

  return "NORMAL";
}

export function evaluateCombinedWasteContracts(
  records: readonly WasteContractRecord[],
  expiryPolicy: ExpiryPolicy,
): ComplianceResult {
  return combineWasteContractResults(
    evaluateHazardousWasteContracts(records, expiryPolicy),
    evaluateGeneralSolidWasteContracts(records, expiryPolicy),
  );
}

export function evaluateCarWashDrainagePermit(
  record: Pick<
    CarWashDrainagePermitRecord,
    "hasCarWash" | "hasDrainagePermit" | "permitExpiryDate"
  >,
  expiryPolicy: ExpiryPolicy,
): ComplianceResult {
  if (record.hasCarWash === null) {
    return "UNDETERMINED";
  }

  if (!record.hasCarWash) {
    return "NORMAL";
  }

  if (record.hasDrainagePermit === null) {
    return "UNDETERMINED";
  }

  if (!record.hasDrainagePermit) {
    return "ABNORMAL";
  }

  const expiryState = evaluateExpiry(record.permitExpiryDate, expiryPolicy);
  if (expiryState === "expired") {
    return "ABNORMAL";
  }

  return expiryState === "unknown" ? "UNDETERMINED" : "NORMAL";
}

export function evaluateEia(
  record: Pick<EiaRecord, "eiaRequired" | "eiaInformation">,
): ComplianceResult {
  if (record.eiaRequired === null) {
    return "UNDETERMINED";
  }

  if (!record.eiaRequired) {
    return "NORMAL";
  }

  return record.eiaInformation === null ? "ABNORMAL" : "NORMAL";
}

export function evaluateDischargePermit(
  record: Pick<
    DischargePermitRecord,
    "dischargePermitRequired" | "permitInformation" | "expiryDate"
  >,
  expiryPolicy: ExpiryPolicy,
): ComplianceResult {
  if (record.dischargePermitRequired === null) {
    return "UNDETERMINED";
  }

  if (!record.dischargePermitRequired) {
    return "NORMAL";
  }

  if (record.permitInformation === null) {
    return "ABNORMAL";
  }

  const expiryState = evaluateExpiry(record.expiryDate, expiryPolicy);
  if (expiryState === "expired") {
    return "ABNORMAL";
  }

  return expiryState === "unknown" ? "UNDETERMINED" : "NORMAL";
}

export function evaluateEnvironmentalMonitoringAvailability(
  records: readonly EnvironmentalMonitoringRecord[],
): AvailabilityState {
  return records.length === 0 ? "NONE" : "AVAILABLE";
}
