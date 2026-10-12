import { readdirSync, readFileSync } from "node:fs";
import { dirname, extname, join, normalize, relative } from "node:path";
import { describe, expect, it } from "vitest";

const sourceRoots = ["src/features", "src/components", "src/app"] as const;
const forbiddenClientImports = [
  /create(?:Mock)?EhsRepository/,
  /@\/data\/mock/,
  /mock-ehs-repository/,
  /create-ehs-repository\.server/,
  /@\/data\/server\/ehs-query-actions/,
  /EHS_MOCK_PROFILE/,
  /@\/data\/mock\/performance/,
  /@\/data\/repositories\//,
  /@\/lib\/access\/access-service\.server/,
  /EHS_MOCK_USER_EMAIL/,
  /\bfetch\s*\(/,
  /@\/data\/production\//,
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
    file.startsWith("src/components/") ||
    (file.startsWith("src/app/") && /^\s*["']use client["'];/m.test(source))
  );
}

function boundaryViolations(source: string) {
  const fetchPattern = /\bfetch\s*\(/;
  const fetchCalls = [...source.matchAll(/\bfetch\s*\(/g)];
  const approvedMonitoringCalls = [...source.matchAll(/\bfetch\s*\(\s*["']\/api\/monitoring\/client-error["']/g)];
  return forbiddenClientImports.filter((pattern) => pattern.source !== fetchPattern.source && pattern.test(source))
    .concat(fetchCalls.length === 1 && approvedMonitoringCalls.length === 1 ? [] : fetchCalls.length ? [fetchPattern] : []);
}

// Follow runtime imports, including helpers/hooks and re-exports. Server Actions
// are RPC boundaries; type imports and static presentation metadata are safe.
function runtimeImports(source: string): string[] {
  const imports: string[] = [];
  const declarations = /(?:^|\n)\s*(?:import|export)\s+(?!type\b)(\{[^}]*\}|\*\s*(?:as\s+\w+)?|\w+(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+))?)\s+from\s*["']([^"']+)["']/g;
  for (const [, binding, target] of source.matchAll(declarations)) {
    const typeOnly = binding.startsWith("{") && binding.slice(1, -1).split(",").every((item) => !item.trim() || /^type\s/.test(item.trim()));
    if (!typeOnly) imports.push(target);
  }
  for (const [, target] of source.matchAll(/(?:^|\n)\s*import\s*["']([^"']+)["']/g)) imports.push(target);
  for (const [, target] of source.matchAll(/\b(?:import|require)\s*\(\s*["']([^"']+)["']\s*\)/g)) imports.push(target);
  return imports;
}

function computationViolations(sources: ReadonlyMap<string, string>): string[] {
  const violations = new Set<string>();
  const visited = new Set<string>();
  const visit = (file: string, chain: readonly string[]) => {
    const source = sources.get(file);
    if (source === undefined || /^\s*["']use server["']/.test(source) || visited.has(file)) return;
    visited.add(file);
    const trace = [...chain, file];
    if (
      /^src\/lib\/rules\//.test(file) && !["src/lib/rules/certificate-types.ts", "src/lib/rules/result-types.ts"].includes(file) ||
      /^src\/data\/(?:mock\/|prototype\/|repositories\/|normalize-|resolve-store-reference|store-period-index|take-charge-monthly-aggregate|parse-action-status)/.test(file) ||
      ["src/features/kpi/build-kpi-rows.ts", "src/features/overview/prepare-overview-result.ts"].includes(file)
    ) violations.add(trace.join(" → "));
    for (const target of runtimeImports(source)) {
      const base = target.startsWith("@/") ? `src/${target.slice(2)}` : target.startsWith(".") ? normalize(join(dirname(file), target)) : null;
      if (base === null) continue;
      const resolved = [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`].find((path) => sources.has(path));
      if (resolved) visit(resolved, trace);
    }
  };
  for (const [file, source] of sources) if (/^\s*["']use client["']/.test(source)) visit(file, []);
  return [...violations];
}

const clientBoundaryFiles = sourceRoots
  .flatMap(sourceFiles)
  .map((file) => relative(process.cwd(), file))
  .filter((file) => isClientBoundaryFile(file, readFileSync(file, "utf8")))
  .sort();

describe("client data boundary", () => {
  it("keeps domain computation out of the transitive client dependency graph", () => {
    const sources = new Map(sourceFiles("src").map((file) => [file, readFileSync(file, "utf8")]));
    expect(computationViolations(sources)).toEqual([]);
  });

  it("detects calculators imported through relative helpers, hooks and re-exports", () => {
    const sources = new Map([
      ["src/features/future/page.tsx", '"use client";\nimport { load } from "../../hooks/future";'],
      ["src/hooks/future.ts", 'export { calculate } from "@/lib/future";'],
      ["src/lib/future.ts", 'import { evaluateKpiDomain } from "./rules/kpi-domain";'],
      ["src/lib/rules/kpi-domain.ts", "export function evaluateKpiDomain() {}"],
    ]);
    expect(computationViolations(sources)).toEqual([
      "src/features/future/page.tsx → src/hooks/future.ts → src/lib/future.ts → src/lib/rules/kpi-domain.ts",
    ]);
  });

  it("permits DTO types, display metadata and Server Action proxies while rejecting server builders", () => {
    const sources = new Map([
      ["src/features/future/page.tsx", '"use client";\nimport type { Result } from "@/lib/rules/kpi-domain";\nimport { type Value } from "@/lib/rules/goal-domain";\nimport { query } from "@/data/server/future";\nimport { CERTIFICATE_CATEGORIES } from "@/lib/rules/certificate-types";'],
      ["src/lib/rules/kpi-domain.ts", ""],
      ["src/lib/rules/goal-domain.ts", ""],
      ["src/lib/rules/certificate-types.ts", ""],
      ["src/data/server/future.ts", '"use server";\nimport { buildKpiPageResult } from "@/features/kpi/build-kpi-rows";'],
      ["src/features/kpi/build-kpi-rows.ts", ""],
    ]);
    expect(computationViolations(sources)).toEqual([]);
    sources.set("src/features/future/page.tsx", '"use client";\nexport { buildKpiPageResult } from "../kpi/build-kpi-rows";');
    expect(computationViolations(sources)).toEqual(["src/features/future/page.tsx → src/features/kpi/build-kpi-rows.ts"]);
  });

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
    expect(boundaryViolations('import { service } from "@/lib/access/access-service.server";')).not.toEqual([]);
    expect(boundaryViolations('fetch("/sharepoint/actions.json")')).not.toEqual([]);
    expect(boundaryViolations('fetch("/api/monitoring/client-error", { method: "POST" })')).toEqual([]);
    expect(boundaryViolations('process.env.EHS_MOCK_USER_EMAIL')).not.toEqual([]);
  });
});
