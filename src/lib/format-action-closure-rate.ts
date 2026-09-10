export function formatActionClosureRate(
  value: number | null | undefined,
): string {
  return value == null ? "无" : `${value}%`;
}
