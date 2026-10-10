import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  principal: vi.fn(),
  getRepository: vi.fn(),
  recordEvent: vi.fn(),
  consume: vi.fn(),
}));

vi.mock("@/data/server/identity-provider.server", () => ({ requireVerifiedServerPrincipal: mocks.principal }));
vi.mock("server-only", () => ({}));
vi.mock("@/data/server/monitoring/monitoring-runtime.server", () => ({ getMonitoringRepository: mocks.getRepository }));
vi.mock("@/data/server/monitoring/monitoring-service.server", () => ({ recordOperationalEvent: mocks.recordEvent }));

import { POST } from "./route";

const post = (value: unknown) => new Request("http://localhost/api/monitoring/client-error", {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(value),
});

describe("client monitoring error endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.principal.mockResolvedValue({ principalId: "trusted-user-1" });
    mocks.consume.mockResolvedValue(true);
    mocks.getRepository.mockReturnValue({ consumeClientErrorReport: mocks.consume });
    mocks.recordEvent.mockResolvedValue({ event: { eventId: "event-1" } });
  });

  it("rejects unauthenticated reports before touching monitoring storage", async () => {
    mocks.principal.mockRejectedValue(new Error("NOT_AUTHENTICATED"));
    const response = await POST(post({ kind: "UNHANDLED_ERROR", route: "/overview", digest: null }));
    expect(response.status).toBe(401);
    expect(mocks.getRepository).not.toHaveBeenCalled();
    expect(mocks.recordEvent).not.toHaveBeenCalled();
  });

  it("does not accept client-supplied identity and enforces the trusted principal rate limit", async () => {
    const forged = await POST(post({ kind: "UNHANDLED_ERROR", route: "/overview", digest: null, principalId: "global-admin" }));
    expect(forged.status).toBe(422);
    expect(mocks.getRepository).not.toHaveBeenCalled();

    mocks.consume.mockResolvedValue(false);
    const limited = await POST(post({ kind: "UNHANDLED_ERROR", route: "/overview", digest: null }));
    expect(limited.status).toBe(429);
    expect(mocks.consume).toHaveBeenCalledWith(expect.objectContaining({ principalId: "trusted-user-1" }));
    expect(mocks.recordEvent).not.toHaveBeenCalled();
  });

  it("stores only the whitelisted report and returns an accepted event id", async () => {
    const response = await POST(post({ kind: "BOUNDARY_ERROR", route: "/overview", digest: "digest-1" }));
    expect(response.status).toBe(202);
    expect(mocks.recordEvent).toHaveBeenCalledWith(expect.objectContaining({
      source: "Dashboard Client", errorCode: "CLIENT_RENDER_ERROR", correlationId: expect.any(String),
      impact: expect.objectContaining({ id: "/overview" }),
    }), expect.objectContaining({ throwOnStorageFailure: true }));
    expect(await response.json()).toEqual({ accepted: true, eventId: "event-1" });
  });

  it("returns 400 for an empty body and rejects JSON-like but unsupported media types", async () => {
    const empty = await POST(new Request("http://localhost/api/monitoring/client-error", { method: "POST", headers: { "content-type": "application/json" }, body: "" }));
    expect(empty.status).toBe(400);
    expect(await empty.json()).toEqual({ error: { code: "INVALID_REQUEST_BODY" } });

    const wrongType = await POST(new Request("http://localhost/api/monitoring/client-error", { method: "POST", headers: { "content-type": "application/json-patch+json" }, body: "{}" }));
    expect(wrongType.status).toBe(415);
  });
});
