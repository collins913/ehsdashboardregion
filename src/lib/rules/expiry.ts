import type { IsoDate } from "@/types/ehs";

export type ExpiryState = "valid" | "expired" | "unknown";

export interface ExpiryPolicy {
  referenceDate: IsoDate;
  expiresOnReferenceDate: boolean;
}

export function evaluateExpiry(
  expiryDate: IsoDate | null,
  policy: ExpiryPolicy,
): ExpiryState {
  if (expiryDate === null) {
    return "unknown";
  }

  if (expiryDate < policy.referenceDate) {
    return "expired";
  }

  if (
    expiryDate === policy.referenceDate &&
    policy.expiresOnReferenceDate
  ) {
    return "expired";
  }

  return "valid";
}
