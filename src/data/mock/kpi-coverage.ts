import type {
  NonEmptySelection,
  TimezoneAwareIsoDateTime,
} from "@/data/contracts/kpi";
import type { Month, StoreId } from "@/types/ehs";

export const mockKpiCoverage = {
  storeIds: [
    "TEST-001",
    "TEST-002",
    "TEST-003",
    "TEST-004",
    "TEST-005",
    "TEST-006",
    "TEST-007",
    "TEST-008",
    "TEST-009",
    "TEST-010",
    "TEST-011",
    "TEST-012",
  ] satisfies readonly StoreId[],
  period: {
    startInclusive: "2026-01-01T00:00:00+08:00" as TimezoneAwareIsoDateTime,
    endExclusive: "2026-04-01T00:00:00+08:00" as TimezoneAwareIsoDateTime,
    includedMonths: [
      "2026-01",
      "2026-02",
      "2026-03",
    ] satisfies NonEmptySelection<Month>,
  },
  sourceCoverage: {
    training: "COMPLETE",
    drills: "COMPLETE",
    inspections: "COMPLETE",
    actionClosureRates: "COMPLETE",
    actions: "COMPLETE",
    events: "COMPLETE",
  },
  actionAggregateScopes: [
    {
      period: "2026-01" as Month,
      startInclusive: "2026-01-01T00:00:00+08:00" as TimezoneAwareIsoDateTime,
      endExclusive: "2026-02-01T00:00:00+08:00" as TimezoneAwareIsoDateTime,
    },
    {
      period: "2026-02" as Month,
      startInclusive: "2026-02-01T00:00:00+08:00" as TimezoneAwareIsoDateTime,
      endExclusive: "2026-03-01T00:00:00+08:00" as TimezoneAwareIsoDateTime,
    },
    {
      period: "2026-03" as Month,
      startInclusive: "2026-03-01T00:00:00+08:00" as TimezoneAwareIsoDateTime,
      endExclusive: "2026-04-01T00:00:00+08:00" as TimezoneAwareIsoDateTime,
    },
  ],
} as const;
