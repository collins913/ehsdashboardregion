import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { EventAnalyticsResult } from "@/data/contracts/event-analytics";

const { result, geometry } = vi.hoisted(() => ({ geometry: { cx: 160, angles: [30, 210] }, result: {
  availability: "COMPLETE", totalCount: 6000,
  byType: [{ eventType: "类型 A", count: 1007 }, { eventType: "长名称类型 B", count: 4993 }],
  trendSeries: [{ key: "ALL", label: "全部", monthly: [] }],
} as unknown as EventAnalyticsResult }));

vi.mock("@/hooks/use-latest-async-query", () => ({
  useLatestAsyncQuery: () => ({ status: "SUCCESS", data: result }),
}));
vi.mock("@/components/shared/analytics-count-trend", () => ({ AnalyticsCountTrend: () => null }));
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => children,
  PieChart: ({ children }: { children: ReactNode }) => createElement("div", null, children),
  Pie: ({ children, data, label }: { children: ReactNode; data: { count: number }[]; label: (props: unknown) => ReactNode }) =>
    createElement("svg", { "data-counts": data.map((row) => row.count).join(",") }, children,
      data.map((_, index) => createElement("g", { key: index }, label({ cx: geometry.cx, cy: 100, outerRadius: 65, midAngle: geometry.angles[index], index })))),
  Text: ({ children, x, y, textAnchor, width }: { children: ReactNode; x: number; y: number; textAnchor: string; width: number }) =>
    createElement("text", { x, y, textAnchor, "data-label-width": width }, children),
  Cell: () => null,
  Label: ({ content }: { content: (props: unknown) => ReactNode }) => content({ viewBox: { cx: 100, cy: 80 } }),
  Legend: ({ content }: { content: ReactNode }) => content,
  Tooltip: () => null,
}));

import { EventsAnalytics } from "./events-analytics";

describe("Events donut presentation", () => {
  it("positions names just outside their arc midpoints without leader lines and preserves supplied counts", () => {
    const markup = renderToStaticMarkup(createElement(EventsAnalytics, {
      context: {} as never, referenceDateIso: "2026-10-16",
      queryEventsAnalytics: async () => { throw new Error("not queried during render"); },
    }));
    expect(markup).toContain("事件数量</tspan>");
    expect(markup).toContain("6,000");
    expect(markup).toContain('data-counts="1007,4993"');
    expect(markup).toContain("类型 A");
    expect(markup).toContain("长名称类型 B");
    expect(markup).toContain('text-anchor="start"');
    expect(markup).toContain('text-anchor="end"');
    expect(markup).not.toContain("<path");
    expect(markup).not.toContain("overflow-y-auto");
    expect(markup).not.toContain("absolute inset-0");
    expect(markup.indexOf("类型 A")).toBeLessThan(markup.indexOf("</svg>"));
  });
  it.each([120, 280])("bounds outside labels to the available side space at center %s", (cx) => {
    geometry.cx = cx;
    const markup = renderToStaticMarkup(createElement(EventsAnalytics, {
      context: {} as never, referenceDateIso: "2026-10-16",
      queryEventsAnalytics: async () => { throw new Error("not queried during render"); },
    }));
    const x = cx + 73 * Math.cos(-Math.PI / 6);
    expect(markup).toContain(`x="${x}"`);
    expect(markup).toContain(`data-label-width="${2 * cx - x - 8}"`);
    expect(markup).toContain('y="63.50000000000001"');
    geometry.cx = 160;
  });

  it("centers the top and bottom labels on their arc midpoints", () => {
    geometry.angles = [90, 270];
    const markup = renderToStaticMarkup(createElement(EventsAnalytics, {
      context: {} as never, referenceDateIso: "2026-10-16",
      queryEventsAnalytics: async () => { throw new Error("not queried during render"); },
    }));
    expect(markup).toContain('x="160" y="27" text-anchor="middle"');
    expect(markup).toContain('y="173" text-anchor="middle"');
    expect(markup).not.toContain("<path");
    geometry.angles = [30, 210];
  });

});
