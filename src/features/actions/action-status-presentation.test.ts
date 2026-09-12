import { describe, expect, it } from "vitest";
import { getActionStatusPresentation } from "./action-status-presentation";

describe("Action workflow status presentation", () => {
  it.each([
    ["Assigned", "已分配", "OPEN"],
    ["In Progress", "进行中", "OPEN"],
    ["In Review", "审核中", "OPEN"],
    ["Sign Off", "待签核", "OPEN"],
    ["Closed", "已关闭", "CLOSED"],
    ["Cancelled", "已取消", "CLOSED"],
  ] as const)("maps %s to %s with %s visual status", (value, label, visualStatus) => {
    expect(getActionStatusPresentation({ kind: "KNOWN", value })).toEqual({
      label,
      visualStatus,
    });
  });

  it("keeps unknown source statuses visually neutral", () => {
    expect(
      getActionStatusPresentation({
        kind: "UNKNOWN",
        value: "Future Status",
      }),
    ).toEqual({ label: "未知", visualStatus: "UNKNOWN" });
  });
});
