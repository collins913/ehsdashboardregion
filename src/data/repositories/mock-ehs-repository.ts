import {
  createKpiMockData,
  type KpiMockCoverage,
} from "@/data/mock";
import type { MockDataset } from "@/data/mock/mock-dataset";
import type { EnvironmentQuery, EnvironmentQueryResult, NormalizedEnvironmentRecord } from "@/data/contracts/environment";
import type { CertificatesQuery, CertificatesQueryResult, NormalizedCertificateRecord } from "@/data/contracts/certificates";
import { CERTIFICATE_CATEGORIES, certificateCategoryForType } from "@/lib/rules/certificate-types";
import { evaluateCertificateCategory, evaluateCertificateRecord } from "@/lib/rules/certificate-rules";
import { formatBusinessDate } from "@/lib/format-business-date-time";
import { parseActionStatus } from "@/data/parse-action-status";
import {
  createStoreReferenceResolver,
  type StoreReferenceResolver,
} from "@/data/resolve-store-reference";
import type { EhsRepository } from "@/data/repositories/ehs-repository";
import {
  isInstantInKpiPeriod,
  interpretShanghaiSourceDateTime,
  parseKpiPeriod,
  parseTimezoneAwareInstant,
  shanghaiMonthForInstant,
  type ParsedKpiPeriod,
} from "@/data/contracts/kpi-period";
import type {
  DataSet,
  FilterScope,
  KpiActionClosureRateRecord,
  KpiDataSnapshot,
  KpiDrillRecord,
  EhsFilterContext,
  EhsStoreScope,
  KpiInspectionRecord,
  KpiStore,
  KpiTrainingRecord,
} from "@/data/contracts/kpi";
import type {
  ActionSortKey,
  ActionsQuery,
  ActionsQueryResult,
  NormalizedActionRecord,
} from "@/data/contracts/actions";
import type {
  EventSortKey,
  EventsQuery,
  EventsQueryResult,
  NormalizedEventRecord,
} from "@/data/contracts/events";
import type {
  NormalizedTakeChargeRecord,
  TakeChargeAnnualMetricContribution,
  TakeChargeFieldDefinition,
  TakeChargeGoalsQuery,
  TakeChargeGoalsSummary,
  TakeChargeRecordsQuery,
  TakeChargeRecordsResult,
} from "@/data/contracts/take-charge";
import type {
  NormalizedStoreRecord,
  StoresQuery,
  StoresQueryResult,
} from "@/data/contracts/stores";
import type {
  ActionClosureRateRecord,
  ActionRecord,
  EventRecord,
  RawActionRecord,
  RawEnvironmentRecord,
  RawCertificateRecord,
  StoreId,
  StoreMasterData,
  StoreReference,
  TakeChargeRecord,
} from "@/types/ehs";
import { classifyActionRecordState } from "@/lib/rules/action-rules";
import { classifyEventRecordState } from "@/lib/rules/event-rules";
import {
  calculateTakeChargeCloseRate,
  evaluateTakeChargeCloseRate,
  evaluateTakeChargeParticipateRate,
  evaluateTakeChargeSubmissionsPerCapita,
} from "@/lib/rules/goal-rules";
import { classifyTakeChargeRecordState } from "@/lib/rules/take-charge-rules";
import { buildTakeChargeMonthlyAggregates } from "@/data/take-charge-monthly-aggregate";

function scopeIncludes<T>(scope: FilterScope<T>, value: T): boolean {
  return scope.kind === "ALL" || scope.values.includes(value);
}

function toKpiStore(store: StoreMasterData): KpiStore {
  return {
    storeId: store.trtid,
    displayName: store.storeNameCn,
    region: store.region,
    area: store.area,
  };
}

function toNormalizedStoreRecord(
  store: StoreMasterData,
): NormalizedStoreRecord {
  return {
    storeId: store.trtid,
    storeNameCn: store.storeNameCn,
    storeNameEn: store.storeNameEn,
    trtid: store.trtid,
    region: store.region,
    area: store.area,
    manager: store.manager,
    ehsAmbassador: store.ehsAmbassador,
  };
}

function scopedStoreMaster(
  context: EhsStoreScope,
  stores: readonly StoreMasterData[],
) {
  return stores.filter(
    (store) =>
      scopeIncludes(context.region, store.region) &&
      scopeIncludes(context.area, store.area) &&
      scopeIncludes(context.store, store.trtid),
  );
}

function requestedStores(
  context: EhsStoreScope,
  stores: readonly StoreMasterData[],
): readonly KpiStore[] {
  return scopedStoreMaster(context, stores).map(toKpiStore);
}

function isWithinDeclaredCoverage(
  context: EhsFilterContext,
  selectedStoreIds: readonly StoreId[],
  parsedPeriod: ParsedKpiPeriod | null,
  coverage: KpiMockCoverage,
): boolean {
  const coverageStart = parseTimezoneAwareInstant(
    coverage.period.startInclusive,
  );
  const coverageEnd = parseTimezoneAwareInstant(coverage.period.endExclusive);
  const coveredMonths = new Set(coverage.period.includedMonths);

  return (
    parsedPeriod !== null &&
    coverageStart !== null &&
    coverageEnd !== null &&
    selectedStoreIds.every((storeId) => coverage.storeIds.includes(storeId)) &&
    context.period.includedMonths.every((month) => coveredMonths.has(month)) &&
    parsedPeriod.startMilliseconds >= coverageStart &&
    parsedPeriod.endMilliseconds <= coverageEnd
  );
}

function isSourceCovered(
  context: EhsFilterContext,
  selectedStoreIds: readonly StoreId[],
  parsedPeriod: ParsedKpiPeriod | null,
  coverage: KpiMockCoverage,
  source: keyof KpiMockCoverage["sourceCoverage"],
): boolean {
  return (
    isWithinDeclaredCoverage(
      context,
      selectedStoreIds,
      parsedPeriod,
      coverage,
    ) && coverage.sourceCoverage[source] === "COMPLETE"
  );
}

function completeDataSet<T>(items: readonly T[]): DataSet<T> {
  if (items.length === 0) {
    return { availability: "CONFIRMED_EMPTY", items: [] };
  }

  return {
    availability: "AVAILABLE",
    items: items as readonly [T, ...T[]],
  };
}

function incompleteDataSet<T>(items: readonly T[] = []): DataSet<T> {
  return { availability: "INCOMPLETE", items };
}

function resolveStoreId(
  reference: StoreReference,
  resolveReference: StoreReferenceResolver,
): StoreId | null {
  const resolution = resolveReference(reference);

  return resolution.kind === "RESOLVED" ? resolution.store.trtid : null;
}

function normalizeRecords<T extends { storeReference: StoreReference }, U>(
  records: readonly T[],
  selectedStoreIds: ReadonlySet<StoreId>,
  mapRecord: (record: T, storeId: StoreId) => U,
  resolveReference: (reference: StoreReference) => StoreId | null,
): { items: readonly U[]; resolutionComplete: boolean } {
  const items: U[] = [];
  let resolutionComplete = true;

  for (const record of records) {
    const storeId = resolveReference(record.storeReference);

    if (storeId === null) {
      resolutionComplete = false;
      continue;
    }

    if (selectedStoreIds.has(storeId)) {
      items.push(mapRecord(record, storeId));
    }
  }

  return { items, resolutionComplete };
}

function withCoverage<T>(
  items: readonly T[],
  scopeCovered: boolean,
  resolutionComplete: boolean,
): DataSet<T> {
  return scopeCovered && resolutionComplete
    ? completeDataSet(items)
    : incompleteDataSet(items);
}

function periodMatches(
  startInclusive: string,
  endExclusive: string,
  parsedPeriod: ParsedKpiPeriod | null,
): boolean {
  return (
    parsedPeriod !== null &&
    parseTimezoneAwareInstant(startInclusive) === parsedPeriod.startMilliseconds &&
    parseTimezoneAwareInstant(endExclusive) === parsedPeriod.endMilliseconds
  );
}

function matchingActionAggregates(
  records: readonly ActionClosureRateRecord[],
  parsedPeriod: ParsedKpiPeriod | null,
): readonly ActionClosureRateRecord[] {
  return records.filter((record) =>
    periodMatches(record.startInclusive, record.endExclusive, parsedPeriod),
  );
}

function isActionAggregateScopeCovered(
  coverage: KpiMockCoverage,
  parsedPeriod: ParsedKpiPeriod | null,
): boolean {
  return coverage.actionAggregateScopes.some((scope) =>
    periodMatches(scope.startInclusive, scope.endExclusive, parsedPeriod),
  );
}

type MockEhsRepositoryOptions = {
  environmentRecords?: readonly RawEnvironmentRecord[];
  certificateRecords?: readonly RawCertificateRecord[];
  dataset?: MockDataset;
  actionRecords?: readonly RawActionRecord[];
  eventRecords?: readonly EventRecord[];
  takeChargeRecords?: readonly TakeChargeRecord[];
  takeChargeFieldDefinitions?: readonly TakeChargeFieldDefinition[];
  takeChargeAnnualMetricContributions?: readonly TakeChargeAnnualMetricContribution[];
};

const TAKE_CHARGE_CORE_FIELD_KEYS = new Set([
  "storeId",
  "storeDisplayName",
  "tchId",
  "submittedBy",
  "submittedAt",
  "summary",
  "sourceStatus",
  "recordState",
  "extraFields",
]);

function validTakeChargeFieldDefinitions(
  definitions: readonly TakeChargeFieldDefinition[],
): readonly TakeChargeFieldDefinition[] {
  const seen = new Set<string>();

  return definitions.filter((definition) => {
    if (
      definition.key.trim().length === 0 ||
      definition.label.trim().length === 0 ||
      TAKE_CHARGE_CORE_FIELD_KEYS.has(definition.key) ||
      seen.has(definition.key)
    ) {
      return false;
    }

    seen.add(definition.key);
    return true;
  });
}

function pageIndexForResult(
  requestedPageIndex: number,
  totalCount: number,
  pageSize: number,
): number {
  const lastPageIndex = Math.max(0, Math.ceil(totalCount / pageSize) - 1);

  return Math.min(Math.max(0, Math.trunc(requestedPageIndex)), lastPageIndex);
}

function compareText(
  left: string,
  right: string,
  direction: "asc" | "desc",
): number {
  const comparison = left.localeCompare(right);
  return direction === "asc" ? comparison : -comparison;
}

function actionSortValue(
  record: NormalizedActionRecord,
  key: ActionSortKey,
): string {
  switch (key) {
    case "store":
      return record.storeDisplayName;
    case "actionId":
      return record.actionId;
    case "problem":
      return record.problem;
    case "action":
      return record.action;
    case "dueDate":
      return record.dueDate;
    case "status":
      return `${record.recordState}:${record.sourceStatus.value}`;
    case "owner":
      return record.owner;
    case "submittedBy":
      return record.submittedBy;
    case "submittedDate":
      return record.submittedDate;
    case "closedDate":
      return record.closedDate ?? "";
  }
}

function eventSortValue(
  record: NormalizedEventRecord,
  key: EventSortKey,
): string {
  switch (key) {
    case "store":
      return record.storeDisplayName;
    case "eventId":
      return record.eventId;
    case "eventType":
      return record.eventType;
    case "description":
      return record.description;
    case "eventDate":
      return record.eventDate;
    case "status":
      return `${record.recordState}:${record.sourceStatus}`;
    case "submittedBy":
      return record.submittedBy;
  }
}

type PreparedMockDataset = {
  resolveStoreReference: StoreReferenceResolver;
  parsedActionRecords: readonly ActionRecord[];
  eventRecords: readonly EventRecord[];
  normalizedTakeChargeRecords: readonly NormalizedTakeChargeRecord[];
  takeChargeFieldDefinitions: readonly TakeChargeFieldDefinition[];
  takeChargeAnnualMetricContributions: readonly TakeChargeAnnualMetricContribution[];
  takeChargeResolutionComplete: boolean;
  takeChargeDateCoverageComplete: boolean;
  takeChargeStatusCoverageComplete: boolean;
  takeChargeMonthlyAggregates: ReturnType<
    typeof buildTakeChargeMonthlyAggregates
  >;
};

const preparedDatasetCache = new WeakMap<MockDataset, PreparedMockDataset>();

function prepareMockDataset(
  stores: readonly StoreMasterData[],
  rawActionRecords: readonly RawActionRecord[],
  eventRecords: readonly EventRecord[],
  takeChargeRecords: readonly TakeChargeRecord[],
  takeChargeFieldDefinitions: readonly TakeChargeFieldDefinition[],
  takeChargeAnnualMetricContributions: readonly TakeChargeAnnualMetricContribution[],
): PreparedMockDataset {
  const resolveStoreReference = createStoreReferenceResolver(stores);
  const parsedActionRecords: readonly ActionRecord[] = rawActionRecords.map(
    (record) => ({
      ...record,
      Status: parseActionStatus(record.Status),
    }),
  );
  const normalizedTakeChargeRecords: NormalizedTakeChargeRecord[] = [];
  let takeChargeResolutionComplete = true;
  let takeChargeDateCoverageComplete = true;
  let takeChargeStatusCoverageComplete = true;

  for (const record of takeChargeRecords) {
    const resolution = resolveStoreReference(record.storeReference);
    const normalizedSubmittedAt = interpretShanghaiSourceDateTime(
      record.submittedAt,
    );
    const submittedMonth =
      normalizedSubmittedAt === null
        ? null
        : shanghaiMonthForInstant(normalizedSubmittedAt);

    if (resolution.kind !== "RESOLVED") {
      takeChargeResolutionComplete = false;
      continue;
    }

    if (normalizedSubmittedAt === null || submittedMonth === null) {
      takeChargeDateCoverageComplete = false;
      continue;
    }

    if (record.Status.trim().length === 0) {
      takeChargeStatusCoverageComplete = false;
    }

    const extraFields = Object.fromEntries(
      takeChargeFieldDefinitions.map(({ key }) => [
        key,
        record.extraFields?.[key] ?? null,
      ]),
    );

    normalizedTakeChargeRecords.push({
      storeId: resolution.store.trtid,
      storeDisplayName: resolution.store.storeNameCn,
      tchId: record.tchId,
      submittedBy: record.submittedBy,
      submittedAt: normalizedSubmittedAt,
      summary: record.summary,
      sourceStatus: record.Status.trim(),
      recordState: classifyTakeChargeRecordState(record.Status),
      extraFields,
      sourceReference: record.sourceReference,
    });
  }

  return {
    resolveStoreReference,
    parsedActionRecords,
    eventRecords,
    normalizedTakeChargeRecords,
    takeChargeFieldDefinitions,
    takeChargeAnnualMetricContributions,
    takeChargeResolutionComplete,
    takeChargeDateCoverageComplete,
    takeChargeStatusCoverageComplete,
    takeChargeMonthlyAggregates: buildTakeChargeMonthlyAggregates(
      normalizedTakeChargeRecords,
    ),
  };
}

export function createMockEhsRepository(
  referenceDate: Date,
  options: MockEhsRepositoryOptions = {},
): EhsRepository {
  const mockData = options.dataset ?? createKpiMockData(referenceDate);
  const stores = mockData.stores;
  const rawActionRecords = options.actionRecords ?? mockData.actionRecords;
  const rawEventRecords = options.eventRecords ?? mockData.eventRecords;
  const takeChargeRecords =
    options.takeChargeRecords ?? mockData.takeChargeRecords;
  const rawTakeChargeFieldDefinitions = validTakeChargeFieldDefinitions(
    options.takeChargeFieldDefinitions ?? mockData.takeChargeFieldDefinitions,
  );
  const rawTakeChargeAnnualMetricContributions =
    options.takeChargeAnnualMetricContributions ??
    mockData.takeChargeAnnualMetricContributions;
  const hasOverrides =
    options.actionRecords !== undefined ||
    options.eventRecords !== undefined ||
    options.takeChargeRecords !== undefined ||
    options.takeChargeFieldDefinitions !== undefined ||
    options.takeChargeAnnualMetricContributions !== undefined;
  const cachedPrepared =
    options.dataset !== undefined && !hasOverrides
      ? preparedDatasetCache.get(options.dataset)
      : undefined;
  const prepared =
    cachedPrepared ??
    prepareMockDataset(
      stores,
      rawActionRecords,
      rawEventRecords,
      takeChargeRecords,
      rawTakeChargeFieldDefinitions,
      rawTakeChargeAnnualMetricContributions,
    );

  if (options.dataset !== undefined && !hasOverrides && cachedPrepared === undefined) {
    preparedDatasetCache.set(options.dataset, prepared);
  }

  const {
    resolveStoreReference,
    parsedActionRecords,
    normalizedTakeChargeRecords,
    takeChargeResolutionComplete,
    takeChargeDateCoverageComplete,
    takeChargeStatusCoverageComplete,
    takeChargeMonthlyAggregates,
    eventRecords,
    takeChargeFieldDefinitions,
    takeChargeAnnualMetricContributions,
  } = prepared;

  async function getKpiData(
    context: EhsFilterContext,
  ): Promise<KpiDataSnapshot> {
    const requestedStoreList = requestedStores(context, stores);
    const selectedStoreIdList = requestedStoreList.map(({ storeId }) => storeId);
    const selectedStoreIds = new Set(selectedStoreIdList);
    const includedMonths = new Set(context.period.includedMonths);
    const parsedPeriod = parseKpiPeriod(context.period);
    const coverage = mockData.coverage;

    const training = normalizeRecords(
      mockData.trainingRecords.filter((record) =>
        includedMonths.has(record.month),
      ),
      selectedStoreIds,
      (record, storeId): KpiTrainingRecord => ({
        storeId,
        month: record.month,
        isRequired: record.isRequired,
        isFullyCompleted: record.isFullyCompleted,
      }),
      (reference) => resolveStoreId(reference, resolveStoreReference),
    );
    const drills = normalizeRecords(
      mockData.drillRecords.filter((record) =>
        includedMonths.has(record.month),
      ),
      selectedStoreIds,
      (record, storeId): KpiDrillRecord => ({
        storeId,
        month: record.month,
        isCompleted: record.isCompleted,
      }),
      (reference) => resolveStoreId(reference, resolveStoreReference),
    );
    const inspections = normalizeRecords(
      mockData.inspectionRecords.filter((record) =>
        includedMonths.has(record.period),
      ),
      selectedStoreIds,
      (record, storeId): KpiInspectionRecord => ({
        storeId,
        period: record.period,
        isRequired: record.isRequired,
        isCompleted: record.isCompleted,
      }),
      (reference) => resolveStoreId(reference, resolveStoreReference),
    );

    const aggregateScopeCovered = isActionAggregateScopeCovered(
      coverage,
      parsedPeriod,
    );
    const actionClosureRates = normalizeRecords(
      matchingActionAggregates(mockData.actionClosureRates, parsedPeriod),
      selectedStoreIds,
      (record, storeId): KpiActionClosureRateRecord => ({
        storeId,
        value: record.value,
      }),
      (reference) => resolveStoreId(reference, resolveStoreReference),
    );

    return {
      stores: requestedStoreList,
      training: withCoverage(
        training.items,
        isSourceCovered(
          context,
          selectedStoreIdList,
          parsedPeriod,
          coverage,
          "training",
        ),
        training.resolutionComplete,
      ),
      drills: withCoverage(
        drills.items,
        isSourceCovered(
          context,
          selectedStoreIdList,
          parsedPeriod,
          coverage,
          "drills",
        ),
        drills.resolutionComplete,
      ),
      inspections: withCoverage(
        inspections.items,
        isSourceCovered(
          context,
          selectedStoreIdList,
          parsedPeriod,
          coverage,
          "inspections",
        ),
        inspections.resolutionComplete,
      ),
      actionClosureRates: withCoverage(
        actionClosureRates.items,
        isSourceCovered(
          context,
          selectedStoreIdList,
          parsedPeriod,
          coverage,
          "actionClosureRates",
        ) && aggregateScopeCovered,
        actionClosureRates.resolutionComplete,
      ),
      events: eventDataSet(context, "ALL"),
    };
  }

  function actionDataSet(
    context: EhsFilterContext,
    viewMode: ActionsQuery["viewMode"],
  ): DataSet<NormalizedActionRecord> {
    const requestedStoreList = requestedStores(context, stores);
    const selectedStoreIdList = requestedStoreList.map(({ storeId }) => storeId);
    const selectedStoreIds = new Set(selectedStoreIdList);
    const parsedPeriod = parseKpiPeriod(context.period);
    const normalizedActions: NormalizedActionRecord[] = [];
    let resolutionComplete = true;
    let dateCoverageComplete = parsedPeriod !== null;

    if (parsedPeriod !== null) {
      for (const record of parsedActionRecords) {
        const submittedDate = interpretShanghaiSourceDateTime(
          record.submittedDate,
        );
        const dueDate = interpretShanghaiSourceDateTime(record.dueDate);
        const closedDate =
          record.closedDate === null
            ? null
            : interpretShanghaiSourceDateTime(record.closedDate);

        if (
          submittedDate === null ||
          dueDate === null ||
          (record.closedDate !== null && closedDate === null)
        ) {
          dateCoverageComplete = false;
          continue;
        }

        const isIncluded = isInstantInKpiPeriod(submittedDate, parsedPeriod);

        if (isIncluded === null) {
          dateCoverageComplete = false;
          continue;
        }

        if (!isIncluded) {
          continue;
        }

        const resolution = resolveStoreReference(record.storeReference);

        if (resolution.kind !== "RESOLVED") {
          resolutionComplete = false;
          continue;
        }

        const storeId = resolution.store.trtid;

        if (!selectedStoreIds.has(storeId)) {
          continue;
        }

        const recordState = classifyActionRecordState(record);

        if (viewMode === "OPEN_ONLY" && recordState !== "OPEN") {
          continue;
        }

        normalizedActions.push({
          storeId,
          storeDisplayName: resolution.store.storeNameCn,
          actionId: record.actionId,
          problem: record.problem,
          action: record.action,
          submittedBy: record.submittedBy,
          owner: record.owner,
          submittedDate,
          dueDate,
          closedDate,
          sourceStatus: record.Status,
          recordState,
          sourceReference: record.sourceReference,
        });
      }
    }

    return withCoverage(
      normalizedActions,
      isSourceCovered(
        context,
        selectedStoreIdList,
        parsedPeriod,
        mockData.coverage,
        "actions",
      ),
      resolutionComplete && dateCoverageComplete,
    );
  }

  async function getActions({
    context,
    viewMode,
    sorting,
    pageIndex: requestedPageIndex,
    pageSize: requestedPageSize,
  }: ActionsQuery): Promise<ActionsQueryResult> {
    const dataSet = actionDataSet(context, viewMode);
    const pageSize = Math.max(1, Math.trunc(requestedPageSize));
    const records = [...dataSet.items].sort((left, right) => {
      if (sorting !== undefined) {
        const comparison = compareText(
          actionSortValue(left, sorting.key),
          actionSortValue(right, sorting.key),
          sorting.direction,
        );
        if (comparison !== 0) return comparison;
      }

      return (
        right.submittedDate.localeCompare(left.submittedDate) ||
        left.actionId.localeCompare(right.actionId)
      );
    });
    const pageIndex = pageIndexForResult(
      requestedPageIndex,
      records.length,
      pageSize,
    );
    const start = pageIndex * pageSize;

    return {
      availability: dataSet.availability,
      items: records.slice(start, start + pageSize),
      totalCount: records.length,
      pageIndex,
      pageSize,
    };
  }

  function eventDataSet(
    context: EhsFilterContext,
    viewMode: EventsQuery["viewMode"],
  ): DataSet<NormalizedEventRecord> {
    const requestedStoreList = requestedStores(context, stores);
    const selectedStoreIdList = requestedStoreList.map(({ storeId }) => storeId);
    const selectedStoreIds = new Set(selectedStoreIdList);
    const parsedPeriod = parseKpiPeriod(context.period);
    const normalizedEvents: NormalizedEventRecord[] = [];
    let resolutionComplete = true;
    let dateCoverageComplete = parsedPeriod !== null;

    if (parsedPeriod !== null) {
      for (const record of eventRecords) {
        const eventDate = interpretShanghaiSourceDateTime(record.eventDate);

        if (eventDate === null) {
          dateCoverageComplete = false;
          continue;
        }

        const isIncluded = isInstantInKpiPeriod(eventDate, parsedPeriod);

        if (isIncluded === null) {
          dateCoverageComplete = false;
          continue;
        }

        if (!isIncluded) {
          continue;
        }

        const resolution = resolveStoreReference(record.storeReference);

        if (resolution.kind !== "RESOLVED") {
          resolutionComplete = false;
          continue;
        }

        const storeId = resolution.store.trtid;

        if (!selectedStoreIds.has(storeId)) {
          continue;
        }

        const recordState = classifyEventRecordState(record.Status);

        if (viewMode === "OPEN_ONLY" && recordState !== "OPEN") {
          continue;
        }

        normalizedEvents.push({
          storeId,
          storeDisplayName: resolution.store.storeNameCn,
          eventId: record.eventId,
          eventType: record.eventType,
          submittedBy: record.submittedBy,
          eventDate,
          description: record.EventDetail.Description,
          sourceStatus: record.Status,
          recordState,
          astmInjuryIllness: record.ASTMInjuryIllness,
          sourceReference: record.sourceReference,
        });
      }
    }

    return withCoverage(
      normalizedEvents,
      isSourceCovered(
        context,
        selectedStoreIdList,
        parsedPeriod,
        mockData.coverage,
        "events",
      ),
      resolutionComplete && dateCoverageComplete,
    );
  }

  async function getEvents({
    context,
    viewMode,
    eventType,
    sorting,
    pageIndex: requestedPageIndex,
    pageSize: requestedPageSize,
  }: EventsQuery): Promise<EventsQueryResult> {
    const dataSet = eventDataSet(context, viewMode);
    const availableEventTypes = [
      ...new Set(dataSet.items.map((record) => record.eventType)),
    ].sort((left, right) => left.localeCompare(right));
    const pageSize = Math.max(1, Math.trunc(requestedPageSize));
    const records = dataSet.items
      .filter(
        (record) => eventType === undefined || record.eventType === eventType,
      )
      .sort((left, right) => {
        if (sorting !== undefined) {
          const comparison = compareText(
            eventSortValue(left, sorting.key),
            eventSortValue(right, sorting.key),
            sorting.direction,
          );
          if (comparison !== 0) return comparison;
        }

        return (
          right.eventDate.localeCompare(left.eventDate) ||
          left.eventId.localeCompare(right.eventId)
        );
      });
    const pageIndex = pageIndexForResult(
      requestedPageIndex,
      records.length,
      pageSize,
    );
    const start = pageIndex * pageSize;

    return {
      availability: dataSet.availability,
      items: records.slice(start, start + pageSize),
      totalCount: records.length,
      pageIndex,
      pageSize,
      availableEventTypes,
    };
  }

  async function getTakeChargeGoals({
    context,
  }: TakeChargeGoalsQuery): Promise<TakeChargeGoalsSummary> {
    const requestedStoreList = requestedStores(context, stores);
    const selectedStoreIdList = requestedStoreList.map(({ storeId }) => storeId);
    const selectedStoreIds = new Set(selectedStoreIdList);
    const includedMonths = new Set(context.period.includedMonths);
    const parsedPeriod = parseKpiPeriod(context.period);
    const periodCovered = isSourceCovered(
      context,
      selectedStoreIdList,
      parsedPeriod,
      mockData.coverage,
      "takeCharge",
    );
    const periodAggregates = takeChargeMonthlyAggregates.filter(
      (record) =>
        selectedStoreIds.has(record.storeId) &&
        includedMonths.has(record.month),
    );
    const submissionTotal = periodAggregates.reduce(
      (sum, record) => sum + record.totalCount,
      0,
    );
    const closedCount = periodAggregates.reduce(
      (sum, record) => sum + record.closedCount,
      0,
    );
    const periodAvailability =
      periodCovered &&
      takeChargeResolutionComplete &&
      takeChargeDateCoverageComplete &&
      takeChargeStatusCoverageComplete
        ? submissionTotal === 0
          ? "CONFIRMED_EMPTY"
          : "AVAILABLE"
        : "INCOMPLETE";
    const closeRateValue =
      periodAvailability === "AVAILABLE"
        ? calculateTakeChargeCloseRate(closedCount, submissionTotal)
        : null;
    const currentYear = Number(mockData.supportedMonths[0].slice(0, 4));
    const annualContributions = takeChargeAnnualMetricContributions.filter(
      (record) =>
        record.year === currentYear && selectedStoreIds.has(record.storeId),
    );
    const annualCovered =
      selectedStoreIdList.length > 0 &&
      selectedStoreIdList.every((storeId) =>
        annualContributions.some((record) => record.storeId === storeId),
      );
    const submissionsNumerator = annualContributions.reduce(
      (sum, record) => sum + record.submissionsNumerator,
      0,
    );
    const submissionsDenominator = annualContributions.reduce(
      (sum, record) => sum + record.submissionsDenominator,
      0,
    );
    const participationNumerator = annualContributions.reduce(
      (sum, record) => sum + record.participationNumerator,
      0,
    );
    const participationDenominator = annualContributions.reduce(
      (sum, record) => sum + record.participationDenominator,
      0,
    );
    const averageSubmissionsYtd =
      annualCovered && submissionsDenominator > 0
        ? submissionsNumerator / submissionsDenominator
        : null;
    const participationRateYtd =
      annualCovered && participationDenominator > 0
        ? (participationNumerator / participationDenominator) * 100
        : null;

    return {
      period: {
        availability: periodAvailability,
        period: context.period,
        submissionTotal:
          periodAvailability === "INCOMPLETE" ? null : submissionTotal,
        closedCount:
          periodAvailability === "INCOMPLETE" ? null : closedCount,
        closeRate: {
          value: closeRateValue,
          result: evaluateTakeChargeCloseRate(closeRateValue),
        },
      },
      annual: {
        availability: annualCovered ? "AVAILABLE" : "INCOMPLETE",
        currentYear,
        averageSubmissionsYtd: {
          value: averageSubmissionsYtd,
          result: evaluateTakeChargeSubmissionsPerCapita(
            averageSubmissionsYtd,
          ),
        },
        participationRateYtd: {
          value: participationRateYtd,
          result: evaluateTakeChargeParticipateRate(participationRateYtd),
        },
      },
    };
  }

  async function getTakeChargeRecords({
    context,
    viewMode,
    sorting,
    pageIndex: requestedPageIndex,
    pageSize: requestedPageSize,
  }: TakeChargeRecordsQuery): Promise<TakeChargeRecordsResult> {
    const requestedStoreList = requestedStores(context, stores);
    const selectedStoreIdList = requestedStoreList.map(({ storeId }) => storeId);
    const selectedStoreIds = new Set(selectedStoreIdList);
    const parsedPeriod = parseKpiPeriod(context.period);
    const pageSize = Math.max(1, Math.trunc(requestedPageSize));
    const records =
      parsedPeriod === null
        ? []
        : normalizedTakeChargeRecords
            .filter((record) => {
              const isIncluded = isInstantInKpiPeriod(
                record.submittedAt,
                parsedPeriod,
              );

              return (
                isIncluded === true &&
                selectedStoreIds.has(record.storeId) &&
                (viewMode === "ALL" || record.recordState === "OPEN")
              );
            })
            .sort((a, b) => {
              if (sorting !== undefined) {
                const valueFor = (record: NormalizedTakeChargeRecord) => {
                  switch (sorting.key) {
                    case "store":
                      return record.storeDisplayName;
                    case "tchId":
                      return record.tchId;
                    case "submittedBy":
                      return record.submittedBy;
                    case "submittedAt":
                      return record.submittedAt;
                    case "status":
                      return `${record.recordState}:${record.sourceStatus}`;
                  }
                };
                const comparison = valueFor(a).localeCompare(valueFor(b));

                if (comparison !== 0) {
                  return sorting.direction === "asc" ? comparison : -comparison;
                }
              }

              return (
                b.submittedAt.localeCompare(a.submittedAt) ||
                a.tchId.localeCompare(b.tchId)
              );
            });
    const sourceCovered =
      isSourceCovered(
        context,
        selectedStoreIdList,
        parsedPeriod,
        mockData.coverage,
        "takeCharge",
      ) &&
      takeChargeResolutionComplete &&
      takeChargeDateCoverageComplete &&
      takeChargeStatusCoverageComplete;
    const pageIndex = pageIndexForResult(
      requestedPageIndex,
      records.length,
      pageSize,
    );
    const start = pageIndex * pageSize;

    return {
      availability: sourceCovered
        ? records.length === 0
          ? "CONFIRMED_EMPTY"
          : "AVAILABLE"
        : "INCOMPLETE",
      items: records.slice(start, start + pageSize),
      totalCount: records.length,
      pageIndex,
      pageSize,
      fieldDefinitions: takeChargeFieldDefinitions,
    };
  }

  async function getStores({ context }: StoresQuery): Promise<StoresQueryResult> {
    return completeDataSet(
      scopedStoreMaster(context, stores).map(toNormalizedStoreRecord),
    );
  }

  async function getEnvironment({ context }: EnvironmentQuery): Promise<EnvironmentQueryResult> {
    const selectedStores = requestedStores(context, stores);
    const selectedIds = new Set(selectedStores.map((store) => store.storeId));
    const records = new Map<string, NormalizedEnvironmentRecord>();
    let complete = true;
    for (const raw of options.environmentRecords ?? mockData.environmentRecords) {
      const resolution = resolveStoreReference({ trtid: raw.TRTID, storeNameEn: raw["English Store Name"] });
      if (resolution.kind !== "RESOLVED") {
        complete = false;
        continue;
      }
      // Canonical identity comes from the same Store projection used by Global Filters.
      const store = toKpiStore(resolution.store);
      if (!selectedIds.has(store.storeId)) continue;
      const sourceValues = [raw.环境影响评价, raw.排污许可, raw.排水许可, raw.环境预案, raw.监测, raw.废弃物合同];
      if (records.has(store.storeId) || sourceValues.some((value) => !["有", "无", "不适用"].includes(value))) {
        complete = false;
        continue;
      }
      records.set(store.storeId, {
        storeId: store.storeId,
        storeDisplayName: store.displayName,
        environmentalImpactAssessment: raw.环境影响评价,
        dischargePermit: raw.排污许可,
        drainagePermit: raw.排水许可,
        emergencyPlan: raw.环境预案,
        monitoring: raw.监测,
        wasteContract: raw.废弃物合同,
      });
    }
    const items = [...records.values()];
    return complete && selectedStores.every((store) => records.has(store.storeId))
      ? completeDataSet(items)
      : incompleteDataSet(items);
  }

  async function getCertificates({ context }: CertificatesQuery): Promise<CertificatesQueryResult> {
    const selectedStores = requestedStores(context, stores);
    const selectedIds = new Set(selectedStores.map((store) => store.storeId));
    const records: NormalizedCertificateRecord[] = [];
    let complete = true;
    const referenceDay = formatBusinessDate(referenceDate.toISOString());
    for (const raw of options.certificateRecords ?? mockData.certificateRecords) {
      const resolution = resolveStoreReference({ trtid: raw.TRTID, storeNameEn: raw["English Store Name"] });
      if (resolution.kind !== "RESOLVED") {
        complete = false;
        continue;
      }
      const store = toKpiStore(resolution.store);
      if (!selectedIds.has(store.storeId)) continue;
      records.push({
        storeId: store.storeId, storeDisplayName: store.displayName,
        certificateCategory: certificateCategoryForType(raw["Certificate Type"]),
        certificateType: raw["Certificate Type"], person: raw.Person,
        personEmail: raw["Person Email"], businessTitle: raw["Business Title"],
        expiryDate: raw["Expiry Date"],
        ...evaluateCertificateRecord(raw["Expiry Date"], referenceDay),
      });
    }
    const items = selectedStores.map((store) => ({
      storeId: store.storeId, storeDisplayName: store.displayName,
      categories: CERTIFICATE_CATEGORIES.map((certificateCategory) => {
        const categoryRecords = records.filter((record) => record.storeId === store.storeId && record.certificateCategory === certificateCategory);
        return { certificateCategory, status: evaluateCertificateCategory(categoryRecords), records: categoryRecords };
      }),
    }));
    return {
      ...(complete ? completeDataSet(items) : incompleteDataSet(items)),
      unknownTypeRecords: records.filter((record) => record.certificateCategory === null),
    };
  }

  return {
    getKpiData,
    getActions,
    getEvents,
    getTakeChargeGoals,
    getTakeChargeRecords,
    getStores,
    getEnvironment,
    getCertificates,
    getFilterStores: async () => stores.map(toKpiStore),
  };
}
