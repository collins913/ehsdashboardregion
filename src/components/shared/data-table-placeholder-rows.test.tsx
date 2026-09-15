import { createElement } from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DataTablePlaceholderRows } from "@/components/shared/data-table-placeholder-rows";
import { Table, TableBody } from "@/components/ui/table";

function renderPlaceholderRows(rowCount: number, hidden = false) {
  return renderToStaticMarkup(
    createElement(
      Table,
      null,
      createElement(
        TableBody,
        null,
        createElement(DataTablePlaceholderRows, {
          rowCount,
          hidden,
          columns: [
            { id: "store", className: "sticky left-0 min-w-48" },
            { id: "status", className: "min-w-24" },
          ],
        }),
      ),
    ),
  );
}

describe("DataTablePlaceholderRows", () => {
  it.each([5, 7, 10])(
    "keeps %i full-column loading row slots",
    (rowCount) => {
      const markup = renderPlaceholderRows(rowCount);

      expect(markup.match(/data-table-placeholder-row/g)).toHaveLength(
        rowCount,
      );
      expect(markup.match(/data-slot="table-cell"/g)).toHaveLength(
        rowCount * 2,
      );
      expect(markup).toContain("sticky left-0 min-w-48");
    },
  );

  it("can preserve unavailable geometry without showing loading content", () => {
    expect(renderPlaceholderRows(5, true)).toContain("invisible");
  });

  it("does not participate in adaptive row measurement", () => {
    const componentSource = readFileSync(
      new URL("./data-table-placeholder-rows.tsx", import.meta.url),
      "utf8",
    );

    expect(componentSource).not.toContain("rowMeasurementRef");
  });

  it("matches the normal text line box instead of adding a 32px inner row", () => {
    const markup = renderPlaceholderRows(5);

    expect(markup).toContain("flex h-5 items-center");
    expect(markup).not.toContain("flex h-8 items-center");
  });
});
