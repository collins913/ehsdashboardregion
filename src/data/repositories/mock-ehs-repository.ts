import {
  createKpiMockData,
  mockCarWashDrainagePermitRecords,
  mockCertificateRecords,
  mockDischargePermitRecords,
  mockEiaRecords,
  mockEnvironmentalMonitoringRecords,
  mockStores,
  mockWasteContractRecords,
  type KpiMockCoverage,
} from "@/data/mock";
import { parseActionStatus } from "@/data/parse-action-status";
import { resolveActionStore } from "@/data/resolve-action-store";
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
  KpiFilterContext,
  KpiInspectionRecord,
  KpiStore,
  KpiTrainingRecord,
} from "@/data/contracts/kpi";
import type {
  ActionsQuery,
  ActionsQueryResult,
  NormalizedActionRecord,
} from "@/data/contracts/actions";
import type {
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
  ActionClosureRateRecord,
  ActionRecord,
  EventRecord,
  RawActionRecord,
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

function matchesStoreReference(
  store: StoreMasterData,
  reference: StoreReference,
): boolean {
  if ("trtid" in reference) {
    return store.trtid === reference.trtid;
  }

  if ("storeNameCn" in reference) {
    return store.storeNameCn === reference.storeNameCn;
  }

  return store.storeNameEn === reference.storeNameEn;
}

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

function requestedStores(context: KpiFilterContext): readonly KpiStore[] {
  return mockStores
    .filter(
      (store) =>
        scopeIncludes(context.region, store.region) &&
        scopeIncludes(context.area, store.area) &&
        scopeIncludes(context.store, store.trtid),
    )
    .map(toKpiStore);
}

function isWithinDeclaredCoverage(
  context: KpiFilterContext,
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
  context: KpiFilterContext,
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

function resolveStoreId(reference: StoreReference): StoreId | null {
  const candidates = mockStores.filter((store) =>
    matchesStoreReference(store, reference),
  );

  return candidates.length === 1 ? candidates[0].trtid : null;
}

function normalizeRecords<T extends { storeReference: StoreReference }, U>(
  records: readonly T[],
  selectedStoreIds: ReadonlySet<StoreId>,
  mapRecord: (record: T, storeId: StoreId) => U,
  resolveReference: (reference: StoreReference) => StoreId | null =
    resolveStoreId,
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

export function createMockEhsRepository(
  referenceDate: Date,
  options: MockEhsRepositoryOptions = {},
): EhsRepository {
  const mockData = createKpiMockData(referenceDate);
  const rawActionRecords = options.actionRecords ?? mockData.actionRecords;
  const eventRecords = options.eventRecords ?? mockData.eventRecords;
  const takeChargeRecords =
    options.takeChargeRecords ?? mockData.takeChargeRecords;
  const takeChargeFieldDefinitions = validTakeChargeFieldDefinitions(
    options.takeChargeFieldDefinitions ?? mockData.takeChargeFieldDefinitions,
  );
  const takeChargeAnnualMetricContributions =
    options.takeChargeAnnualMetricContributions ??
    mockData.takeChargeAnnualMetricContributions;
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
    const resolution = resolveActionStore(record.storeReference, mockStores);
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

  const takeChargeMonthlyAggregates = buildTakeChargeMonthlyAggregates(
    normalizedTakeChargeRecords,
  );

  function getKpiData(context: KpiFilterContext): KpiDataSnapshot {
    const stores = requestedStores(context);
    const selectedStoreIdList = stores.map(({ storeId }) => storeId);
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
    );

    return {
      stores,
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
      actions: getActions({ context, viewMode: "OPEN_ONLY" }),
      events: getEvents({ context, viewMode: "ALL" }),
    };
  }

  function getActions({ context, viewMode }: ActionsQuery): ActionsQueryResult {
    const stores = requestedStores(context);
    const selectedStoreIdList = stores.map(({ storeId }) => storeId);
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

        const resolution = resolveActionStore(record.storeReference, mockStores);

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

  function getEvents({
    context,
    viewMode,
    eventType,
  }: EventsQuery): EventsQueryResult {
    const stores = requestedStores(context);
    const selectedStoreIdList = stores.map(({ storeId }) => storeId);
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

        const resolution = resolveActionStore(record.storeReference, mockStores);

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

        if (eventType !== undefined && record.eventType !== eventType) {
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

  function getTakeChargeGoals({
    context,
  }: TakeChargeGoalsQuery): TakeChargeGoalsSummary {
    const stores = requestedStores(context);
    const selectedStoreIdList = stores.map(({ storeId }) => storeId);
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

  function getTakeChargeRecords({
    context,
    viewMode,
    sorting,
    pageIndex: requestedPageIndex,
    pageSize: requestedPageSize,
  }: TakeChargeRecordsQuery): TakeChargeRecordsResult {
    const stores = requestedStores(context);
    const selectedStoreIdList = stores.map(({ storeId }) => storeId);
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

  return {
    getKpiData,
    getActions,
    getEvents,
    getTakeChargeGoals,
    getTakeChargeRecords,
    listFilterStores: () => mockStores.map(toKpiStore),
    listStores: () => mockStores,
    findStoreCandidates: (reference) =>
      mockStores.filter((store) => matchesStoreReference(store, reference)),
    listTrainingRecords: () => mockData.trainingRecords,
    listDrillRecords: () => mockData.drillRecords,
    listInspectionRecords: () => mockData.inspectionRecords,
    listActionClosureRates: () => mockData.actionClosureRates,
    listActionRecords: () => parsedActionRecords,
    listEventRecords: () => eventRecords,
    listCertificateRecords: () => mockCertificateRecords,
    listWasteContractRecords: () => mockWasteContractRecords,
    listCarWashDrainagePermitRecords: () =>
      mockCarWashDrainagePermitRecords,
    listEiaRecords: () => mockEiaRecords,
    listDischargePermitRecords: () => mockDischargePermitRecords,
    listEnvironmentalMonitoringRecords: () =>
      mockEnvironmentalMonitoringRecords,
  };
}
