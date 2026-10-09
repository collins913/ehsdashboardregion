import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { MemoryMonitoringRepository } from "./memory-monitoring-repository";
import { seedMonitoringDemoData } from "./seed-monitoring-demo-data";
import type { TimezoneAwareIsoDateTime } from "@/types/ehs";

describe("development monitoring demo records", () => {
  it("seeds two clearly labelled incidents once, including a repeated and a resolved case", async () => {
    const repository = new MemoryMonitoringRepository();
    const now = new Date("2026-10-09T04:00:00.000Z");

    await seedMonitoringDemoData(repository, now);
    await seedMonitoringDemoData(repository, now);
    const snapshot = await repository.listSnapshot({ status: "ALL" }, now.toISOString() as TimezoneAwareIsoDateTime);

    expect(snapshot.incidents).toHaveLength(2);
    expect(snapshot.events).toHaveLength(3);
    expect(snapshot.notifications).toHaveLength(0);
    expect(snapshot.incidents.find((incident) => incident.errorCode === "DEMO_STORE_QUERY_TIMEOUT")).toMatchObject({ occurrenceCount: 2, status: "OPEN" });
    expect(snapshot.incidents.find((incident) => incident.errorCode === "DEMO_NOTIFICATION_RECOVERED")).toMatchObject({ occurrenceCount: 1, status: "RESOLVED" });
    expect(snapshot.incidents.every((incident) => incident.summary.startsWith("【演示数据】"))).toBe(true);
  });

  it("refuses to seed demo records in production", async () => {
    const repository = new MemoryMonitoringRepository();
    vi.stubEnv("NODE_ENV", "production");
    try {
      await expect(seedMonitoringDemoData(repository)).rejects.toThrow("MONITORING_DEMO_DATA_FORBIDDEN_IN_PRODUCTION");
      expect((await repository.listSnapshot({ status: "ALL" }, "2026-10-09T00:00:00.000Z" as TimezoneAwareIsoDateTime)).incidents).toHaveLength(0);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
