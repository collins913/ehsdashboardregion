// Display translations only. Lifecycle and close-rate rules remain in the data/rule layer.
const sourceStatusLabels: Readonly<Record<string, string>> = {
  ClosedWithAction: "已关闭（有行动项）",
  ClosedWithoutAction: "已关闭（无行动项）",
  Declined: "已拒绝",
  Submitted: "已提交",
  InProgress: "进行中",
  PendingReview: "待审核",
};

export function getTakeChargeSourceStatusLabel(sourceStatus: string): string {
  return sourceStatusLabels[sourceStatus] ?? sourceStatus;
}
