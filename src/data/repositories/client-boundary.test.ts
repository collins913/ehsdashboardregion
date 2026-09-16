import { readdirSync, readFileSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const sourceRoots = ["src/features", "src/app"] as const;
const forbiddenClientImports = [
  /create(?:Mock)?EhsRepository/,
  /@\/data\/mock/,
  /mock-ehs-repository/,
  /create-ehs-repository\.server/,
  /@\/data\/server\/ehs-query-actions/,
  /EHS_MOCK_PROFILE/,
  /@\/data\/mock\/performance/,
] as const;

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) return sourceFiles(path);
    if (![".ts", ".tsx"].includes(extname(entry.name))) return [];
    if (/\.(?:test|spec)\.[jt]sx?$/.test(entry.name)) return [];

    return [path];
  });
}

function isClientBoundaryFile(file: string, source: string): boolean {
  return (
    file.startsWith("src/features/") ||
    (file.startsWith("src/app/") && /^\s*["']use client["'];/m.test(source))
  );
}

function boundaryViolations(source: string) {
  return forbiddenClientImports.filter((pattern) => pattern.test(source));
}

const clientBoundaryFiles = sourceRoots
  .flatMap(sourceFiles)
  .map((file) => relative(process.cwd(), file))
  .filter((file) => isClientBoundaryFile(file, readFileSync(file, "utf8")))
  .sort();

describe("client data boundary", () => {
  it.each(clientBoundaryFiles)("keeps %s behind the injected server query boundary", (file) => {
    expect(boundaryViolations(readFileSync(file, "utf8"))).toEqual([]);
  });

  it("automatically covers current and future Feature source files", () => {
    expect(clientBoundaryFiles).toEqual(
      expect.arrayContaining([
        "src/features/environment/environment-page-content.tsx",
        "src/features/certificates/certificates-page-content.tsx",
        "src/features/stores/stores-page-content.tsx",
      ]),
    );
    expect(
      isClientBoundaryFile(
        "src/features/future/new-page.tsx",
        'import { raw } from "@/data/mock/future";',
      ),
    ).toBe(true);
    expect(boundaryViolations('import { raw } from "@/data/mock/future";')).not.toEqual([]);
  });
});
