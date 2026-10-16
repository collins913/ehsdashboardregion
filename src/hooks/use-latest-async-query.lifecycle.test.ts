import { beforeEach, describe, expect, it, vi } from "vitest";
import type { QueryOutcome } from "@/data/contracts/query-result";

const runtime = vi.hoisted(() => ({ slots: [] as unknown[], cursor: 0, effects: [] as (() => void)[] }));
vi.mock("react", () => ({
  useRef(initial: unknown) { const i = runtime.cursor++; return runtime.slots[i] ??= { current: initial }; },
  useState(initial: unknown) {
    const i = runtime.cursor++;
    if (!(i in runtime.slots)) runtime.slots[i] = typeof initial === "function" ? initial() : initial;
    return [runtime.slots[i], (next: unknown) => { runtime.slots[i] = typeof next === "function" ? next(runtime.slots[i]) : next; }];
  },
  useCallback: (callback: unknown) => callback,
  useEffect(effect: () => (() => void) | void, deps: unknown[]) {
    const i = runtime.cursor++;
    const prior = runtime.slots[i] as { deps: unknown[]; cleanup?: () => void } | undefined;
    if (!prior || deps.some((dep, index) => !Object.is(dep, prior.deps[index]))) {
      runtime.effects.push(() => {
        prior?.cleanup?.();
        runtime.slots[i] = { deps, cleanup: effect() };
      });
    }
  },
}));
import { useLatestAsyncQuery } from "./use-latest-async-query";

function render(key: string, load: () => Promise<QueryOutcome<number>>) {
  runtime.cursor = 0;
  const state = useLatestAsyncQuery(key, load);
  runtime.effects.splice(0).forEach((effect) => effect());
  return state;
}
async function flush() { for (let i = 0; i < 6; i++) await Promise.resolve(); }
beforeEach(() => { runtime.slots = []; runtime.effects = []; runtime.cursor = 0; vi.clearAllMocks(); });

describe("async query failure lifecycle", () => {
  it.each(["ACCESS_DENIED", "AUTHENTICATION_REQUIRED"] as const)("clears previous data on %s, including reload", async (code) => {
    const load = vi.fn<() => Promise<QueryOutcome<number>>>().mockResolvedValueOnce(42).mockResolvedValue({ queryError: { code } });
    render("scope-a", load); await flush();
    const success = render("scope-a", load);
    expect(success.status).toBe("SUCCESS");
    await expect(success.reload()).rejects.toMatchObject({ code });
    expect(render("scope-a", load)).toMatchObject({ status: "ERROR", errorCode: code, resolved: null });
  });

  it("classifies a transported parameter error without treating it as successful data", async () => {
    const load = async (): Promise<QueryOutcome<number>> => ({ queryError: { code: "INVALID_QUERY_INPUT" } });
    render("invalid", load); await flush();
    expect(render("invalid", load)).toMatchObject({ status: "ERROR", errorCode: "INVALID_QUERY_INPUT" });
  });

  it("does not let an old denial overwrite the latest successful scope", async () => {
    let finish!: (value: QueryOutcome<number>) => void;
    const old = () => new Promise<QueryOutcome<number>>((resolve) => { finish = resolve; });
    render("old", old);
    const latest = async () => 99;
    render("latest", latest); await flush();
    finish({ queryError: { code: "ACCESS_DENIED" } }); await flush();
    expect(render("latest", latest)).toMatchObject({ status: "SUCCESS", data: 99, resolved: { key: "latest", data: 99 } });
  });

  it("maps an unknown transport exception to service unavailable", async () => {
    const load = async () => { throw new Error("private server detail"); };
    render("failed", load); await flush();
    expect(render("failed", load)).toMatchObject({ status: "ERROR", errorCode: "SERVICE_UNAVAILABLE" });
  });
});
