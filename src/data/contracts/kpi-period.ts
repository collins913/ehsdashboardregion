import type {
  KpiPeriod,
  TimezoneAwareIsoDateTime,
} from "@/data/contracts/kpi";
import type { Month } from "@/types/ehs";

const TIMEZONE_AWARE_ISO_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(Z|[+-]\d{2}:\d{2})$/;
const MONTH_PATTERN = /^\d{4}-\d{2}$/;

export interface ParsedKpiPeriod {
  startMilliseconds: number;
  endMilliseconds: number;
}

export function parseTimezoneAwareInstant(value: string): number | null {
  const match = TIMEZONE_AWARE_ISO_PATTERN.exec(value);

  if (match === null) {
    return null;
  }

  const [, year, month, day, hour, minute, second, , timezone] = match;
  const numericYear = Number(year);
  const numericMonth = Number(month);
  const numericDay = Number(day);
  const daysInMonth = new Date(
    Date.UTC(numericYear, numericMonth, 0),
  ).getUTCDate();
  const timezoneParts =
    timezone === "Z" ? null : timezone.slice(1).split(":").map(Number);

  if (
    numericMonth < 1 ||
    numericMonth > 12 ||
    numericDay < 1 ||
    numericDay > daysInMonth ||
    Number(hour) > 23 ||
    Number(minute) > 59 ||
    Number(second) > 59 ||
    (timezoneParts !== null &&
      (timezoneParts[0] > 23 || timezoneParts[1] > 59))
  ) {
    return null;
  }

  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) ? milliseconds : null;
}

function previousMonth(year: number, month: number): Month {
  const value = new Date(Date.UTC(year, month - 2, 1));
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}` as Month;
}

function lastTouchedMonth(value: TimezoneAwareIsoDateTime): Month | null {
  const match = TIMEZONE_AWARE_ISO_PATTERN.exec(value);

  if (match === null) {
    return null;
  }

  const [, year, month, day, hour, minute, second, fraction] = match;
  const isLocalMonthStart =
    day === "01" &&
    hour === "00" &&
    minute === "00" &&
    second === "00" &&
    (fraction === undefined || /^0+$/.test(fraction));

  return isLocalMonthStart
    ? previousMonth(Number(year), Number(month))
    : (`${year}-${month}` as Month);
}

function hasConsistentIncludedMonths(period: KpiPeriod): boolean {
  const firstTouchedMonth = period.startInclusive.slice(0, 7) as Month;
  const finalTouchedMonth = lastTouchedMonth(period.endExclusive);
  const uniqueMonths = new Set(period.includedMonths);

  return (
    finalTouchedMonth !== null &&
    period.includedMonths.every((month) => MONTH_PATTERN.test(month)) &&
    uniqueMonths.size === period.includedMonths.length &&
    period.includedMonths.every(
      (month) => month >= firstTouchedMonth && month <= finalTouchedMonth,
    )
  );
}

export function parseKpiPeriod(period: KpiPeriod): ParsedKpiPeriod | null {
  const startMilliseconds = parseTimezoneAwareInstant(period.startInclusive);
  const endMilliseconds = parseTimezoneAwareInstant(period.endExclusive);

  if (
    startMilliseconds === null ||
    endMilliseconds === null ||
    startMilliseconds >= endMilliseconds ||
    !hasConsistentIncludedMonths(period)
  ) {
    return null;
  }

  return { startMilliseconds, endMilliseconds };
}

export function isInstantInKpiPeriod(
  value: string,
  period: ParsedKpiPeriod,
): boolean | null {
  const milliseconds = parseTimezoneAwareInstant(value);

  if (milliseconds === null) {
    return null;
  }

  return (
    milliseconds >= period.startMilliseconds &&
    milliseconds < period.endMilliseconds
  );
}
