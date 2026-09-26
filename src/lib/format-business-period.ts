import type { KpiPeriod } from "@/data/contracts/kpi";
import { parseKpiPeriod } from "@/data/contracts/kpi-period";
import { formatBusinessMonth } from "@/lib/format-business-date-time";

export function formatBusinessPeriod(period: KpiPeriod | null): string {
  if (period === null || parseKpiPeriod(period) === null) return "—";

  const first = period.includedMonths[0];
  const last = period.includedMonths[period.includedMonths.length - 1];
  const formattedFirst = formatBusinessMonth(first);
  if (first === last) return formattedFirst;
  return `${formattedFirst}–${formatBusinessMonth(last)}`;
}
