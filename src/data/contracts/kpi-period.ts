import type {
  KpiPeriod,
  TimezoneAwareIsoDateTime,
} from "@/data/contracts/kpi";
import type { IsoDate, Month } from "@/types/ehs";

export const BUSINESS_TIME_ZONE = "Asia/Shanghai";

const TIMEZONE_AWARE_ISO_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(Z|[+-]\d{2}:\d{2})$/;
const MONTH_PATTERN = /^(\d{4})-(\d{2})$/;
const SHANGHAI_OFFSET = "+08:00";
const LOCAL_SOURCE_DATETIME_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;

export type NaturalPeriodMode = "THIS_YEAR" | "THIS_QUARTER" | "THIS_MONTH";

export interface ParsedKpiPeriod {
  startMilliseconds: number;
  endMilliseconds: number;
}

function monthIndex(month: Month): number | null {
  const match = MONTH_PATTERN.exec(month);

  if (match === null) {
    return null;
  }

  const year = Number(match[1]);
  const monthNumber = Number(match[2]);

  return monthNumber >= 1 && monthNumber <= 12
    ? year * 12 + monthNumber - 1
    : null;
}

function monthFromIndex(index: number): Month {
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return `${year}-${String(month).padStart(2, "0")}` as Month;
}

export function includedMonthsBetween(
  startMonth: Month,
  endMonth: Month,
): readonly [Month, ...Month[]] | null {
  const startIndex = monthIndex(startMonth);
  const endIndex = monthIndex(endMonth);

  if (startIndex === null || endIndex === null || startIndex > endIndex) {
    return null;
  }

  const months: Month[] = [];

  for (let index = startIndex; index <= endIndex; index += 1) {
    months.push(monthFromIndex(index));
  }

  return months as [Month, ...Month[]];
}

export function periodFromMonthRange(
  startMonth: Month,
  endMonth: Month,
): KpiPeriod | null {
  const includedMonths = includedMonthsBetween(startMonth, endMonth);
  const endIndex = monthIndex(endMonth);

  if (includedMonths === null || endIndex === null) {
    return null;
  }

  const nextMonth = monthFromIndex(endIndex + 1);

  return {
    startInclusive:
      `${startMonth}-01T00:00:00${SHANGHAI_OFFSET}` as TimezoneAwareIsoDateTime,
    endExclusive:
      `${nextMonth}-01T00:00:00${SHANGHAI_OFFSET}` as TimezoneAwareIsoDateTime,
    includedMonths,
  };
}

export function shanghaiYearMonth(now: Date): {
  year: number;
  month: number;
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);

  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    throw new Error("Unable to resolve the current Asia/Shanghai month.");
  }

  return { year, month };
}

export function periodForMode(
  mode: NaturalPeriodMode,
  now: Date,
): KpiPeriod {
  const { year, month } = shanghaiYearMonth(now);
  return periodForModeFromMonth(
    mode,
    `${year}-${String(month).padStart(2, "0")}` as Month,
  );
}

export function periodForModeFromMonth(
  mode: NaturalPeriodMode,
  referenceMonth: Month,
): KpiPeriod {
  const referenceMonthIndex = monthIndex(referenceMonth);

  if (referenceMonthIndex === null) {
    throw new Error("Unable to resolve the reference month.");
  }

  const year = Math.floor(referenceMonthIndex / 12);
  const month = (referenceMonthIndex % 12) + 1;
  let startMonth: Month;
  let endMonth: Month;

  if (mode === "THIS_YEAR") {
    startMonth = `${year}-01` as Month;
    endMonth = `${year}-${String(month).padStart(2, "0")}` as Month;
  } else if (mode === "THIS_QUARTER") {
    const quarterStart = Math.floor((month - 1) / 3) * 3 + 1;
    startMonth = `${year}-${String(quarterStart).padStart(2, "0")}` as Month;
    endMonth = `${year}-${String(month).padStart(2, "0")}` as Month;
  } else {
    startMonth = `${year}-${String(month).padStart(2, "0")}` as Month;
    endMonth = startMonth;
  }

  const period = periodFromMonthRange(startMonth, endMonth);

  if (period === null) {
    throw new Error("Unable to build a complete natural-month period.");
  }

  return period;
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

export function interpretShanghaiSourceDateTime(
  value: string,
): TimezoneAwareIsoDateTime | null {
  if (!LOCAL_SOURCE_DATETIME_PATTERN.test(value)) {
    return null;
  }

  const normalized = `${value}${SHANGHAI_OFFSET}` as TimezoneAwareIsoDateTime;

  return parseTimezoneAwareInstant(normalized) === null ? null : normalized;
}

function monthForShanghaiInstant(milliseconds: number): Month {
  const { year, month } = shanghaiYearMonth(new Date(milliseconds));

  return `${year}-${String(month).padStart(2, "0")}` as Month;
}

export function shanghaiMonthForInstant(value: string): Month | null {
  const milliseconds = parseTimezoneAwareInstant(value);

  return milliseconds === null ? null : monthForShanghaiInstant(milliseconds);
}

function hasConsistentIncludedMonths(
  period: KpiPeriod,
  startMilliseconds: number,
  endMilliseconds: number,
): boolean {
  const startMonth = monthForShanghaiInstant(startMilliseconds);
  const endBoundaryMonth = monthForShanghaiInstant(endMilliseconds);
  const startMonthIndex = monthIndex(startMonth);
  const endBoundaryMonthIndex = monthIndex(endBoundaryMonth);

  if (startMonthIndex === null || endBoundaryMonthIndex === null) {
    return false;
  }

  const expectedStart = parseTimezoneAwareInstant(
    `${startMonth}-01T00:00:00${SHANGHAI_OFFSET}`,
  );
  const expectedEnd = parseTimezoneAwareInstant(
    `${endBoundaryMonth}-01T00:00:00${SHANGHAI_OFFSET}`,
  );
  const expectedMonths = includedMonthsBetween(
    startMonth,
    monthFromIndex(endBoundaryMonthIndex - 1),
  );

  return (
    startMilliseconds === expectedStart &&
    endMilliseconds === expectedEnd &&
    expectedMonths !== null &&
    period.includedMonths.length === expectedMonths.length &&
    period.includedMonths.every((month, index) => month === expectedMonths[index])
  );
}

export function parseKpiPeriod(period: KpiPeriod): ParsedKpiPeriod | null {
  const startMilliseconds = parseTimezoneAwareInstant(period.startInclusive);
  const endMilliseconds = parseTimezoneAwareInstant(period.endExclusive);

  if (
    startMilliseconds === null ||
    endMilliseconds === null ||
    startMilliseconds >= endMilliseconds ||
    !hasConsistentIncludedMonths(
      period,
      startMilliseconds,
      endMilliseconds,
    )
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

export function isIsoDateInKpiPeriod(
  value: IsoDate,
  period: ParsedKpiPeriod,
): boolean | null {
  return isInstantInKpiPeriod(
    `${value}T00:00:00${SHANGHAI_OFFSET}`,
    period,
  );
}
