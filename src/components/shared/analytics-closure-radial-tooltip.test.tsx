import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => children,
  RadialBarChart: ({ children }: { children: ReactNode }) => createElement("div", null, children),
  RadialBar: () => null,
  Legend: () => null,
  PolarAngleAxis: () => null,
  PolarRadiusAxis: ({ children }: { children: ReactNode }) => createElement("svg", null, children),
  Label: ({ content }: { content: (props: unknown) => ReactNode }) => content({ viewBox: { cx: 128, cy: 144 } }),
  Tooltip: ({ content }: { content: (props: { active: boolean }) => ReactNode }) => content({ active: true }),
}));

import { AnalyticsClosureRadial } from "./analytics-closure-radial";

describe("Closure radial tooltip", () => {
  it.each([33, null])("shows each source status count once independently of rate %s", (rate) => {
    const markup = renderToStaticMarkup(createElement(AnalyticsClosureRadial, {
      title: "关闭情况", rate, rateLabel: "关闭率",
      statusCounts: [{ label: "已关闭", count: 2604 }, { label: "进行中", count: 3000 }, { label: "已分配", count: 2396 }, { label: "Future Status", count: 1 }],
    }));
    // Ignore the chart's CSS variable declarations when checking visible field names.
    const visible = markup.replace(/<style[\s\S]*?<\/style>/g, "");
    expect(visible).not.toContain("closedValue");
    expect(visible).not.toContain("otherValue");
    expect(visible.match(/已关闭/g)).toHaveLength(1);
    expect(visible.match(/进行中/g)).toHaveLength(1);
    expect(visible.match(/已分配/g)).toHaveLength(1);
    expect(visible.match(/Future Status/g)).toHaveLength(1);
    expect(visible).not.toContain("或");
    expect(visible.match(/2,604/g)).toHaveLength(1);
    expect(visible.match(/3,000/g)).toHaveLength(1);
    expect(visible.match(/2,396/g)).toHaveLength(1);
    expect(visible).not.toContain("（33%）");
    expect(visible).not.toContain("（67%）");
    expect(visible).toContain("关闭率</tspan>");
    expect(visible).not.toContain("pointer-events-none absolute");
  });
});
