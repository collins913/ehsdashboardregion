import {
  createKpiMockData,
  mockCarWashDrainagePermitRecords,
  mockCertificateRecords,
  mockDischargePermitRecords,
  mockEiaRecords,
  mockEnvironmentalMonitoringRecords,
  mockGoalSummaries,
  mockStores,
  mockTakeChargeParticipationRecords,
  mockTakeChargeRecords,
  mockWasteContractRecords,
  type KpiMockCoverage,
} from "@/data/mock";
import { parseActionStatus } from "@/data/parse-action-status";
import type { EhsRepository } from "@/data/repositories/ehs-repository";
import {
  isInstantInKpiPeriod,
  parseKpiPeriod,
  parseTimezoneAwareInstant,
  type ParsedKpiPeriod,
} from "@/data/contracts/kpi-period";
import type {
  DataSet,
  FilterScope,
  KpiActionClosureRateRecord,
  KpiActionRecord,
  KpiDataSnapshot,
  KpiDrillRecord,
  KpiEventRecord,
  KpiFilterContext,
  KpiInspectionRecord,
  KpiStore,
  KpiTrainingRecord,
} from "@/data/contracts/kpi";
import type {
  ActionClosureRateRecord,
  ActionRecord,
  StoreId,
  StoreMasterData,
  StoreReference,
} from "@/types/ehs";

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
): { items: readonly U[]; resolutionComplete: boolean } {
  const items: U[] = [];
  let resolutionComplete = true;

  for (const record of records) {
    const storeId = resolveStoreId(record.storeReference);

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

export function createMockEhsRepository(referenceDate: Date): EhsRepository {
  const mockData = createKpiMockData(referenceDate);
  const parsedActionRecords: readonly ActionRecord[] = mockData.actionRecords.map(
    (record) => ({
      ...record,
      Status: parseActionStatus(record.Status),
    }),
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

    const coveragePeriod = parseKpiPeriod(coverage.period);
    const actionScopeCovered =
      parsedPeriod !== null &&
      coveragePeriod !== null &&
      parsedPeriod.startMilliseconds === coveragePeriod.startMilliseconds &&
      parsedPeriod.endMilliseconds === coveragePeriod.endMilliseconds &&
      context.period.includedMonths.length ===
        coverage.period.includedMonths.length &&
      context.period.includedMonths.every(
        (month, index) => month === coverage.period.includedMonths[index],
      );
    const actions = normalizeRecords(
      actionScopeCovered ? parsedActionRecords : [],
      selectedStoreIds,
      (record, storeId): KpiActionRecord => ({
        storeId,
        actionId: record.actionId,
        actionTitle: record.actionTitle,
        owner: record.owner,
        createdDate: record.createdDate,
        dueDate: record.dueDate,
        closedDate: record.closedDate,
        Status: record.Status,
        sourceReference: record.sourceReference,
      }),
    );

    const events: {
      items: readonly KpiEventRecord[];
      resolutionComplete: boolean;
    } = { items: [], resolutionComplete: parsedPeriod !== null };

    if (parsedPeriod !== null) {
      const items: KpiEventRecord[] = [];
      let resolutionComplete = true;

      for (const record of mockData.eventRecords) {
        const storeId = resolveStoreId(record.storeReference);

        if (storeId === null) {
          resolutionComplete = false;
          continue;
        }

        if (!selectedStoreIds.has(storeId)) {
          continue;
        }

        const isIncluded = isInstantInKpiPeriod(
          record.eventDateTime,
          parsedPeriod,
        );

        if (isIncluded === null) {
          resolutionComplete = false;
        } else if (isIncluded) {
          items.push({
            storeId,
            ASTMInjuryIllness: record.ASTMInjuryIllness,
          });
        }
      }

      events.items = items;
      events.resolutionComplete = resolutionComplete;
    }

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
      actions: withCoverage(
        actions.items,
        isSourceCovered(
          context,
          selectedStoreIdList,
          parsedPeriod,
          coverage,
          "actions",
        ) && actionScopeCovered,
        actions.resolutionComplete,
      ),
      events: withCoverage(
        events.items,
        isSourceCovered(
          context,
          selectedStoreIdList,
          parsedPeriod,
          coverage,
          "events",
        ),
        events.resolutionComplete,
      ),
    };
  }

  return {
    getKpiData,
    listFilterStores: () => mockStores.map(toKpiStore),
    listStores: () => mockStores,
    findStoreCandidates: (reference) =>
      mockStores.filter((store) => matchesStoreReference(store, reference)),
    listTrainingRecords: () => mockData.trainingRecords,
    listDrillRecords: () => mockData.drillRecords,
    listInspectionRecords: () => mockData.inspectionRecords,
    listActionClosureRates: () => mockData.actionClosureRates,
    listActionRecords: () => parsedActionRecords,
    listEventRecords: () => mockData.eventRecords,
    listGoalSummaries: () => mockGoalSummaries,
    listTakeChargeRecords: () => mockTakeChargeRecords,
    listTakeChargeParticipationRecords: () =>
      mockTakeChargeParticipationRecords,
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
