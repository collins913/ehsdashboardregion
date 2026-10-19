import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ reduced: false, line: vi.fn(), chart: vi.fn() }));
vi.mock("@/components/shared/use-analytics-motion", () => ({ usePrefersReducedMotion: () => state.reduced }));
vi.mock("@/components/ui/chart", () => ({
  ChartContainer: ({ children }: { children: ReactNode }) => children,
  ChartTooltip: () => null,
  ChartTooltipContent: () => null,
}));
vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  return { ...actual,
    LineChart: (props: { children: ReactNode }) => { state.chart(props); return props.children; },
    Line: (props: unknown) => { state.line(props); return null; },
    XAxis: () => null, YAxis: () => null, CartesianGrid: () => null,
  };
});
import { OverviewMonthlyTrendChart } from "./components/overview-charts";

afterEach(() => { state.reduced = false; vi.clearAllMocks(); });

describe("Overview trend motion", () => {
  it("enables drawing on the first browser render when motion is allowed", () => {
    renderToStaticMarkup(createElement(OverviewMonthlyTrendChart, { history: [{ periodLabel: "2026-10", score: 75 }], showAsRate: true }));
    expect(state.line.mock.calls[0][0]).toMatchObject({
      isAnimationActive: true, animationDuration: 550,
      animationEasing: "ease-out", type: "monotone", connectNulls: false,
      dot: { r: 3 }, activeDot: { r: 6 }, dataKey: "scoreRate",
    });
  });
  it("disables drawing for reduced motion and preserves missing values", () => {
    state.reduced = true;
    const history = [{ periodLabel: "2026-09", score: null }, { periodLabel: "2026-10", score: 0 }];
    renderToStaticMarkup(createElement(OverviewMonthlyTrendChart, { history }));
    expect(state.line.mock.calls[0][0].isAnimationActive).toBe(false);
    expect(state.chart.mock.calls[0][0].data).toEqual(history.map((point) => ({ ...point, scoreRate: point.score })));
    expect(history[0].score).toBeNull();
  });
});
