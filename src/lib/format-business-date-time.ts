import { BUSINESS_TIME_ZONE } from "@/data/contracts/kpi-period";

function businessDateTimeParts(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const valueFor = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;
  const year = valueFor("year");
  const month = valueFor("month");
  const day = valueFor("day");
  const hour = valueFor("hour");
  const minute = valueFor("minute");

  return year && month && day && hour && minute
    ? { date: `${year}-${month}-${day}`, time: `${hour}:${minute}` }
    : null;
}

export function formatBusinessDate(value: string): string {
  return businessDateTimeParts(value)?.date ?? "—";
}

export function formatBusinessDateTime(value: string | null): string {
  if (value === null) return "—";

  const parts = businessDateTimeParts(value);
  return parts === null ? "—" : `${parts.date} ${parts.time}`;
}
