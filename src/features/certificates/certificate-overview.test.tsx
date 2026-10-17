import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { CertificateOverviewResult } from "@/data/contracts/certificates";
import { CertificateOverview } from "./certificate-overview";
import { AnalyticsProgressItem } from "@/components/shared/analytics-progress-item";

function item(name: string, category: "安全健康" | "急救员" = "安全健康") {
  return { certificateType: name, certificateCategory: category, categoryLabel: category, shortLabel: "缩写", fullLabel: name, actualCount: 7, requiredCount: 10, progressValue: 70 };
}

describe("Certificate overview progress columns", () => {
  it("renders every supplied group and type at natural height without inner vertical scrolling", () => {
    const items = [item("证件全名 A"), item("证件全名 B"), item("后来登记的新证件"), item("急救员证", "急救员")];
    const overview: CertificateOverviewResult = {
      items,
      groups: [
        { certificateCategory: "安全健康", label: "安全健康", startIndex: 0, itemCount: 3 },
        { certificateCategory: "急救员", label: "急救员", startIndex: 3, itemCount: 1 },
      ],
    };
    const html = renderToStaticMarkup(createElement(CertificateOverview, { overview, availability: "AVAILABLE" }));
    for (const row of items) expect(html).toContain(row.fullLabel);
    expect(html).not.toContain("缩写");
    expect(html).toContain("truncate");
    expect(html).not.toContain("break-words");
    expect((html.match(/data-slot="progress"/g) ?? [])).toHaveLength(4);
    expect(html).not.toContain("h-[17.125rem]");
    expect(html).toContain("grid-flow-col");
    expect(html).toContain("overflow-x-auto");
    expect(html).not.toContain("overflow-y-auto");
    expect(html).not.toContain('tabindex="0"');
    expect(html).toContain('aria-label="安全健康证件列表"');
    expect(html).toContain('aria-label="急救员证件列表"');
  });
  it("shows server-prepared geometry without recomputing it from displayed counts", () => {
    const html = renderToStaticMarkup(createElement(AnalyticsProgressItem, {
      label: "服务端准备的进度", actualCount: 7, requiredCount: 10, progressValue: 25, missingRequirementLabel: "未设置",
    }));
    expect(html).toContain('aria-valuenow="25"');
    expect(html).toContain("bg-(--chart-1)");
    expect(html).toContain("[&amp;_[data-slot=progress-indicator]]:bg-(--chart-2)");
    expect(html).not.toContain("bg-destructive");
    expect(html).toContain("translateX(-75%)");
    expect(html).toContain("7 / 10");
  });
  it("shows an empty track and actual / unset without inventing a percentage", () => {
    const html = renderToStaticMarkup(createElement(AnalyticsProgressItem, {
      label: "未设置要求的证件", actualCount: 492, requiredCount: null, progressValue: null, missingRequirementLabel: "未设置",
    }));
    expect(html).toContain("492");
    expect(html).toContain("492 / 未设置");
    expect(html).toContain('data-slot="progress"');
    expect(html).toContain("translateX(-100%)");
    expect(html).not.toContain("aria-valuenow");
    expect(html).not.toContain("bg-(--chart-1)");
    expect(html).toContain("bg-(--chart-2)");
    expect(html).not.toContain(" / 0");
  });
});
