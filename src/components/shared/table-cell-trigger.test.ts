import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TableCellTrigger } from "@/components/shared/table-cell-trigger";

describe("TableCellTrigger", () => {
  it("renders a compact native button with the shared named group", () => {
    const markup = renderToStaticMarkup(
      createElement(TableCellTrigger, null, "查看"),
    );

    expect(markup).toContain("<button");
    expect(markup).toContain('type="button"');
    expect(markup).toContain("group/table-cell-trigger");
    expect(markup).toContain("cursor-pointer");
    expect(markup).toContain("min-h-8");
  });

  it("preserves native disabled semantics", () => {
    const markup = renderToStaticMarkup(
      createElement(TableCellTrigger, { disabled: true }, "不可用"),
    );

    expect(markup).toContain('disabled=""');
  });
});
