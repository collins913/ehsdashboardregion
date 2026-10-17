import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";

// Next normally loads this module through its bundler aliases. Isolate only the
// dispatch queue here; reducers/network and React scheduling are controlled test edges.
const require = createRequire(import.meta.url);
const sourcePath = require.resolve("next/dist/client/components/app-router-instance");
const queueExports: Record<string, unknown> = {};
runInNewContext(readFileSync(sourcePath, "utf8"), {
  exports: queueExports, module: { exports: queueExports }, process: { env: {} }, URL,
  require: (name: string) => name === "react" ? { startTransition: (action: () => void) => action() }
    : name.endsWith("router-reducer-types") ? { ACTION_NAVIGATE: "navigate", ACTION_RESTORE: "restore", ACTION_REFRESH: "refresh", ACTION_SERVER_ACTION: "server-action" }
    : name.endsWith("/is-thenable") ? { isThenable: (value: unknown) => value !== null && typeof (value as { then?: unknown })?.then === "function" }
    : {},
}, { filename: sourcePath });
const createMutableActionQueue = queueExports.createMutableActionQueue as typeof import("next/dist/client/components/app-router-instance").createMutableActionQueue;

// Exercise the installed Next router's supersession logic with controlled responses.
// No browser, network throttling or application business queries are involved.
function routerQueue() {
  type State = Parameters<typeof createMutableActionQueue>[0];
  const initial = { canonicalUrl: "/performance/kpi" } as State;
  const queue = createMutableActionQueue(initial);
  const responses = new Map<string, (state: State) => void>();
  queue.action = (_state, action) => new Promise<State>((resolve) => {
    if (action.type !== "navigate") throw new Error("Expected navigation");
    responses.set(action.url.pathname, resolve);
  });
  function navigate(path: string) {
    queue.dispatch({ type: "navigate", url: new URL(path, "http://localhost"), isExternalUrl: false, navigateType: "push", locationSearch: "", scrollBehavior: 0 } as Parameters<typeof queue.dispatch>[0], () => {});
  }
  async function finish(path: string) {
    responses.get(path)!({ ...initial, canonicalUrl: path });
    await Promise.resolve();
    await Promise.resolve();
  }
  return { queue, navigate, finish };
}

describe("installed Next navigation response order", () => {
  it.each([[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]])("keeps the last target for response order %s → %s → %s", async (...order) => {
    const { queue, navigate, finish } = routerQueue();
    const paths = ["/risk/actions", "/performance/goals", "/risk/events"];
    paths.forEach(navigate);
    let latestResolved = false;
    for (const index of order) {
      await finish(paths[index]);
      latestResolved ||= index === 2;
      expect(queue.state.canonicalUrl).toBe(latestResolved ? "/risk/events" : "/performance/kpi");
    }
    expect(queue.pending).toBeNull();
  });
  it("does not apply the older B response after the final return to A", async () => {
    const { queue, navigate, finish } = routerQueue();
    navigate("/risk/actions");
    navigate("/performance/kpi");
    await finish("/performance/kpi");
    await finish("/risk/actions");
    expect(queue.state.canonicalUrl).toBe("/performance/kpi");
    expect(queue.pending).toBeNull();
  });
});
