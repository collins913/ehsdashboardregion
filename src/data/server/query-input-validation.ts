import type { AccessQuery } from "@/data/contracts/access";
import type { ActionsQuery, ActionSortDirection, ActionSortKey } from "@/data/contracts/actions";
import type { EventsQuery, EventSortDirection, EventSortKey } from "@/data/contracts/events";
import type { EnvironmentAnalyticsQuery } from "@/data/contracts/environment";
import type { KpiDetailQuery } from "@/data/contracts/kpi-details";
import type { EhsFilterContext, EhsStoreScope, FilterScope, KpiPeriod } from "@/data/contracts/kpi";
import type { ActionAnalyticsQuery } from "@/data/contracts/action-analytics";
import type { EventAnalyticsQuery } from "@/data/contracts/event-analytics";
import type { TakeChargeRecordsQuery } from "@/data/contracts/take-charge";
import type { Month } from "@/types/ehs";
import { parseKpiPeriod, parseTimezoneAwareInstant } from "@/data/contracts/kpi-period";

export class InvalidQueryInputError extends Error {
  readonly code = "INVALID_QUERY_INPUT" as const;

  constructor() {
    super("查询参数无效。");
    this.name = "InvalidQueryInputError";
  }
}

export interface QueryEnvelope<T> {
  referenceDateIso: string;
  query: T;
}

type QueryParser<T> = (input: unknown) => T | null;
type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasOnlyKeys(value: UnknownRecord, allowed: readonly string[]): boolean {
  return Object.keys(value).every((key) => allowed.includes(key));
}

function hasKeys(value: UnknownRecord, required: readonly string[]): boolean {
  return required.every((key) => Object.hasOwn(value, key));
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parseFilterScope<T extends string>(
  input: unknown,
  isValue: (value: unknown) => value is T,
): FilterScope<T> | null {
  if (!isRecord(input) || typeof input.kind !== "string") return null;
  if (input.kind === "ALL") {
    return hasOnlyKeys(input, ["kind"]) ? { kind: "ALL" } : null;
  }
  if (
    input.kind !== "INCLUDE" ||
    !hasOnlyKeys(input, ["kind", "values"]) ||
    !Array.isArray(input.values) ||
    input.values.length === 0 ||
    !input.values.every(isValue)
  ) {
    return null;
  }
  return { kind: "INCLUDE", values: input.values as [T, ...T[]] };
}

function parseStoreScope(input: unknown): EhsStoreScope | null {
  if (
    !isRecord(input) ||
    !hasOnlyKeys(input, ["region", "area", "store"]) ||
    !hasKeys(input, ["region", "area", "store"])
  ) return null;
  const region = parseFilterScope(input.region, nonEmptyString);
  const area = parseFilterScope(input.area, nonEmptyString);
  const store = parseFilterScope(input.store, nonEmptyString);
  return region && area && store ? { region, area, store } : null;
}

function isMonth(value: unknown): value is Month {
  if (typeof value !== "string") return false;
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  return match !== null && Number(match[2]) >= 1 && Number(match[2]) <= 12;
}

function parsePeriod(input: unknown): KpiPeriod | null {
  if (
    !isRecord(input) ||
    !hasOnlyKeys(input, ["startInclusive", "endExclusive", "includedMonths"]) ||
    !hasKeys(input, ["startInclusive", "endExclusive", "includedMonths"]) ||
    typeof input.startInclusive !== "string" ||
    typeof input.endExclusive !== "string" ||
    !Array.isArray(input.includedMonths) ||
    input.includedMonths.length === 0 ||
    !input.includedMonths.every(isMonth)
  ) return null;
  const period = {
    startInclusive: input.startInclusive,
    endExclusive: input.endExclusive,
    includedMonths: input.includedMonths as [Month, ...Month[]],
  } as KpiPeriod;
  return parseKpiPeriod(period) === null ? null : period;
}

function parseFilterContext(input: unknown): EhsFilterContext | null {
  if (
    !isRecord(input) ||
    !hasOnlyKeys(input, ["region", "area", "store", "period"]) ||
    !hasKeys(input, ["region", "area", "store", "period"])
  ) return null;
  const scope = parseStoreScope({ region: input.region, area: input.area, store: input.store });
  const period = parsePeriod(input.period);
  return scope && period ? { ...scope, period } : null;
}

export function parseQueryEnvelope<T>(input: unknown, parseQuery: QueryParser<T>): QueryEnvelope<T> {
  if (
    !isRecord(input) ||
    !hasOnlyKeys(input, ["referenceDateIso", "query"]) ||
    !hasKeys(input, ["referenceDateIso", "query"]) ||
    typeof input.referenceDateIso !== "string" ||
    parseTimezoneAwareInstant(input.referenceDateIso) === null
  ) throw new InvalidQueryInputError();
  const query = parseQuery(input.query);
  if (query === null) throw new InvalidQueryInputError();
  return { referenceDateIso: input.referenceDateIso, query };
}

function parseContextOnly<T extends { context: EhsFilterContext }>(input: unknown): T | null {
  if (!isRecord(input) || !hasOnlyKeys(input, ["context"]) || !hasKeys(input, ["context"])) return null;
  const context = parseFilterContext(input.context);
  return context ? ({ context } as T) : null;
}

function parseSort<T extends string, D extends string>(
  input: unknown,
  keys: readonly T[],
  directions: readonly D[],
): { key: T; direction: D } | null {
  if (
    !isRecord(input) ||
    !hasOnlyKeys(input, ["key", "direction"]) ||
    !hasKeys(input, ["key", "direction"]) ||
    typeof input.key !== "string" ||
    !keys.includes(input.key as T) ||
    typeof input.direction !== "string" ||
    !directions.includes(input.direction as D)
  ) return null;
  return { key: input.key as T, direction: input.direction as D };
}

const actionSortKeys: readonly ActionSortKey[] = ["store", "actionId", "problem", "action", "dueDate", "status", "owner", "submittedBy", "submittedDate", "closedDate"];
const eventSortKeys: readonly EventSortKey[] = ["store", "eventId", "eventType", "description", "eventDate", "status", "submittedBy"];
const sortDirections: readonly (ActionSortDirection | EventSortDirection)[] = ["asc", "desc"];

function parsePagination(input: UnknownRecord): { pageIndex: number; pageSize: number } | null {
  if (
    !Number.isSafeInteger(input.pageIndex) ||
    (input.pageIndex as number) < 0 ||
    !Number.isSafeInteger(input.pageSize) ||
    (input.pageSize as number) < 1 ||
    !Number.isSafeInteger((input.pageIndex as number) * (input.pageSize as number))
  ) return null;
  return { pageIndex: input.pageIndex as number, pageSize: input.pageSize as number };
}

export function parseEhsFilterContext(input: unknown): EhsFilterContext | null {
  return parseFilterContext(input);
}

export function parseEhsStoreScope(input: unknown): EhsStoreScope | null {
  return parseStoreScope(input);
}

export function parseKpiDetailQuery(input: unknown): KpiDetailQuery | null {
  if (
    !isRecord(input) ||
    !hasOnlyKeys(input, ["context", "storeId"]) ||
    !hasKeys(input, ["context", "storeId"]) ||
    !nonEmptyString(input.storeId)
  ) return null;
  const context = parseFilterContext(input.context);
  return context ? { context, storeId: input.storeId } : null;
}

export function parseActionsQuery(input: unknown): ActionsQuery | null {
  if (
    !isRecord(input) ||
    !hasOnlyKeys(input, ["context", "viewMode", "sorting", "pageIndex", "pageSize"]) ||
    !hasKeys(input, ["context", "viewMode", "pageIndex", "pageSize"]) ||
    (input.viewMode !== "ALL" && input.viewMode !== "OPEN_ONLY")
  ) return null;
  const context = parseFilterContext(input.context);
  const pagination = parsePagination(input);
  const sorting = Object.hasOwn(input, "sorting")
    ? parseSort(input.sorting, actionSortKeys, sortDirections)
    : undefined;
  if (!context || !pagination || (Object.hasOwn(input, "sorting") && sorting === null)) return null;
  return { context, viewMode: input.viewMode, ...pagination, ...(sorting ? { sorting } : {}) };
}

export function parseEventsQuery(input: unknown): EventsQuery | null {
  if (
    !isRecord(input) ||
    !hasOnlyKeys(input, ["context", "viewMode", "eventType", "sorting", "pageIndex", "pageSize"]) ||
    !hasKeys(input, ["context", "viewMode", "pageIndex", "pageSize"]) ||
    (input.viewMode !== "ALL" && input.viewMode !== "OPEN_ONLY") ||
    (Object.hasOwn(input, "eventType") && typeof input.eventType !== "string")
  ) return null;
  const context = parseFilterContext(input.context);
  const pagination = parsePagination(input);
  const sorting = Object.hasOwn(input, "sorting")
    ? parseSort(input.sorting, eventSortKeys, sortDirections)
    : undefined;
  if (!context || !pagination || (Object.hasOwn(input, "sorting") && sorting === null)) return null;
  return {
    context,
    viewMode: input.viewMode,
    ...pagination,
    ...(typeof input.eventType === "string" ? { eventType: input.eventType } : {}),
    ...(sorting ? { sorting } : {}),
  };
}

export function parseActionAnalyticsQuery(input: unknown): ActionAnalyticsQuery | null {
  return parseContextOnly<ActionAnalyticsQuery>(input);
}

export function parseEventAnalyticsQuery(input: unknown): EventAnalyticsQuery | null {
  return parseContextOnly<EventAnalyticsQuery>(input);
}

export function parseTakeChargeGoalsQuery(input: unknown): EhsFilterContext | null {
  return parseFilterContext(input);
}

export function parseTakeChargeRecordsQuery(input: unknown): TakeChargeRecordsQuery | null {
  if (
    !isRecord(input) ||
    !hasOnlyKeys(input, ["context", "viewMode", "sorting", "pageIndex", "pageSize"]) ||
    !hasKeys(input, ["context", "viewMode", "pageIndex", "pageSize"]) ||
    (input.viewMode !== "ALL" && input.viewMode !== "OPEN_ONLY")
  ) return null;
  const context = parseFilterContext(input.context);
  const pagination = parsePagination(input);
  const sorting = Object.hasOwn(input, "sorting")
    ? parseSort(input.sorting, ["store", "tchId", "submittedBy", "submittedAt", "status"], sortDirections)
    : undefined;
  if (!context || !pagination || (Object.hasOwn(input, "sorting") && sorting === null)) return null;
  return { context, viewMode: input.viewMode, ...pagination, ...(sorting ? { sorting } : {}) };
}

export function parseEnvironmentAnalyticsQuery(input: unknown): EnvironmentAnalyticsQuery | null {
  if (
    !isRecord(input) ||
    !hasOnlyKeys(input, ["context", "period"]) ||
    !hasKeys(input, ["context", "period"])
  ) return null;
  const context = parseStoreScope(input.context);
  const period = input.period === null ? null : parsePeriod(input.period);
  return context && (input.period === null || period !== null) ? { context, period } : null;
}

export function parseAccessQuery(input: unknown): (AccessQuery & { accessType?: string }) | null {
  if (
    !isRecord(input) ||
    !hasOnlyKeys(input, ["email", "scope", "accessType"]) ||
    (Object.hasOwn(input, "email") && typeof input.email !== "string") ||
    (Object.hasOwn(input, "accessType") &&
      (typeof input.accessType !== "string" ||
        (input.accessType !== "ALL" && !["GLOBAL_USER", "GLOBAL_ADMIN", "REGION", "AREA", "STORE"].includes(input.accessType))))
  ) return null;
  const scope = Object.hasOwn(input, "scope") ? parseStoreScope(input.scope) : undefined;
  if (Object.hasOwn(input, "scope") && scope === null) return null;
  return {
    ...(typeof input.email === "string" ? { email: input.email } : {}),
    ...(typeof input.accessType === "string" ? { accessType: input.accessType } : {}),
    ...(scope ? { scope } : {}),
  };
}

export function parseAccessAuditFilter(input: unknown): string | null {
  return typeof input === "string" ? input : null;
}
