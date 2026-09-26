import { describe, expect, it } from "vitest";
import {
  dataTableColumnContentClassNames,
  dataTableColumnSizeClassNames,
  dataTableClassName,
  dataTableFrameClassName,
  stickyStoreCellClassName,
  stickyStoreHeaderClassName,
} from "./data-table-layout";

describe("shared data table layout contract", () => {
  it("keeps the shared frame and minimum table width aligned", () => {
    expect(dataTableFrameClassName).toContain("overflow-hidden");
    expect(dataTableClassName).toBe(
      "min-w-224 table-fixed [&_tbody_td]:leading-5.5",
    );
  });

  it("provides four bounded semantic sizing roles", () => {
    expect(Object.keys(dataTableColumnSizeClassNames)).toEqual([
      "primary",
      "content",
      "standard",
      "compact",
    ]);
    expect(dataTableColumnSizeClassNames.primary).toContain("min-w-48");
    expect(dataTableColumnSizeClassNames.primary).not.toContain("max-w-48");
    expect(dataTableColumnSizeClassNames.content).toContain("min-w-36");
    expect(dataTableColumnSizeClassNames.content).toContain("max-w-72");
    expect(dataTableColumnContentClassNames.content).toContain("max-w-72");
    expect(dataTableColumnSizeClassNames.standard).toContain("max-w-44");
    expect(dataTableColumnSizeClassNames.compact).toContain("max-w-32");
  });

  it("keeps sticky mechanics separate from column sizing", () => {
    for (const className of [
      stickyStoreHeaderClassName,
      stickyStoreCellClassName,
    ]) {
      expect(className).toContain("sticky");
      expect(className).not.toContain("w-[");
      expect(className).not.toContain("min-w-");
      expect(className).not.toContain("max-w-");
    }
  });
});
