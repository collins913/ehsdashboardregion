export type MockProfile = "standard" | "performance";

export function parseMockProfile(value: string | undefined): MockProfile {
  if (value === undefined || value === "" || value === "standard") {
    return "standard";
  }

  if (value === "performance") {
    return "performance";
  }

  throw new Error(
    `Unsupported EHS_MOCK_PROFILE value "${value}". Expected "standard" or "performance".`,
  );
}
