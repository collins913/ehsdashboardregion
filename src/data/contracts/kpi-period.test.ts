import { describe, expect, it } from "vitest";
import type { KpiPeriod } from "@/data/contracts/kpi";
import {
  isInstantInKpiPeriod,
  parseKpiPeriod,
  parseTimezoneAwareInstant,
} from "@/data/contracts/kpi-period";
import { mockEhsRepository } from "@/data/repositories/mock-ehs-repository";
import { buildKpiRows } from "@/features/kpi/build-kpi-rows";

const january: KpiPeriod = {
  startInclusive: "2026-01-01T00:00:00+08:00",
  endExclusive: "2026-02-01T00:00:00+08:00",
  includedMonths: ["2026-01"],
};

describe("KPI Period validation", () => {
  it("accepts explicit UTC offsets", () => {
    expect(parseTimezoneAwareInstant("2026-09-10T00:00:00+08:00")).toBe(
      Date.UTC(2026, 8, 9, 16),
    );
  });

  it("accepts Z timestamps", () => {
    expect(parseTimezoneAwareInstant("2026-09-09T16:00:00Z")).toBe(
      Date.UTC(2026, 8, 9, 16),
    );
  });

  it("rejects timestamps without timezone information", () => {
    expect(parseTimezoneAwareInstant("2026-09-10T00:00:00")).toBeNull();

    const invalidPeriod = {
      ...january,
      startInclusive: "2026-01-01T00:00:00",
    } as unknown as KpiPeriod;
    const data = mockEhsRepository.getKpiData({
      region: { kind: "ALL" },
      area: { kind: "ALL" },
      store: { kind: "INCLUDE", values: ["TEST-012"] },
      period: invalidPeriod,
    });

    expect(data.events.availability).toBe("INCOMPLETE");
    const row = buildKpiRows(
      {
        region: { kind: "ALL" },
        area: { kind: "ALL" },
        store: { kind: "INCLUDE", values: ["TEST-012"] },
        period: invalidPeriod,
      },
      data,
    )[0];
    expect(row.astmEvents.result).toBeNull();
    expect(row.drill.result).toBe("UNDETERMINED");
  });

  it("includes startInclusive and excludes endExclusive", () => {
    const parsed = parseKpiPeriod(january);

    expect(parsed).not.toBeNull();
    expect(
      isInstantInKpiPeriod("2026-01-01T00:00:00+08:00", parsed!),
    ).toBe(true);
    expect(
      isInstantInKpiPeriod("2026-02-01T00:00:00+08:00", parsed!),
    ).toBe(false);
  });

  it("rejects an includedMonths/date-range mismatch and degrades safely", () => {
    const inconsistentPeriod = {
      ...january,
      includedMonths: ["2026-03"],
    } satisfies KpiPeriod;

    expect(parseKpiPeriod(inconsistentPeriod)).toBeNull();

    const data = mockEhsRepository.getKpiData({
      region: { kind: "ALL" },
      area: { kind: "ALL" },
      store: { kind: "INCLUDE", values: ["TEST-012"] },
      period: inconsistentPeriod,
    });

    expect(data.training.availability).toBe("INCOMPLETE");
    expect(data.drills.availability).toBe("INCOMPLETE");
    expect(data.events.availability).toBe("INCOMPLETE");
  });
});
