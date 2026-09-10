import type {
  CertificateRecord,
  CertificateRequirement,
} from "@/types/ehs";
import type { ExpiryPolicy } from "./expiry";
import { evaluateExpiry } from "./expiry";

export interface CertificateSlotAssignment {
  requiredSlot: string;
  certificate: CertificateRecord;
}

export type CertificateCategoryEvaluation =
  | {
      outcome: "normal";
      displayStatus: "正常";
      businessResult: "正常";
      assignments: CertificateSlotAssignment[];
      extraCertificates: CertificateRecord[];
    }
  | {
      outcome: "abnormal";
      displayStatus: "无" | "异常";
      businessResult: "异常";
      reason: "no-records" | "missing-slots" | "expired";
      missingSlots: string[];
      assignments: CertificateSlotAssignment[];
      extraCertificates: CertificateRecord[];
    }
  | {
      outcome: "indeterminate";
      reason: "expiry-undetermined";
      assignments: CertificateSlotAssignment[];
      extraCertificates: CertificateRecord[];
    };

function assignSlots(
  records: readonly CertificateRecord[],
  requirement: CertificateRequirement,
): {
  assignments: CertificateSlotAssignment[];
  missingSlots: string[];
  extraCertificates: CertificateRecord[];
} {
  const recordToSlot = new Map<number, number>();

  function findMatch(slotIndex: number, visited: Set<number>): boolean {
    const slot = requirement.slots[slotIndex];

    for (let recordIndex = 0; recordIndex < records.length; recordIndex += 1) {
      if (
        visited.has(recordIndex) ||
        !slot.certificateTypes.includes(records[recordIndex].certificateType)
      ) {
        continue;
      }

      visited.add(recordIndex);
      const currentSlot = recordToSlot.get(recordIndex);
      if (
        currentSlot === undefined ||
        findMatch(currentSlot, visited)
      ) {
        recordToSlot.set(recordIndex, slotIndex);
        return true;
      }
    }

    return false;
  }

  const matchedSlots = new Set<number>();
  for (let slotIndex = 0; slotIndex < requirement.slots.length; slotIndex += 1) {
    if (findMatch(slotIndex, new Set())) {
      matchedSlots.add(slotIndex);
    }
  }

  const assignments = [...recordToSlot.entries()].map(
    ([recordIndex, slotIndex]) => ({
      requiredSlot: requirement.slots[slotIndex].requiredSlot,
      certificate: records[recordIndex],
    }),
  );
  const assignedRecords = new Set(assignments.map(({ certificate }) => certificate));

  return {
    assignments,
    missingSlots: requirement.slots
      .filter((_, index) => !matchedSlots.has(index))
      .map(({ requiredSlot }) => requiredSlot),
    extraCertificates: records.filter((record) => !assignedRecords.has(record)),
  };
}

export function evaluateCertificateCategory(
  records: readonly CertificateRecord[],
  requirement: CertificateRequirement,
  expiryPolicy: ExpiryPolicy,
): CertificateCategoryEvaluation {
  if (records.length === 0) {
    return {
      outcome: "abnormal",
      displayStatus: "无",
      businessResult: "异常",
      reason: "no-records",
      missingSlots: requirement.slots.map(({ requiredSlot }) => requiredSlot),
      assignments: [],
      extraCertificates: [],
    };
  }

  const matching = assignSlots(records, requirement);

  if (matching.missingSlots.length > 0) {
    return {
      outcome: "abnormal",
      displayStatus: "异常",
      businessResult: "异常",
      reason: "missing-slots",
      ...matching,
    };
  }

  const expiryStates = records.map(({ expiryDate }) =>
    evaluateExpiry(expiryDate, expiryPolicy),
  );

  if (expiryStates.includes("expired")) {
    return {
      outcome: "abnormal",
      displayStatus: "异常",
      businessResult: "异常",
      reason: "expired",
      ...matching,
    };
  }

  if (expiryStates.includes("unknown")) {
    return {
      outcome: "indeterminate",
      reason: "expiry-undetermined",
      assignments: matching.assignments,
      extraCertificates: matching.extraCertificates,
    };
  }

  return {
    outcome: "normal",
    displayStatus: "正常",
    businessResult: "正常",
    assignments: matching.assignments,
    extraCertificates: matching.extraCertificates,
  };
}
