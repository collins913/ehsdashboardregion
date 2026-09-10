export type ExpiryState = "valid" | "expired" | "unknown";

export interface ExpiryPolicy {
  referenceDate: string;
}

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

export function isValidIsoDate(value: string): boolean {
  const match = ISO_DATE_PATTERN.exec(value);
  if (match === null) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const daysInMonth = [
    31,
    isLeapYear(year) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];

  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth[month - 1];
}

export function evaluateExpiry(
  expiryDate: string | null | undefined,
  policy: ExpiryPolicy,
): ExpiryState {
  if (
    expiryDate == null ||
    !isValidIsoDate(expiryDate) ||
    !isValidIsoDate(policy.referenceDate)
  ) {
    return "unknown";
  }

  return expiryDate < policy.referenceDate ? "expired" : "valid";
}
