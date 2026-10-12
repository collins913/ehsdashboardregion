/** Presentation precision only. Truncation cannot round a below-target value up. */
export function formatMetricNumber(value: number, minimumFractionDigits = 0): string {
  return new Intl.NumberFormat("zh-CN", {
    useGrouping: false,
    minimumFractionDigits,
    maximumFractionDigits: 2,
    roundingMode: "trunc",
  }).format(value);
}
