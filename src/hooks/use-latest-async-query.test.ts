import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createLatestRequestGuard } from "./use-latest-async-query";

describe("latest async query guard", () => {
  it("prevents an older response from replacing the latest request", () => {
    const guard = createLatestRequestGuard();
    const requestA = guard.begin();
    const requestB = guard.begin();

    expect(guard.isLatest(requestB)).toBe(true);
    expect(guard.isLatest(requestA)).toBe(false);
  });

  it("invalidates pending work when no query remains", () => {
    const guard = createLatestRequestGuard();
    const request = guard.begin();
    guard.invalidate();

    expect(guard.isLatest(request)).toBe(false);
  });

  it("drives query execution by the stable query key, not executor identity", () => {
    const hookSource = readFileSync(
      new URL("./use-latest-async-query.ts", import.meta.url),
      "utf8",
    );

    expect(hookSource).toContain("loadRef.current = load");
    expect(hookSource).toContain("const execute = loadRef.current");
    expect(hookSource).toContain("void execute().then(");
    expect(hookSource).toContain("}, [hasLoad, queryKey]);");
    expect(hookSource).not.toContain("}, [load, queryKey]);");
  });

  it("retains the last successful result while a new key is loading", () => {
    const hookSource = readFileSync(
      new URL("./use-latest-async-query.ts", import.meta.url),
      "utf8",
    );

    expect(hookSource).toContain(
      'state: { status: "LOADING", resolved: current.resolved }',
    );
    expect(hookSource).toContain(
      'return queryKey === null\n      ? { status: "IDLE", resolved: null, reload }\n      : { status: "LOADING", resolved: stored.resolved, reload };',
    );
    expect(hookSource).toContain("const resolved = { key: queryKey, data }");
  });
});
