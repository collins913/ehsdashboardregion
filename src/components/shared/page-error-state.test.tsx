import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PageErrorState } from "./page-error-state";
import { formatPageErrorDiagnostics } from "./page-error-diagnostics";

vi.mock("@/data/server/error-diagnostics-actions", () => ({ reportPageError: vi.fn() }));

describe("page error diagnostics", () => {
  it("renders administrator guidance without exposing the raw error or stack", () => {
    const error = Object.assign(new Error("private connection credentials"), { digest: "123456" });
    const html = renderToStaticMarkup(createElement(PageErrorState, { error, reset() {} }));
    expect(html).toContain("排查信息");
    expect(html).toContain("复制排查信息");
    expect(html).not.toContain(error.message);
    expect(html).not.toContain(error.stack);
  });

  it("copies only the explicit diagnostic fields", () => {
    const info = { digest: "123456", path: "/overview", occurredAt: "2026-10-19T04:00:00.000Z", scope: "普通页面", message: "private", stack: "private stack" };
    const text = formatPageErrorDiagnostics(info);
    expect(text).toBe("错误范围：普通页面\n错误编号：123456\n页面路径：/overview\n页面显示时间（UTC）：2026-10-19T04:00:00.000Z");
    expect(text).not.toContain("private");
  });
});
