import { afterEach, describe, expect, it, vi } from "vitest";
import { parseMockProfile } from "@/data/mock/mock-profile";

vi.mock("server-only", () => ({}));

const originalProfile = process.env.EHS_MOCK_PROFILE;

afterEach(() => {
  if (originalProfile === undefined) {
    delete process.env.EHS_MOCK_PROFILE;
  } else {
    process.env.EHS_MOCK_PROFILE = originalProfile;
  }
});

describe("mock profile selection", () => {
  it.each([
    [undefined, "standard"],
    ["", "standard"],
    ["standard", "standard"],
    ["performance", "performance"],
  ] as const)("maps %s to %s", (value, expected) => {
    expect(parseMockProfile(value)).toBe(expected);
  });

  it("fails fast for unsupported non-empty values", () => {
    expect(() => parseMockProfile("abc")).toThrow(
      'Unsupported EHS_MOCK_PROFILE value "abc". Expected "standard" or "performance".',
    );
  });

  it("reads EHS_MOCK_PROFILE only through the server selector", async () => {
    process.env.EHS_MOCK_PROFILE = "performance";
    const { resolveMockProfile } = await import(
      "@/data/mock/mock-profile.server"
    );

    expect(resolveMockProfile()).toBe("performance");
  });
});
