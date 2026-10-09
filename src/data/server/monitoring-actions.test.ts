import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  repository: { listSnapshot: vi.fn() },
  getRepository: vi.fn(),
  acknowledge: vi.fn(),
  resolve: vi.fn(),
  reopen: vi.fn(),
  retry: vi.fn(),
}));

vi.mock("@/lib/access/access-service.server", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/data/server/monitoring/monitoring-runtime.server", () => ({ getMonitoringRepository: mocks.getRepository }));
vi.mock("@/data/server/monitoring/monitoring-service.server", () => ({
  acknowledgeOperationalIncident: mocks.acknowledge,
  resolveOperationalIncident: mocks.resolve,
  reopenOperationalIncident: mocks.reopen,
  retryOperationalNotification: mocks.retry,
}));

import { acknowledgeMonitoringIncident, loadMonitoringSnapshot, reopenMonitoringIncident } from "./monitoring-actions";

describe("monitoring server action authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue({ principal: { principalId: "trusted-admin" } });
    mocks.repository.listSnapshot.mockResolvedValue({ incidents: [], events: [], notifications: [], jobs: [], audit: [], sampledAt: "2026-10-09T00:00:00.000Z" });
    mocks.getRepository.mockReturnValue(mocks.repository);
    mocks.acknowledge.mockResolvedValue({ incidentId: "incident-1" });
  });

  it("checks GLOBAL_ADMIN authorization before initializing the monitoring repository", async () => {
    mocks.requireAdmin.mockRejectedValue(new Error("NOT_AUTHORIZED"));
    await expect(loadMonitoringSnapshot()).rejects.toThrow("NOT_AUTHORIZED");
    expect(mocks.getRepository).not.toHaveBeenCalled();
    expect(mocks.repository.listSnapshot).not.toHaveBeenCalled();
  });

  it("uses trusted principal identity for audited mutations", async () => {
    await acknowledgeMonitoringIncident({ incidentId: "incident-1", expectedRevision: 3 });
    expect(mocks.acknowledge).toHaveBeenCalledWith(mocks.repository, expect.objectContaining({
      incidentId: "incident-1", expectedRevision: 3, principalId: "trusted-admin",
    }));
    expect(mocks.getRepository).toHaveBeenCalledTimes(1);
  });

  it("reopens a resolved incident with the trusted administrator identity", async () => {
    await reopenMonitoringIncident({ incidentId: "incident-1", expectedRevision: 4 });
    expect(mocks.reopen).toHaveBeenCalledWith(mocks.repository, expect.objectContaining({
      incidentId: "incident-1", expectedRevision: 4, principalId: "trusted-admin",
    }));
  });

  it("rejects mutation payload identity fields rather than trusting them", async () => {
    await expect(acknowledgeMonitoringIncident({ incidentId: "incident-1", expectedRevision: 1, principalId: "forged" })).rejects.toThrow("INVALID_MONITORING_MUTATION");
    expect(mocks.acknowledge).not.toHaveBeenCalled();
  });
});
