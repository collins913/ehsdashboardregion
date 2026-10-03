import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function implementationFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? implementationFiles(path) : path.endsWith(".ts") && !path.endsWith(".test.ts") ? [path] : [];
  });
}
describe("Domain consumer dependency boundaries", () => {
  it.each(implementationFiles("src/data/repositories"))("Repository %s never depends on Feature/UI builders", (path) => {
    expect(readFileSync(path, "utf8")).not.toMatch(/from\s+["']@\/(?:features|components)\//);
  });
  it("Overview production consumes domain results without importing implementations or source rules", () => {
    const source = readFileSync("src/lib/rules/overview-production.ts", "utf8");
    expect(source).not.toMatch(/from\s+["']@\/(?:data\/(?:mock|repositories)|features|components)\//);
    expect(source).not.toMatch(/from\s+["'][^"']*(?:kpi-domain|goal-domain|goal-rules|performance-rules|certificate-rules|required-set-rules)["']/);
  });
  it("KPI presentation never evaluates domain rules", () => {
    expect(readFileSync("src/features/kpi/build-kpi-rows.ts", "utf8")).not.toMatch(/from\s+["']@\/lib\/rules\//);
  });
});
