import { beforeEach, describe, expect, it, vi } from "vitest";

// Controlled hook lifecycle; no simulated CSS/layout assertions.
const lifecycle = vi.hoisted(() => ({
  refs: [] as { current: unknown }[],
  cursor: 0,
  effects: [] as (() => void)[],
}));
vi.mock("react", async (importOriginal) => ({
  ...await importOriginal<typeof import("react")>(),
  useRef: (initial: unknown) => {
    const index = lifecycle.cursor++;
    return lifecycle.refs[index] ??= { current: initial };
  },
  useLayoutEffect: (effect: () => void) => lifecycle.effects.push(effect),
}));
import { useResolvedDataTableSnapshot } from "./data-table-loading";

type Snapshot = { rows: string[]; totalCount: number; pageIndex: number; sorting: string };
function render(snapshot: Snapshot | null, status: "READY" | "LOADING", metadataKey: string) {
  lifecycle.cursor = 0;
  const result = useResolvedDataTableSnapshot({ snapshot, status, metadataKey });
  lifecycle.effects.splice(0).forEach((effect) => effect());
  return result;
}
beforeEach(() => {
  lifecycle.refs = [];
  lifecycle.effects = [];
  lifecycle.cursor = 0;
});
describe("resolved table presentation lifecycle", () => {
  it("retains page/sort snapshot and replaces rows and metadata atomically", () => {
    const first = { rows: ["page one"], totalCount: 28, pageIndex: 0, sorting: "store" };
    render(first, "READY", "region A");
    const pending = render(null, "LOADING", "region A");
    expect(pending.snapshot).toBe(first);
    expect(pending.pendingMode).toBe("preserve-visible");
    expect(pending.isResolvedMetadataPending).toBe(false);
    const second = { rows: ["page two"], totalCount: 28, pageIndex: 1, sorting: "date" };
    const resolved = render(second, "READY", "region A");
    expect(resolved.snapshot).toBe(second);
    expect(resolved.isRetainingResolvedSnapshot).toBe(false);
  });

  it("masks old semantic scope even across additional page requests", () => {
    const first = { rows: ["region A"], totalCount: 28, pageIndex: 2, sorting: "store" };
    render(first, "READY", "region A");
    for (let request = 0; request < 2; request++) {
      const pending = render(null, "LOADING", "region B");
      expect(pending.snapshot).toBe(first);
      expect(pending.pendingMode).toBe("mask-content");
      expect(pending.isResolvedMetadataPending).toBe(true);
    }
    const corrected = { rows: ["region B"], totalCount: 1, pageIndex: 0, sorting: "store" };
    expect(render(corrected, "READY", "region B").snapshot).toBe(corrected);
    expect(render(null, "LOADING", "region B").pendingMode).toBe("preserve-visible");
  });

  it("does not preserve visible content before any result has resolved", () => {
    expect(render(null, "LOADING", "region A").pendingMode).toBe("mask-content");
  });
});
