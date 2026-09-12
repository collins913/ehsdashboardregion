import { describe, expect, it } from "vitest";
import {
  dataTableClassName,
  dataTableFrameClassName,
  stickyStoreCellClassName,
  stickyStoreHeaderClassName,
} from "./data-table-layout";

describe("shared data table layout contract", () => {
  it("keeps the shared frame and minimum table width aligned", () => {
    expect(dataTableFrameClassName).toContain("overflow-hidden");
    expect(dataTableClassName).toBe("min-w-224");
  });

  it("keeps both Store cells fixed and sticky", () => {
    for (const className of [
      stickyStoreHeaderClassName,
      stickyStoreCellClassName,
    ]) {
      expect(className).toContain("sticky");
      expect(className).toContain("w-48");
      expect(className).toContain("min-w-48");
      expect(className).toContain("max-w-48");
    }
  });
});
