import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getRepository: vi.fn(),
  provider: vi.fn(),
  recordEvent: vi.fn(),
  dispatch: vi.fn(),
  watchdog: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("./monitoring-runtime.server", () => ({ getMonitoringRepository: mocks.getRepository }));
vi.mock("./notification-provider.server", () => ({ createConfiguredEmailNotificationProvider: mocks.provider }));
vi.mock("./monitoring-service.server", () => ({ recordOperationalEvent: mocks.recordEvent, dispatchNotificationOutbox: mocks.dispatch }));
vi.mock("./job-watchdog", () => ({ runJobWatchdog: mocks.watchdog }));

import { parseJobMonitoringConfiguration, runConfiguredJobWatchdog, runConfiguredNotificationWorker } from "./monitoring-workers.server";

describe("monitoring worker configuration and safe failures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRepository.mockReturnValue({});
    mocks.provider.mockReturnValue({ channel: "EMAIL" });
    mocks.recordEvent.mockResolvedValue(null);
    mocks.dispatch.mockResolvedValue([]);
  });

  it("treats an absent task plan as no work and rejects invented fields", async () => {
    vi.stubEnv("EHS_MONITORING_JOBS", "");
    expect(parseJobMonitoringConfiguration(undefined)).toEqual([]);
    expect(await runConfiguredJobWatchdog("2026-10-09T00:00:00.000Z" as never)).toEqual([]);
    expect(mocks.getRepository).not.toHaveBeenCalled();
    expect(() => parseJobMonitoringConfiguration(JSON.stringify([{ jobId: "invented", jobName: "x", schedule: "daily" }]))).toThrow("INVALID_JOB_MONITORING_CONFIGURATION");
  });

  it("records a stable redacted notification-worker failure without leaking provider errors", async () => {
    mocks.provider.mockImplementation(() => { throw new Error("token=private-provider-detail"); });
    await expect(runConfiguredNotificationWorker()).rejects.toThrow("NOTIFICATION_WORKER_FAILED");
    expect(mocks.recordEvent).toHaveBeenCalledWith(expect.objectContaining({
      source: "Notification", errorCode: "NOTIFICATION_WORKER_FAILED", severity: "ERROR",
      safeMessage: "通知队列处理失败。",
    }), expect.objectContaining({ repository: expect.any(Object) }));
    expect(JSON.stringify(mocks.recordEvent.mock.calls)).not.toContain("private-provider-detail");
  });
});
