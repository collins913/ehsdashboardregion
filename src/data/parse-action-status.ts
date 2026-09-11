import type { KnownActionStatus, ParsedActionStatus } from "@/types/ehs";

const KNOWN_ACTION_STATUSES = new Set<string>([
  "Assigned",
  "In Progress",
  "In Review",
  "Sign Off",
  "Closed",
  "Cancelled",
]);

function isKnownActionStatus(value: string): value is KnownActionStatus {
  return KNOWN_ACTION_STATUSES.has(value);
}

export function parseActionStatus(value: string): ParsedActionStatus {
  if (isKnownActionStatus(value)) {
    return { kind: "KNOWN", value };
  }

  return { kind: "UNKNOWN", value };
}
