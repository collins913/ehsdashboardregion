import { describe, expect, it } from "vitest";
import type { KpiPeriod } from "@/data/contracts/kpi";
import {
  interpretShanghaiSourceDateTime,
  isIsoDateInKpiPeriod,
  isInstantInKpiPeriod,
  parseKpiPeriod,
  parseTimezoneAwareInstant,
} from "@/data/contracts/kpi-period";
import { createMockEhsRepository } from "@/data/repositories/mock-ehs-repository";
import { buildKpiRows } from "@/features/kpi/build-kpi-rows";

const january: KpiPeriod = {
  startInclusive: "2026-01-01T00:00:00+08:00",
  endExclusive: "2026-02-01T00:00:00+08:00",
  includedMonths: ["2026-01"],
};
const firstQuarter: KpiPeriod = {
  startInclusive: "2026-01-01T00:00:00+08:00",
  endExclusive: "2026-04-01T00:00:00+08:00",
  includedMonths: ["2026-01", "2026-02", "2026-03"],
};
const mockEhsRepository = createMockEhsRepository(
  new Date("2026-02-15T00:00:00+08:00"),
);

describe("KPI Period validation", () => {
  it("interprets source-local Take Charge datetime in Asia/Shanghai", () => {
    expect(interpretShanghaiSourceDateTime("2026-09-23T14:15:00")).toBe(
      "2026-09-23T14:15:00+08:00",
    );
    expect(
      interpretShanghaiSourceDateTime("2026-09-23T14:15:00Z"),
    ).toBeNull();
  });

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

  it("rejects timestamps without timezone information", async () => {
    expect(parseTimezoneAwareInstant("2026-09-10T00:00:00")).toBeNull();

    const invalidPeriod = {
      ...january,
      startInclusive: "2026-01-01T00:00:00",
    } as unknown as KpiPeriod;
    const data = await mockEhsRepository.getKpiData({
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

  it("applies the same half-open boundary to source date fields", () => {
    const parsed = parseKpiPeriod(january);

    expect(parsed).not.toBeNull();
    expect(isIsoDateInKpiPeriod("2026-01-01", parsed!)).toBe(true);
    expect(isIsoDateInKpiPeriod("2026-02-01", parsed!)).toBe(false);
  });

  it("rejects an includedMonths/date-range mismatch and degrades safely", async () => {
    const inconsistentPeriod = {
      ...january,
      includedMonths: ["2026-03"],
    } satisfies KpiPeriod;

    expect(parseKpiPeriod(inconsistentPeriod)).toBeNull();

    const data = await mockEhsRepository.getKpiData({
      region: { kind: "ALL" },
      area: { kind: "ALL" },
      store: { kind: "INCLUDE", values: ["TEST-012"] },
      period: inconsistentPeriod,
    });

    expect(data.training.availability).toBe("INCOMPLETE");
    expect(data.drills.availability).toBe("INCOMPLETE");
    expect(data.events.availability).toBe("INCOMPLETE");
  });

  it("accepts the exact natural-month sequence for a multi-month Period", () => {
    expect(parseKpiPeriod(firstQuarter)).not.toBeNull();
  });

  it.each([
    ["missing a middle month", ["2026-01", "2026-03"]],
    ["including an extra month", ["2026-01", "2026-02", "2026-03", "2026-04"]],
    ["repeating a month", ["2026-01", "2026-02", "2026-02"]],
    ["using a non-canonical order", ["2026-02", "2026-01", "2026-03"]],
  ] as const)("rejects includedMonths %s", (_, includedMonths) => {
    expect(
      parseKpiPeriod({
        ...firstQuarter,
        includedMonths,
      }),
    ).toBeNull();
  });

  it("accepts a single natural month", () => {
    expect(parseKpiPeriod(january)).not.toBeNull();
  });

  it("accepts an exact cross-year natural-month sequence", () => {
    expect(
      parseKpiPeriod({
        startInclusive: "2025-12-01T00:00:00+08:00",
        endExclusive: "2026-02-01T00:00:00+08:00",
        includedMonths: ["2025-12", "2026-01"],
      }),
    ).not.toBeNull();
  });
});
