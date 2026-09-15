import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  DataTableLoadingCellContent,
  DataTablePendingValue,
} from "@/components/shared/data-table-loading";

function renderLoadingContent(loading: boolean) {
  return renderToStaticMarkup(
    createElement(
      DataTableLoadingCellContent,
      {
        loading,
        children: createElement("button", null, "旧业务内容"),
      },
    ),
  );
}

describe("DataTableLoadingCellContent", () => {
  it("keeps resolved content mounted but hidden and inert during loading", () => {
    const markup = renderLoadingContent(true);

    expect(markup).toContain("旧业务内容");
    expect(markup).toContain("aria-hidden=\"true\"");
    expect(markup).toContain("inert=\"\"");
    expect(markup).toContain("invisible");
    expect(markup).toContain("data-table-loading-overlay");
  });

  it("uses an absolute non-animated skeleton that cannot affect geometry", () => {
    const markup = renderLoadingContent(true);

    expect(markup).toContain("absolute inset-0");
    expect(markup).toContain("animate-none");
    expect(markup).not.toContain("animate-pulse");
  });

  it("renders resolved content without a loading overlay when ready", () => {
    const markup = renderLoadingContent(false);

    expect(markup).toContain("旧业务内容");
    expect(markup).not.toContain("data-table-loading-overlay");
    expect(markup).not.toContain("invisible");
  });

  it("keeps a footer value mounted and hides only that value while pending", () => {
    const markup = renderToStaticMarkup(
      createElement(DataTablePendingValue, {
        pending: true,
        children: 128,
      }),
    );

    expect(markup).toContain("128");
    expect(markup).toContain("invisible");
    expect(markup).toContain("data-table-pending-value");
    expect(markup).not.toContain("animate-pulse");
  });
});
