import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createEhsRepository } from "@/data/repositories/create-ehs-repository.server";

const originalProfile = process.env.EHS_MOCK_PROFILE;
const referenceDate = new Date("2026-09-11T00:00:00+08:00");

afterEach(() => {
  if (originalProfile === undefined) {
    delete process.env.EHS_MOCK_PROFILE;
  } else {
    process.env.EHS_MOCK_PROFILE = originalProfile;
  }
});

describe("server Repository factory mock profile", () => {
  it("uses the Standard dataset when EHS_MOCK_PROFILE is unset", async () => {
    delete process.env.EHS_MOCK_PROFILE;

    expect(await createEhsRepository(referenceDate).getFilterStores()).toHaveLength(
      12,
    );
  });

  it("routes Performance data through the same public Repository", async () => {
    process.env.EHS_MOCK_PROFILE = "performance";
    const repository = createEhsRepository(referenceDate);

    expect(await repository.getFilterStores()).toHaveLength(500);
    expect(typeof repository.getActions).toBe("function");
    expect(typeof repository.getEvents).toBe("function");
    expect(typeof repository.getKpiData).toBe("function");
  });

  it("fails before Repository creation for an invalid profile", () => {
    process.env.EHS_MOCK_PROFILE = "invalid";

    expect(() => createEhsRepository(referenceDate)).toThrow(
      'Unsupported EHS_MOCK_PROFILE value "invalid"',
    );
  });
});
