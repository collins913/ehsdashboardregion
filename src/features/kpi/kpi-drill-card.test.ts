import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { getKpiStatusLabel, KpiStatusDisplay } from "./kpi-status-display";
import { getStatusLabel } from "@/components/shared/status-display";
import { DrillCard, TrainingCard } from "./kpi-detail-sheet";

describe("Drill detail record presentation", () => {
  it("uses official ItemTitle and preserves month/source status without a time heading", () => {
    const markup = renderToStaticMarkup(createElement(DrillCard, {
      record: { drillName: "月度应急演练 10", month: "2026-10", status: "未完成", completionResult: "NOT_ACHIEVED" },
    }));
    expect(markup).toContain('data-slot="item-title"');
    expect(markup).toContain("月度应急演练 10");
    expect(markup).toContain("2026 年 10 月");
    expect(markup).toContain("未完成");
    expect(markup).not.toContain("<dt");
    expect(markup).not.toContain('data-slot="card-title"');
  });
});


describe("Training record status and KPI wording", () => {
  it.each([
    [100, "ACHIEVED", "已完成"], [92, "NOT_ACHIEVED", "进行中"], [0, "NOT_ACHIEVED", "进行中"], [null, "UNDETERMINED", "未确定"],
  ] as const)("shows the server-prepared status for rate %s in the shared top-right slot", (completionRate, completionResult, label) => {
    const markup = renderToStaticMarkup(createElement(TrainingCard, {
      record: { trainingName: "培训记录", month: "2026-10", completionRate, completionResult, incompletePeople: [] },
    }));
    expect(markup).toContain('data-slot="item-actions"');
    expect(markup).toContain(label);
    expect(markup).toContain(completionRate === null ? "—" : `${completionRate}%`);
    expect(markup).not.toContain("达成");
    expect(markup).toContain('data-slot="item-description"');
    expect(markup).toContain("2026 年 10 月");
    expect(markup).not.toContain(">时间</dt>");
    expect(markup.indexOf(">完成率</dt>")).toBeLessThan(markup.indexOf(">未完成人员</dt>"));
  });

  it("consumes the prepared result without recomputing completion in the client", () => {
    const markup = renderToStaticMarkup(createElement(TrainingCard, {
      record: { trainingName: "服务端结果", month: "2026-10", completionRate: 100, completionResult: "NOT_ACHIEVED", incompletePeople: [] },
    }));
    expect(markup).toContain("进行中");
    expect(markup).not.toContain("已完成");
  });

  it("limits 已完成 wording to KPI without changing the shared business label", () => {
    expect(getKpiStatusLabel("ACHIEVED")).toBe("已完成");
    expect(getStatusLabel("ACHIEVED")).toBe("达成");
    const markup = renderToStaticMarkup(createElement(KpiStatusDisplay, { status: "ACHIEVED" }));
    expect(markup).toContain("已完成");
    expect(markup).toContain('data-intent="positive"');
  });

  it("preserves an explicit source status even when it matches the aggregate wording", () => {
    const markup = renderToStaticMarkup(createElement(DrillCard, {
      record: { drillName: "源状态记录", month: "2026-10", status: "达成", completionResult: "NOT_ACHIEVED" },
    }));
    expect(markup).toContain("达成");
    expect(markup).not.toContain("已完成");
    expect(markup).toContain('data-intent="negative"');
  });
});
