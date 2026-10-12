import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DataTablePagination } from "./data-table-pagination";

function render(overrides: Partial<ComponentProps<typeof DataTablePagination>> = {}) {
  return renderToStaticMarkup(createElement(DataTablePagination, {
    children: createElement("p", null, "共 12 家门店"),
    ready: true,
    disabled: false,
    pageIndex: 0,
    pageCount: 3,
    metadataPending: false,
    canPreviousPage: false,
    canNextPage: true,
    onPreviousPage: () => {},
    onNextPage: () => {},
    ...overrides,
  }));
}

describe("DataTablePagination", () => {
  it("keeps caller counts and disables only unavailable page controls", () => {
    const markup = render();
    expect(markup).toContain("共 12 家门店");
    expect(markup).toContain('class="">1</span>');
    expect(markup).toMatch(/<button[^>]*disabled=""[^>]*>上一页<\/button>/);
    expect(markup).toMatch(/<button(?![^>]* disabled="")[^>]*>下一页<\/button>/);
    expect(markup).not.toContain("w-16");
  });

  it("retains server feedback width before and during a page query", () => {
    expect(render({ pendingFeedback: false })).toContain("w-16");
    const pending = render({ pendingFeedback: true, busy: true, disabled: true });
    expect(pending).toContain('role="status"');
    expect(pending).toContain("加载中…");
    expect(pending).toContain('aria-busy="true"');
    expect(pending.match(/disabled=""/g)).toHaveLength(2);
  });

  it("keeps unmeasured geometry and masks pending digits instead of replacing them", () => {
    const markup = render({ ready: false, metadataPending: true });
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain("gap-3 invisible");
    expect(markup).toContain('aria-hidden="true" class="invisible">3</span>');
  });
});
