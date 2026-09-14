import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const clientFeatureFiles = [
  "src/features/actions/actions-page-content.tsx",
  "src/features/actions/actions-data-table.tsx",
  "src/features/events/events-page-content.tsx",
  "src/features/events/events-data-table.tsx",
  "src/features/goals/goals-page-content.tsx",
  "src/features/goals/take-charge-data-table.tsx",
  "src/features/kpi/kpi-page-content.tsx",
  "src/features/stores/stores-page-content.tsx",
] as const;

describe("client data boundary", () => {
  it.each(clientFeatureFiles)("keeps %s behind the injected server query boundary", (file) => {
    const source = readFileSync(file, "utf8");

    expect(source).not.toMatch(/create(?:Mock)?EhsRepository/);
    expect(source).not.toMatch(/@\/data\/mock/);
    expect(source).not.toMatch(/mock-ehs-repository/);
    expect(source).not.toMatch(/create-ehs-repository\.server/);
    expect(source).not.toMatch(/@\/data\/server\/ehs-query-actions/);
  });
});
