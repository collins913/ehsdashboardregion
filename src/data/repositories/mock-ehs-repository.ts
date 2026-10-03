import { toKpiStore } from "@/data/normalize-store-master";
import {
  createKpiMockData,
  type KpiMockCoverage,
} from "@/data/mock";
import type { MockDataset } from "@/data/mock/mock-dataset";
import type { EnvironmentAnalyticsQuery, EnvironmentAnalyticsResult, EnvironmentQuery, EnvironmentQueryResult, NormalizedEnvironmentRecord } from "@/data/contracts/environment";
import type { CertificatesQuery, CertificatesQueryResult, NormalizedCertificateRecord } from "@/data/contracts/certificates";
import type { OverviewScoreData, OverviewScoreDataQuery } from "@/data/contracts/overview";
import type { OverviewRequiredSetProvider } from "@/data/contracts/overview-requirements";
import { mockV1OverviewRequiredSetProvider } from "@/data/mock/overview-required-sets";
import type {
  KpiDetailQuery,
  KpiTrainingDetailRecord,
  KpiDrillDetailRecord,
  KpiInspectionDetailRecord,
} from "@/data/contracts/kpi-details";
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
  shanghaiMonthForDate,
  shanghaiMonthForInstant,
  periodFromMonthRange,
  type ParsedKpiPeriod,
} from "@/data/contracts/kpi-period";
import type {
  DataAvailability,
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
import type { EventAnalyticsQuery, EventAnalyticsResult } from "@/data/contracts/event-analytics";
import type { ActionAnalyticsQuery, ActionAnalyticsResult } from "@/data/contracts/action-analytics";
import type {
  NormalizedTakeChargeRecord,
  TakeChargeFieldDefinition,
  TakeChargeGoalsQuery,
  TakeChargeGoalsSummary,
  TakeChargeRecordsQuery,
  TakeChargeRecordsResult,
} from "@/data/contracts/take-charge";
import {
  createMockTakeChargeAnnualAggregateReader,
  type MockTakeChargeAnnualAggregateFixture,
} from "@/data/mock/take-charge";
import type {
  NormalizedStoreRecord,
  StoresQuery,
  StoresQueryResult,
} from "@/data/contracts/stores";
import type {
  ActionClosureRateRecord,
  ActionRecord,
  EventRecord,
  InspectionRecord,
  RawActionRecord,
  RawEnvironmentRecord,
  RawCertificateRecord,
  Month,
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
import { buildEventAnalytics } from "@/lib/rules/event-analytics";
import { buildActionAnalytics } from "@/lib/rules/action-analytics";
import { buildEnvironmentAnalytics } from "@/lib/rules/environment-analytics";
import { buildKpiRows } from "@/features/kpi/build-kpi-rows";
import { buildOverviewScoreContributions, overviewObservationKey } from "@/lib/rules/overview-scoring";
import { evaluateExpectedInspections, evaluateRequiredTraining } from "@/lib/rules/overview-required-set-rules";

function scopeIncludes<T>(scope: FilterScope<T>, value: T): boolean {
  return scope.kind === "ALL" || scope.values.includes(value);
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
    regionOwner: store.regionOwner ?? null,
    regionOwnerEmail: store.regionOwnerEmail ?? null,
    areaOwner: store.areaOwner ?? null,
    areaOwnerEmail: store.areaOwnerEmail ?? null,
    managerEmail: store.managerEmail ?? null,
    ehsAmbassador: store.ehsAmbassador,
    ehsAmbassadorEmail: store.ehsAmbassadorEmail ?? null,
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

function inspectionRecordsForPeriod(
  records: readonly InspectionRecord[],
  selectedStoreIds: ReadonlySet<StoreId>,
  includedMonths: ReadonlySet<Month>,
  resolveReference: StoreReferenceResolver,
): { items: readonly InspectionRecord[]; dateCoverageComplete: boolean } {
  const items: InspectionRecord[] = [];
  let dateCoverageComplete = true;

  for (const record of records) {
    const resolution = resolveReference(record.storeReference);
    if (
      resolution.kind === "RESOLVED" &&
      !selectedStoreIds.has(resolution.store.trtid)
    ) {
      continue;
    }

    const month = shanghaiMonthForDate(record.dueDate);
    if (month === null) {
      dateCoverageComplete = false;
      continue;
    }

    if (includedMonths.has(month)) items.push(record);
  }

  return { items, dateCoverageComplete };
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

function normalizedSourceStatus(value: unknown): string | null {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed ? trimmed : null;
}

function preserveDataSetAvailability<T>(
  source: DataSet<unknown>,
  items: readonly T[],
): DataSet<T> {
  if (source.availability === "INCOMPLETE") return incompleteDataSet(items);
  if (source.availability === "UNAVAILABLE") return { availability: "UNAVAILABLE", items: [] };
  return completeDataSet(items);
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
  takeChargeAnnualAggregateFixtures?: readonly MockTakeChargeAnnualAggregateFixture[];
  overviewRequiredSetProvider?: OverviewRequiredSetProvider | null;
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
  readTakeChargeAnnualAggregate: ReturnType<
    typeof createMockTakeChargeAnnualAggregateReader
  >;
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
  takeChargeAnnualAggregateFixtures: readonly MockTakeChargeAnnualAggregateFixture[],
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
    readTakeChargeAnnualAggregate:
      createMockTakeChargeAnnualAggregateReader(
        takeChargeAnnualAggregateFixtures,
      ),
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
  const overviewRequiredSetProvider = options.overviewRequiredSetProvider === undefined
    ? mockV1OverviewRequiredSetProvider
    : options.overviewRequiredSetProvider;
  const stores = mockData.stores;
  const rawActionRecords = options.actionRecords ?? mockData.actionRecords;
  const rawEventRecords = options.eventRecords ?? mockData.eventRecords;
  const takeChargeRecords =
    options.takeChargeRecords ?? mockData.takeChargeRecords;
  const rawTakeChargeFieldDefinitions = validTakeChargeFieldDefinitions(
    options.takeChargeFieldDefinitions ?? mockData.takeChargeFieldDefinitions,
  );
  const rawTakeChargeAnnualAggregateFixtures =
    options.takeChargeAnnualAggregateFixtures ??
    mockData.takeChargeAnnualAggregateFixtures;
  const hasOverrides =
    options.actionRecords !== undefined ||
    options.eventRecords !== undefined ||
    options.takeChargeRecords !== undefined ||
    options.takeChargeFieldDefinitions !== undefined ||
    options.takeChargeAnnualAggregateFixtures !== undefined;
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
      rawTakeChargeAnnualAggregateFixtures,
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
    readTakeChargeAnnualAggregate,
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
    const scopedInspectionRecords = inspectionRecordsForPeriod(
      mockData.inspectionRecords,
      selectedStoreIds,
      includedMonths,
      resolveStoreReference,
    );

    const training = normalizeRecords(
      mockData.trainingRecords.filter((record) =>
        includedMonths.has(record.month),
      ),
      selectedStoreIds,
      (record, storeId): KpiTrainingRecord => ({
        storeId,
        month: record.month,
        trainingName: record.trainingName,
        completionRate: record.completionRate,
        incompletePeople: record.incompletePeople,
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
        status: normalizedSourceStatus(record.status),
      }),
      (reference) => resolveStoreId(reference, resolveStoreReference),
    );
    const inspections = normalizeRecords(
      scopedInspectionRecords.items,
      selectedStoreIds,
      (record, storeId): KpiInspectionRecord => ({
        storeId,
        inspectionNumber: record.inspectionNumber,
        inspectionName: record.inspectionName,
        status: normalizedSourceStatus(record.status),
        sourceStatusInvalid: record.status !== null && typeof record.status !== "string",
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
        ) && scopedInspectionRecords.dateCoverageComplete,
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

  function detailScope({ context, storeId }: KpiDetailQuery) {
    const allowedStore = requestedStores(context, stores).some(
      (store) => store.storeId === storeId,
    );

    if (!allowedStore) return null;

    return {
      includedMonths: new Set(context.period.includedMonths),
      parsedPeriod: parseKpiPeriod(context.period),
      selectedStoreIds: new Set([storeId]),
      storeIds: [storeId] as const,
    };
  }

  async function getKpiTrainingDetails(query: KpiDetailQuery) {
    const scope = detailScope(query);
    if (!scope) return { availability: "UNAVAILABLE", items: [] } as const;
    const normalized = normalizeRecords(
      mockData.trainingRecords.filter((record) =>
        scope.includedMonths.has(record.month),
      ),
      scope.selectedStoreIds,
      (record): KpiTrainingDetailRecord => ({
        trainingName: record.trainingName,
        month: record.month,
        completionRate: record.completionRate,
        incompletePeople: record.incompletePeople,
      }),
      (reference) => resolveStoreId(reference, resolveStoreReference),
    );
    const items = [...normalized.items].sort(
      (left, right) =>
        right.month.localeCompare(left.month) ||
        left.trainingName.localeCompare(right.trainingName),
    );

    return withCoverage(
      items,
      isSourceCovered(
        query.context,
        scope.storeIds,
        scope.parsedPeriod,
        mockData.coverage,
        "training",
      ),
      normalized.resolutionComplete,
    );
  }

  async function getKpiDrillDetails(query: KpiDetailQuery) {
    const scope = detailScope(query);
    if (!scope) return { availability: "UNAVAILABLE", items: [] } as const;
    const normalized = normalizeRecords(
      mockData.drillRecords.filter((record) =>
        scope.includedMonths.has(record.month),
      ),
      scope.selectedStoreIds,
      (record): KpiDrillDetailRecord => ({
        drillName: record.drillName,
        month: record.month,
        status: normalizedSourceStatus(record.status),
      }),
      (reference) => resolveStoreId(reference, resolveStoreReference),
    );
    const items = [...normalized.items].sort(
      (left, right) =>
        right.month.localeCompare(left.month) ||
        left.drillName.localeCompare(right.drillName),
    );

    return withCoverage(
      items,
      isSourceCovered(
        query.context,
        scope.storeIds,
        scope.parsedPeriod,
        mockData.coverage,
        "drills",
      ) && items.every((record) => record.status !== null),
      normalized.resolutionComplete,
    );
  }

  async function getKpiInspectionDetails(query: KpiDetailQuery) {
    const scope = detailScope(query);
    if (!scope) return { availability: "UNAVAILABLE", items: [] } as const;
    const scopedRecords = inspectionRecordsForPeriod(
      mockData.inspectionRecords,
      scope.selectedStoreIds,
      scope.includedMonths,
      resolveStoreReference,
    );
    const normalized = normalizeRecords(
      scopedRecords.items,
      scope.selectedStoreIds,
      (record): KpiInspectionDetailRecord => ({
        inspectionNumber: record.inspectionNumber,
        inspectionName: record.inspectionName,
        dueDate: record.dueDate,
        inspector: record.inspector,
        status: normalizedSourceStatus(record.status),
      }),
      (reference) => resolveStoreId(reference, resolveStoreReference),
    );
    const validDate = (value: string | null) =>
      value !== null && shanghaiMonthForDate(value) !== null ? value : null;
    const items = [...normalized.items].sort((left, right) => {
      const leftDate = validDate(left.dueDate);
      const rightDate = validDate(right.dueDate);
      if (leftDate === null && rightDate !== null) return 1;
      if (leftDate !== null && rightDate === null) return -1;
      if (leftDate !== null && rightDate !== null) {
        const comparison = rightDate.localeCompare(leftDate);
        if (comparison !== 0) return comparison;
      }
      return left.inspectionName.localeCompare(right.inspectionName);
    });

    return withCoverage(
      items,
      isSourceCovered(
        query.context,
        scope.storeIds,
        scope.parsedPeriod,
        mockData.coverage,
        "inspections",
      ) && scopedRecords.dateCoverageComplete,
      normalized.resolutionComplete,
    );
  }

  async function getKpiAstmDetails(query: KpiDetailQuery) {
    const scope = detailScope(query);
    if (!scope) return { availability: "UNAVAILABLE", items: [] } as const;
    const source = eventDataSet(query.context, "ALL");
    const items = source.items
      .filter(
        (record) =>
          record.storeId === query.storeId &&
          record.astmInjuryIllness === "Yes",
      )
      .sort(
        (left, right) =>
          right.eventDate.localeCompare(left.eventDate) ||
          left.eventId.localeCompare(right.eventId),
      );

    return preserveDataSetAvailability(source, items);
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

  async function getActionsAnalytics({ context }: ActionAnalyticsQuery): Promise<ActionAnalyticsResult> {
    const dataSet = actionDataSet(context, "ALL");
    return {
      ...buildActionAnalytics(context, dataSet.items),
      availability: dataSet.availability,
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
    let enumCoverageComplete = true;

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

        if (record.ASTMInjuryIllness !== "Yes" && record.ASTMInjuryIllness !== "No") {
          enumCoverageComplete = false;
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
      resolutionComplete && dateCoverageComplete && enumCoverageComplete,
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

  async function getEventsAnalytics({
    context,
  }: EventAnalyticsQuery): Promise<EventAnalyticsResult> {
    const dataSet = eventDataSet(context, "ALL");
    return {
      ...buildEventAnalytics(context, dataSet.items),
      availability: dataSet.availability,
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
    const annualAggregate = readTakeChargeAnnualAggregate(
      currentYear,
      selectedStoreIdList,
      context.period.includedMonths.at(-1),
    );
    const averageSubmissionsYtd =
      annualAggregate?.averageSubmissionsYtd ?? null;
    const participationRateYtd =
      annualAggregate?.participationRateYtd ?? null;

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
        availability: annualAggregate === null ? "INCOMPLETE" : "AVAILABLE",
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
      if (
        records.has(store.storeId) ||
        !["有", "无", "不适用"].includes(raw.监测)
      ) {
        complete = false;
        continue;
      }
      records.set(store.storeId, {
        storeId: store.storeId,
        storeDisplayName: store.displayName,
        facilityInformation: null,
        environmentalLicenses: {
          environmentalImpactAssessment: {
            assessmentText: raw.环境影响评价.环境影响评价,
            totalRequirements: {
              airParticulate: raw.环境影响评价.总量要求["气-颗粒物"],
              airVocs: raw.环境影响评价.总量要求["气-VOCs"],
              waterAmmoniaNitrogen: raw.环境影响评价.总量要求["水-氨氮"],
              waterTotalNitrogen: raw.环境影响评价.总量要求["水-总氮"],
              waterTotalPhosphorus: raw.环境影响评价.总量要求["水-总磷"],
              waterCodCr: raw.环境影响评价.总量要求["水-CODcr"],
            },
          },
          dischargePermit: {
            permitText: raw.排污许可.排污许可,
            executionReport: raw.排污许可.执行报告,
            permitNumber: raw.排污许可.编号,
            validFrom: raw.排污许可.有效期起,
            validTo: raw.排污许可.有效期止,
            totalRequirements: {
              productionCapacity: raw.排污许可.总量要求.产能,
              approvedCoatingUsage: raw.排污许可.总量要求.涂料批复用量,
            },
            remarks: raw.排污许可.备注,
          },
          drainagePermit: {
            carWash: raw.排水许可.洗车,
            drainagePermitText: raw.排水许可.排水许可,
            validFrom: raw.排水许可.有效期起,
            validTo: raw.排水许可.有效期止,
            remarks: raw.排水许可.备注,
          },
        },
        emergencyPlan: {
          filingStatus: raw.环境预案.突发环境事件应急预案备案情况,
          filingNumber: raw.环境预案.备案编号,
          validFrom: raw.环境预案.有效期起,
          validTo: raw.环境预案.有效期止,
          remarks: raw.环境预案.备注,
        },
        monitoring: { monitoringText: raw.监测 },
        wasteContracts: {
          hazardousWaste: raw.废弃物合同.危险废物处置合同.map(
            (contract) => ({
              supplierName: contract.供应商名称,
              wasteType: contract.种类,
              validFrom: contract.有效期起,
              validTo: contract.有效期止,
            }),
          ),
          generalIndustrialSolidWaste:
            raw.废弃物合同.一般工业固体废物处置合同.map((contract) => ({
              supplierName: contract.供应商名称,
              wasteType: contract.种类,
              validFrom: contract.有效期起,
              validTo: contract.有效期止,
            })),
        },
      });
    }
    const items = [...records.values()];
    return complete && selectedStores.every((store) => records.has(store.storeId))
      ? completeDataSet(items)
      : incompleteDataSet(items);
  }

  async function getEnvironmentAnalytics({ context, period }: EnvironmentAnalyticsQuery): Promise<EnvironmentAnalyticsResult> {
    const environment = await getEnvironment({ context });
    const eligibleStoreCount = requestedStores(context, stores).length;
    return buildEnvironmentAnalytics(
      environment.availability,
      environment.items,
      eligibleStoreCount,
      period,
      formatBusinessDate(referenceDate.toISOString()),
    );
  }

  async function getCertificates({ context, referenceDate: requestedReferenceDate }: CertificatesQuery): Promise<CertificatesQueryResult> {
    const selectedStores = requestedStores(context, stores);
    const selectedIds = new Set(selectedStores.map((store) => store.storeId));
    const records: NormalizedCertificateRecord[] = [];
    let complete = true;
    const referenceDay = requestedReferenceDate ?? formatBusinessDate(referenceDate.toISOString());
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

  async function getOverviewScoreData({ scope, attentionScope }: OverviewScoreDataQuery): Promise<OverviewScoreData> {
    const selectedStores = requestedStores(scope, stores);
    const attentionStores = requestedStores(attentionScope ?? scope, stores);
    const calculationStores = [...new Map([...selectedStores, ...attentionStores].map((store) => [store.storeId, store])).values()];
    const observations = new Map<string, import("@/lib/rules/overview-scoring").OverviewDomainObservation>();
    const put = (storeId: StoreId, month: Month, metricId: import("@/data/contracts/overview").OverviewMetricId, value: import("@/lib/rules/overview-scoring").OverviewDomainObservation) => {
      observations.set(overviewObservationKey(storeId, month, metricId), value);
    };
    const monthEnd = (month: Month) => {
      const [year, number] = month.split("-").map(Number);
      if (month === mockData.supportedMonths.at(-1)) return formatBusinessDate(referenceDate.toISOString());
      return new Date(Date.UTC(year, number, 0)).toISOString().slice(0, 10);
    };
    const annualByKey = new Map(rawTakeChargeAnnualAggregateFixtures.map((fixture) => [`${fixture.storeId}\u0000${fixture.referenceMonth}`, fixture]));
    const monthlyByKey = new Map(takeChargeMonthlyAggregates.map((aggregate) => [`${aggregate.storeId}\u0000${aggregate.month}`, aggregate]));
    const selectedStoreIds = calculationStores.map(({ storeId }) => storeId);

    for (const month of mockData.supportedMonths) {
      const period = periodFromMonthRange(month, month);
      if (!period) continue;
      const context: EhsFilterContext = { ...(attentionScope ?? scope), period };
      const snapshot = await getKpiData(context);
      const kpiRows = buildKpiRows(context, snapshot);
      const sourceReason = (availability: DataAvailability) => availability === "UNAVAILABLE" ? "SOURCE_MISSING" as const : "SOURCE_INCOMPLETE" as const;

      for (const row of kpiRows) {
        const { storeId } = row.store;
        const trainingEvaluation = evaluateRequiredTraining(
          overviewRequiredSetProvider?.getRequiredTrainingItems({ storeId, month }) ?? null,
          snapshot.training.items.filter((record) => record.storeId === storeId && record.month === month),
          snapshot.training.availability,
        );
        put(storeId, month, "TRAINING", { kind: "DOMAIN_ACHIEVEMENT", ...trainingEvaluation });

        const inspectionEvaluation = evaluateExpectedInspections(
          overviewRequiredSetProvider?.getExpectedInspectionTasks({ storeId, month }) ?? null,
          snapshot.inspections.items.filter((record) => record.storeId === storeId),
          snapshot.inspections.availability,
        );
        put(storeId, month, "INSPECTION", { kind: "DOMAIN_ACHIEVEMENT", ...inspectionEvaluation });

        const drillAvailability = row.drill.availability;
        put(storeId, month, "DRILL", drillAvailability === "INCOMPLETE" || drillAvailability === "UNAVAILABLE"
          ? { kind: drillAvailability === "UNAVAILABLE" ? "SOURCE_MISSING" : "SOURCE_INCOMPLETE" }
          : { kind: "PERFORMANCE_RESULT", result: row.drill.result, undeterminedReason: "SOURCE_INVALID" });

        const actionAvailability = row.actions.availability;
        put(storeId, month, "ACTION_CLOSURE_RATE", actionAvailability === "INCOMPLETE" || actionAvailability === "UNAVAILABLE"
          ? { kind: sourceReason(actionAvailability) }
          : row.actions.value === null && row.actions.result === "UNDETERMINED"
            ? { kind: "SOURCE_INVALID" }
            : { kind: "PERFORMANCE_RESULT", result: row.actions.result, undeterminedReason: "SOURCE_INVALID" });

        const astmAvailability = row.astmEvents.availability;
        put(storeId, month, "ASTM_INCIDENT", astmAvailability === "INCOMPLETE" || astmAvailability === "UNAVAILABLE"
          ? { kind: sourceReason(astmAvailability) }
          : { kind: "ASTM_RESULT", result: row.astmEvents.result, unavailableReason: "SOURCE_INVALID" });

        const aggregate = monthlyByKey.get(`${storeId}\u0000${month}`);
        const takeChargeCovered = isSourceCovered(context, selectedStoreIds, parseKpiPeriod(period), mockData.coverage, "takeCharge") &&
          takeChargeResolutionComplete && takeChargeDateCoverageComplete && takeChargeStatusCoverageComplete;
        if (!takeChargeCovered) {
          put(storeId, month, "TAKE_CHARGE_CLOSE_RATE", { kind: "SOURCE_INCOMPLETE" });
        } else if (!aggregate || aggregate.totalCount === 0) {
          put(storeId, month, "TAKE_CHARGE_CLOSE_RATE", { kind: "PERFORMANCE_RESULT", result: "UNDETERMINED", undeterminedReason: "RULE_NOT_MET" });
        } else {
          const closeRate = calculateTakeChargeCloseRate(aggregate.closedCount, aggregate.totalCount);
          put(storeId, month, "TAKE_CHARGE_CLOSE_RATE", { kind: "PERFORMANCE_RESULT", result: evaluateTakeChargeCloseRate(closeRate), undeterminedReason: "SOURCE_INVALID" });
        }

        const annual = annualByKey.get(`${storeId}\u0000${month}`);
        if (!annual) {
          put(storeId, month, "AVERAGE_SUBMISSIONS_YTD", { kind: "SOURCE_MISSING" });
          put(storeId, month, "PARTICIPATION_RATE_YTD", { kind: "SOURCE_MISSING" });
        } else {
          const averageSubmissions = annual.submissionsDenominator > 0 ? annual.submissionsNumerator / annual.submissionsDenominator : null;
          const participationRate = annual.participationDenominator > 0 ? annual.participationNumerator / annual.participationDenominator * 100 : null;
          put(storeId, month, "AVERAGE_SUBMISSIONS_YTD", averageSubmissions === null ? { kind: "SOURCE_INVALID" } : { kind: "PERFORMANCE_RESULT", result: evaluateTakeChargeSubmissionsPerCapita(averageSubmissions), undeterminedReason: "SOURCE_INVALID" });
          put(storeId, month, "PARTICIPATION_RATE_YTD", participationRate === null ? { kind: "SOURCE_INVALID" } : { kind: "PERFORMANCE_RESULT", result: evaluateTakeChargeParticipateRate(participationRate), undeterminedReason: "SOURCE_INVALID" });
        }
      }

      const certificates = await getCertificates({ context: attentionScope ?? scope, referenceDate: monthEnd(month) });
      const certificateMetricIds = {
        "安全健康": "CERTIFICATE_SAFETY_HEALTH",
        "急救员": "CERTIFICATE_FIRST_AID",
        "特种作业": "CERTIFICATE_SPECIAL_WORK",
        "安全驾驶": "CERTIFICATE_SAFE_DRIVING",
      } as const;
      if (certificates.availability === "INCOMPLETE" || certificates.availability === "UNAVAILABLE") {
        for (const store of calculationStores) {
          for (const metricId of Object.values(certificateMetricIds)) {
            put(store.storeId, month, metricId, { kind: sourceReason(certificates.availability) });
          }
        }
      } else {
        for (const store of certificates.items) {
          for (const category of store.categories) {
            const metricId = certificateMetricIds[category.certificateCategory];
            const reason = category.records.some((record) => record.certificateReason === "INVALID_EXPIRY_DATE")
              ? "SOURCE_INVALID"
              : category.records.some((record) => record.certificateReason === "MISSING_EXPIRY_DATE")
                ? "SOURCE_MISSING"
                : "RULE_NOT_MET";
            put(store.storeId, month, metricId, { kind: "CERTIFICATE_RESULT", normal: category.status === "NORMAL", reason });
          }
        }
      }
    }

    const contributions = buildOverviewScoreContributions(
      calculationStores,
      mockData.supportedMonths,
      monthEnd,
      observations,
    );
    return {
      stores: selectedStores,
      attentionStores,
      months: mockData.supportedMonths,
      contributions,
      availability: selectedStores.length > 0 ? "AVAILABLE" : "UNAVAILABLE",
    };
  }

  return {
    getKpiData,
    getKpiTrainingDetails,
    getKpiDrillDetails,
    getKpiInspectionDetails,
    getKpiAstmDetails,
    getActions,
    getActionsAnalytics,
    getEvents,
    getEventsAnalytics,
    getTakeChargeGoals,
    getTakeChargeRecords,
    getStores,
    getEnvironment,
    getEnvironmentAnalytics,
    getCertificates,
    getOverviewScoreData,
    getFilterStores: async () => stores.map(toKpiStore),
  };
}
