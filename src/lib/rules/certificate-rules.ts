import type {
  CertificateRecord,
  CertificateRequirement,
} from "@/types/ehs";
import type { ExpiryPolicy } from "./expiry";
import { evaluateExpiry } from "./expiry";
import type { ComplianceResult } from "./result-types";

export interface CertificateSlotAssignment {
  requiredSlot: string;
  certificate: CertificateRecord;
}

export type CertificateReasonCode =
  | "NO_RECORD"
  | "MISSING_REQUIRED_SLOT"
  | "EXPIRED_CERTIFICATE"
  | "MISSING_EXPIRY_DATE"
  | "NORMAL";

type CertificateEvaluationResult =
  | { businessResult: "NORMAL"; reason: "NORMAL" }
  | {
      businessResult: "ABNORMAL";
      reason: "NO_RECORD" | "MISSING_REQUIRED_SLOT" | "EXPIRED_CERTIFICATE";
    }
  | {
      businessResult: "UNDETERMINED";
      reason: "MISSING_EXPIRY_DATE";
    };

export type CertificateCategoryEvaluation = CertificateEvaluationResult & {
  assignments: CertificateSlotAssignment[];
  missingSlots: string[];
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
      businessResult: "ABNORMAL",
      reason: "NO_RECORD",
      missingSlots: requirement.slots.map(({ requiredSlot }) => requiredSlot),
      assignments: [],
      extraCertificates: [],
    };
  }

  const matching = assignSlots(records, requirement);

  if (matching.missingSlots.length > 0) {
    return {
      businessResult: "ABNORMAL",
      reason: "MISSING_REQUIRED_SLOT",
      ...matching,
    };
  }

  const expiryStates = records.map(({ expiryDate }) =>
    evaluateExpiry(expiryDate, expiryPolicy),
  );

  if (expiryStates.includes("expired")) {
    return {
      businessResult: "ABNORMAL",
      reason: "EXPIRED_CERTIFICATE",
      ...matching,
    };
  }

  if (expiryStates.includes("unknown")) {
    return {
      businessResult: "UNDETERMINED",
      reason: "MISSING_EXPIRY_DATE",
      ...matching,
    };
  }

  return {
    businessResult: "NORMAL",
    reason: "NORMAL",
    ...matching,
  };
}
