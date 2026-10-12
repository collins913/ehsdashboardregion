import { areaScopeId } from "@/data/contracts/kpi";
import { toKpiStore } from "@/data/normalize-store-master";
import {
  createKpiMockData,
  type KpiMockCoverage,
} from "@/data/mock";
import type { MockDataset } from "@/data/mock/mock-dataset";
import type { EnvironmentAnalyticsRepositoryQuery, EnvironmentAnalyticsResult, EnvironmentQuery, EnvironmentQueryResult, NormalizedEnvironmentRecord } from "@/data/contracts/environment";
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
import { CERTIFICATE_CATEGORIES } from "@/lib/rules/certificate-types";
import { evaluateCertificateCategoryResult, evaluateCertificateRecord } from "@/lib/rules/certificate-rules";
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
  DataAvailability,
  DataSet,
  FilterScope,
  KpiActionClosureRateRecord,
  KpiDataSnapshot,
  EhsFilterContext,
  EhsStoreScope,
  KpiStore,
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
  EventRecord,
  RawActionRecord,
  RawEnvironmentRecord,
  RawCertificateRecord,
  Month,
  StoreId,
  StoreMasterData,
  TakeChargeRecord,
} from "@/types/ehs";
import { classifyActionRecordState } from "@/lib/rules/action-rules";
import { classifyTakeChargeRecordState } from "@/lib/rules/take-charge-rules";
import { buildTakeChargeMonthlyAggregates } from "@/data/take-charge-monthly-aggregate";
import { buildEventAnalytics } from "@/lib/rules/event-analytics";
import { buildActionAnalytics } from "@/lib/rules/action-analytics";
import { buildEnvironmentAnalytics } from "@/lib/rules/environment-analytics";
import { evaluateKpiDomain } from "@/lib/rules/kpi-domain";
import { prepareCertificateSources } from "@/data/normalize-certificate-sources";
import { prepareKpiSources, sourceIssueStoreIds } from "@/data/normalize-kpi-sources";
import { StorePeriodIndex } from "@/data/store-period-index";
import type { DomainSource } from "@/data/contracts/domain-result";
import { produceOverviewScoreData } from "@/lib/rules/overview-production";
import { evaluateTakeChargeAnnual, evaluateTakeChargePeriod } from "@/lib/rules/goal-domain";
import { mostSpecificReason } from "@/lib/rules/domain-diagnostics";

function scopePredicate<T>(scope: FilterScope<T>): (value: T) => boolean {
  if (scope.kind === "ALL") return () => true;
  const values = new Set(scope.values);
  return (value) => values.has(value);
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
  const regionIncludes = scopePredicate(context.region);
  const areaIncludes = scopePredicate(context.area);
  const storeIncludes = scopePredicate(context.store);
  return stores.filter((store) => regionIncludes(store.region) && areaIncludes(areaScopeId(store.region, store.area)) && storeIncludes(store.trtid));
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
  actionIndex: StorePeriodIndex<NormalizedActionRecord>;
  normalizedTakeChargeRecords: readonly NormalizedTakeChargeRecord[];
  takeChargeFieldDefinitions: readonly TakeChargeFieldDefinition[];
  readTakeChargeAnnualAggregate: ReturnType<
    typeof createMockTakeChargeAnnualAggregateReader
  >;
  kpiSources: ReturnType<typeof prepareKpiSources>;
  certificateSources: ReturnType<typeof prepareCertificateSources>;
  takeChargeIndex: StorePeriodIndex<NormalizedTakeChargeRecord>;
  takeChargeMonthlyAggregates: ReturnType<
    typeof buildTakeChargeMonthlyAggregates
  >;
};

const preparedDatasetCache = new WeakMap<MockDataset, PreparedMockDataset>();

function prepareMockDataset(
  stores: readonly StoreMasterData[],
  rawActionRecords: readonly RawActionRecord[],
  takeChargeRecords: readonly TakeChargeRecord[],
  takeChargeFieldDefinitions: readonly TakeChargeFieldDefinition[],
  takeChargeAnnualAggregateFixtures: readonly MockTakeChargeAnnualAggregateFixture[],
  kpiRawSources: Parameters<typeof prepareKpiSources>[0],
  certificateRecords: readonly RawCertificateRecord[],
): PreparedMockDataset {
  const resolveStoreReference = createStoreReferenceResolver(stores);
  const actionIndex = new StorePeriodIndex<NormalizedActionRecord>();
  for (const record of rawActionRecords) {
    const resolution = resolveStoreReference(record.storeReference);
    const submittedDate = interpretShanghaiSourceDateTime(record.submittedDate);
    const month = submittedDate === null ? null : shanghaiMonthForInstant(submittedDate);
    if (resolution.kind !== "RESOLVED") {
      actionIndex.issue(sourceIssueStoreIds(record.storeReference, stores), month, "SOURCE_INVALID");
      continue;
    }
    const store = resolution.store;
    const dueDate = interpretShanghaiSourceDateTime(record.dueDate);
    const closedDate = record.closedDate === null ? null : interpretShanghaiSourceDateTime(record.closedDate);
    if (submittedDate === null || month === null || dueDate === null || (record.closedDate !== null && closedDate === null)) {
      actionIndex.issue([store.trtid], month, "SOURCE_INVALID");
      continue;
    }
    const sourceStatus = parseActionStatus(record.Status);
    actionIndex.add(store.trtid, month, {
      storeId: store.trtid,
      storeDisplayName: store.storeNameCn,
      actionId: record.actionId,
      problem: record.problem,
      action: record.action,
      submittedBy: record.submittedBy,
      owner: record.owner,
      submittedDate,
      dueDate,
      closedDate,
      sourceStatus,
      recordState: classifyActionRecordState({ Status: sourceStatus }),
      sourceReference: record.sourceReference,
    });
  }
  const normalizedTakeChargeRecords: NormalizedTakeChargeRecord[] = [];
  const takeChargeIndex = new StorePeriodIndex<NormalizedTakeChargeRecord>();

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
      takeChargeIndex.issue(sourceIssueStoreIds(record.storeReference, stores), submittedMonth, "SOURCE_INVALID");
      continue;
    }

    if (normalizedSubmittedAt === null || submittedMonth === null) {
      takeChargeIndex.issue([resolution.store.trtid], null, record.submittedAt ? "SOURCE_INVALID" : "SOURCE_MISSING");
      continue;
    }

    if (typeof record.Status !== "string" || record.Status.trim().length === 0) {
      takeChargeIndex.issue([resolution.store.trtid], submittedMonth, typeof record.Status === "string" ? "SOURCE_INCOMPLETE" : "SOURCE_INVALID");
    }

    const extraFields = Object.fromEntries(
      takeChargeFieldDefinitions.map(({ key }) => [
        key,
        record.extraFields?.[key] ?? null,
      ]),
    );

    const sourceStatus = normalizedSourceStatus(record.Status) ?? "";
    const normalized: NormalizedTakeChargeRecord = {
      storeId: resolution.store.trtid,
      storeDisplayName: resolution.store.storeNameCn,
      tchId: record.tchId,
      submittedBy: record.submittedBy,
      submittedAt: normalizedSubmittedAt,
      summary: record.summary,
      sourceStatus,
      recordState: classifyTakeChargeRecordState(sourceStatus),
      extraFields,
      sourceReference: record.sourceReference,
    };
    normalizedTakeChargeRecords.push(normalized);
    takeChargeIndex.add(normalized.storeId, submittedMonth, normalized);
  }

  return {
    resolveStoreReference,
    actionIndex,
    normalizedTakeChargeRecords,
    takeChargeFieldDefinitions,
    readTakeChargeAnnualAggregate:
      createMockTakeChargeAnnualAggregateReader(
        takeChargeAnnualAggregateFixtures,
      ),
    kpiSources: prepareKpiSources(kpiRawSources, stores, resolveStoreReference),
    certificateSources: prepareCertificateSources(certificateRecords, stores, resolveStoreReference),
    takeChargeIndex,
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
    options.certificateRecords !== undefined ||
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
      takeChargeRecords,
      rawTakeChargeFieldDefinitions,
      rawTakeChargeAnnualAggregateFixtures,
      { ...mockData, eventRecords: rawEventRecords },
      options.certificateRecords ?? mockData.certificateRecords,
    );

  if (options.dataset !== undefined && !hasOverrides && cachedPrepared === undefined) {
    preparedDatasetCache.set(options.dataset, prepared);
  }

  const {
    resolveStoreReference,
    actionIndex,
    normalizedTakeChargeRecords,
    kpiSources,
    certificateSources,
    takeChargeIndex,
    takeChargeMonthlyAggregates,
    takeChargeFieldDefinitions,
    readTakeChargeAnnualAggregate,
  } = prepared;

  // Coverage is prepared once, then checked independently for each Store.
  const coverageStoreIds = new Set(mockData.coverage.storeIds);
  const coverageMonths = new Set(mockData.coverage.period.includedMonths);
  const coverageStart = parseTimezoneAwareInstant(mockData.coverage.period.startInclusive);
  const coverageEnd = parseTimezoneAwareInstant(mockData.coverage.period.endExclusive);
  const actionAggregateScopes = new Set(mockData.coverage.actionAggregateScopes.map((period) =>
    `${parseTimezoneAwareInstant(period.startInclusive)}\u0000${parseTimezoneAwareInstant(period.endExclusive)}`));
  function coverageForPeriod(context: EhsFilterContext, parsed: ParsedKpiPeriod | null) {
    const periodCovered = parsed !== null && coverageStart !== null && coverageEnd !== null &&
      parsed.startMilliseconds >= coverageStart && parsed.endMilliseconds <= coverageEnd &&
      context.period.includedMonths.every((month) => coverageMonths.has(month));
    return (storeId: StoreId, source: keyof KpiMockCoverage["sourceCoverage"]) =>
      periodCovered && coverageStoreIds.has(storeId) && mockData.coverage.sourceCoverage[source] === "COMPLETE";
  }
  function mergeSources<T>(sources: readonly DomainSource<T>[], unattributedIssues = 0): DataSet<T> {
    const items = sources.flatMap((source) => source.items);
    return sources.some((source) => source.availability === "INCOMPLETE") || unattributedIssues > 0
      ? incompleteDataSet(items) : completeDataSet(items);
  }
  function kpiDomainInputs(context: EhsFilterContext) {
    const requestedStoreList = requestedStores(context, stores);
    const months = context.period.includedMonths;
    const parsed = parseKpiPeriod(context.period);
    const covered = coverageForPeriod(context, parsed);
    const aggregateKey = `${parsed?.startMilliseconds}\u0000${parsed?.endMilliseconds}`;
    const actionIndex = kpiSources.actions.get(aggregateKey) ?? new StorePeriodIndex<KpiActionClosureRateRecord>();
    return requestedStoreList.map((store) => ({
      store, months,
      training: kpiSources.training.read(store.storeId, months, covered(store.storeId, "training")),
      drills: kpiSources.drills.read(store.storeId, months, covered(store.storeId, "drills")),
      inspections: kpiSources.inspections.read(store.storeId, months, covered(store.storeId, "inspections")),
      actionClosureRates: (() => {
        const source = actionIndex.read(store.storeId, ["AGGREGATE" as Month], covered(store.storeId, "actionClosureRates") && actionAggregateScopes.has(aggregateKey));
        const defect = kpiSources.actionIssues.read(store.storeId, months, true);
        return defect.reason ? { ...source, availability: "INCOMPLETE" as const, reason: defect.reason } : source;
      })(),
      events: kpiSources.events.read(store.storeId, months, covered(store.storeId, "events")),
    }));
  }
  async function getKpiDomainResults(context: EhsFilterContext) {
    return kpiDomainInputs(context).map((input) => evaluateKpiDomain(input, overviewRequiredSetProvider));
  }
  async function getKpiData(context: EhsFilterContext): Promise<KpiDataSnapshot> {
    const sources = kpiDomainInputs(context);
    return {
      stores: sources.map((source) => source.store),
      domainResults: sources.map((input) => evaluateKpiDomain(input, overviewRequiredSetProvider)),
      training: mergeSources(sources.map((source) => source.training), kpiSources.training.unattributedIssueCountFor(context.period.includedMonths)),
      drills: mergeSources(sources.map((source) => source.drills), kpiSources.drills.unattributedIssueCountFor(context.period.includedMonths)),
      inspections: mergeSources(sources.map((source) => source.inspections), kpiSources.inspections.unattributedIssueCountFor(context.period.includedMonths)),
      actionClosureRates: mergeSources(sources.map((source) => source.actionClosureRates), (kpiSources.actions.get(`${parseTimezoneAwareInstant(context.period.startInclusive)}\u0000${parseTimezoneAwareInstant(context.period.endExclusive)}`)?.unattributedIssueCountFor(["AGGREGATE" as Month]) ?? 0) + kpiSources.actionIssues.unattributedIssueCountFor(context.period.includedMonths)),
      events: mergeSources(sources.map((source) => source.events), kpiSources.events.unattributedIssueCountFor(context.period.includedMonths)),
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
    const source = kpiSources.training.read(query.storeId, query.context.period.includedMonths,
      coverageForPeriod(query.context, scope.parsedPeriod)(query.storeId, "training"));
    const items: KpiTrainingDetailRecord[] = source.items.map(({ trainingName, month, completionRate, incompletePeople }) =>
      ({ trainingName, month, completionRate, incompletePeople })).sort((a, b) => b.month.localeCompare(a.month) || a.trainingName.localeCompare(b.trainingName));
    return source.reason ? incompleteDataSet(items) : completeDataSet(items);
  }
  async function getKpiDrillDetails(query: KpiDetailQuery) {
    const scope = detailScope(query);
    if (!scope) return { availability: "UNAVAILABLE", items: [] } as const;
    const source = kpiSources.drills.read(query.storeId, query.context.period.includedMonths,
      coverageForPeriod(query.context, scope.parsedPeriod)(query.storeId, "drills"));
    const items: KpiDrillDetailRecord[] = source.items.map(({ drillName, month, status }) =>
      ({ drillName, month, status })).sort((a, b) => b.month.localeCompare(a.month) || a.drillName.localeCompare(b.drillName));
    return source.reason || items.some((item) => item.status === null) ? incompleteDataSet(items) : completeDataSet(items);
  }
  async function getKpiInspectionDetails(query: KpiDetailQuery) {
    const scope = detailScope(query);
    if (!scope) return { availability: "UNAVAILABLE", items: [] } as const;
    const source = kpiSources.inspections.read(query.storeId, query.context.period.includedMonths,
      coverageForPeriod(query.context, scope.parsedPeriod)(query.storeId, "inspections"));
    const items: KpiInspectionDetailRecord[] = source.items.map(({ inspectionNumber, inspectionName, dueDate, inspector, status }) =>
      ({ inspectionNumber, inspectionName, dueDate, inspector, status })).sort((a, b) =>
        (b.dueDate ?? "").localeCompare(a.dueDate ?? "") || a.inspectionName.localeCompare(b.inspectionName));
    return source.reason ? incompleteDataSet(items) : completeDataSet(items);
  }

  async function getKpiAstmDetails(query: KpiDetailQuery) {
    const scope = detailScope(query);
    if (!scope) return { availability: "UNAVAILABLE", items: [] } as const;
    const source = eventDataSet({ ...query.context, store: { kind: "INCLUDE", values: [query.storeId] } }, "ALL");
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
    const parsedPeriod = parseKpiPeriod(context.period);
    if (parsedPeriod === null) return incompleteDataSet();
    const covered = coverageForPeriod(context, parsedPeriod);
    const sources = requestedStores(context, stores).map(({ storeId }) => {
      const source = actionIndex.read(storeId, context.period.includedMonths, covered(storeId, "actions"));
      return { ...source, items: source.items.filter((record) =>
        isInstantInKpiPeriod(record.submittedDate, parsedPeriod) === true &&
        (viewMode === "ALL" || record.recordState === "OPEN")) };
    });
    return mergeSources(sources, actionIndex.unattributedIssueCountFor(context.period.includedMonths));
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

  function eventDataSet(context: EhsFilterContext, viewMode: EventsQuery["viewMode"]): DataSet<NormalizedEventRecord> {
    const parsed = parseKpiPeriod(context.period);
    if (parsed === null) return incompleteDataSet();
    const covered = coverageForPeriod(context, parsed);
    const sources = requestedStores(context, stores).map((store) => {
      const source = kpiSources.events.read(store.storeId, context.period.includedMonths, covered(store.storeId, "events"));
      return { ...source, items: source.items.filter((record) => viewMode === "ALL" || record.recordState === "OPEN") };
    });
    return mergeSources(sources, kpiSources.events.unattributedIssueCountFor(context.period.includedMonths));
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

  const takeChargeMonthlyByKey = new Map(takeChargeMonthlyAggregates.map((row) => [`${row.storeId}\u0000${row.month}`, row]));
  function takeChargePeriodSource(storeIds: readonly StoreId[], context: EhsFilterContext, covered: ReturnType<typeof coverageForPeriod>) {
    const sourceSlices = storeIds.map((storeId) => takeChargeIndex.read(storeId, context.period.includedMonths, covered(storeId, "takeCharge")));
    const reason = mostSpecificReason(sourceSlices.map((source) => source.reason));
    let totalCount = 0, closedCount = 0;
    for (const storeId of storeIds) for (const month of context.period.includedMonths) {
      const aggregate = takeChargeMonthlyByKey.get(`${storeId}\u0000${month}`);
      totalCount += aggregate?.totalCount ?? 0;
      closedCount += aggregate?.closedCount ?? 0;
    }
    const availability: DataAvailability = reason !== "ACHIEVED" ? "INCOMPLETE" : totalCount ? "AVAILABLE" : "CONFIRMED_EMPTY";
    return { totalCount, closedCount, availability, reason: reason === "ACHIEVED" ? undefined : reason };
  }
  function annualGoalResult(storeIds: readonly StoreId[], referenceMonth: Month) {
    return evaluateTakeChargeAnnual(readTakeChargeAnnualAggregate(Number(referenceMonth.slice(0, 4)), storeIds, referenceMonth));
  }
  async function getTakeChargeGoals({ context }: TakeChargeGoalsQuery): Promise<TakeChargeGoalsSummary> {
    const storeIds = requestedStores(context, stores).map((store) => store.storeId);
    const source = takeChargePeriodSource(storeIds, context, coverageForPeriod(context, parseKpiPeriod(context.period)));
    const queryReason = mostSpecificReason([
      source.reason,
      takeChargeIndex.unattributedIssueCountFor(context.period.includedMonths) > 0 ? "SOURCE_INCOMPLETE" : undefined,
    ]);
    const reason = queryReason === "ACHIEVED" ? undefined : queryReason;
    const availability = reason ? "INCOMPLETE" : source.availability;
    const referenceMonth = shanghaiMonthForInstant(referenceDate.toISOString())!;
    return {
      period: { availability, period: context.period,
        submissionTotal: reason ? null : source.totalCount, closedCount: reason ? null : source.closedCount,
        closeRate: evaluateTakeChargePeriod(source.totalCount, source.closedCount, availability, reason) },
      annual: { ...annualGoalResult(storeIds, referenceMonth), currentYear: Number(referenceMonth.slice(0, 4)) },
    };
  }
  async function getStoreGoalDomainResults(context: EhsFilterContext, referenceDay: string) {
    const covered = coverageForPeriod(context, parseKpiPeriod(context.period));
    const referenceMonth = referenceDay.slice(0, 7) as Month;
    return requestedStores(context, stores).map(({ storeId }) => {
      const source = takeChargePeriodSource([storeId], context, covered);
      const annual = annualGoalResult([storeId], referenceMonth);
      return { storeId, closeRate: evaluateTakeChargePeriod(source.totalCount, source.closedCount, source.availability, source.reason),
        submissionsPerCapitaYtd: annual.submissionsPerCapitaYtd, participationRateYtd: annual.participationRateYtd };
    });
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
      takeChargeIndex.unattributedIssueCountFor(context.period.includedMonths) === 0 &&
      selectedStoreIdList.every((storeId) => takeChargeIndex.read(storeId, context.period.includedMonths, true).reason === undefined);
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

  async function getEnvironmentAnalytics({ context, period }: EnvironmentAnalyticsRepositoryQuery): Promise<EnvironmentAnalyticsResult> {
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
    const issues = new Map<string, import("@/data/contracts/domain-result").DomainReason>();
    let complete = true;
    const referenceDay = requestedReferenceDate ?? formatBusinessDate(referenceDate.toISOString());
    for (const issue of certificateSources.issues) {
      if (issue.storeIds.length === 0 || issue.storeIds.some((id) => selectedIds.has(id))) complete = false;
      for (const storeId of issue.storeIds) if (issue.category) issues.set(`${storeId}\u0000${issue.category}`, "SOURCE_INVALID");
    }
    for (const store of selectedStores) for (const record of certificateSources.byStore.get(store.storeId) ?? []) {
      records.push({ ...record, ...evaluateCertificateRecord(record.expiryDate, referenceDay) });
    }
    const items = selectedStores.map((store) => ({
      storeId: store.storeId, storeDisplayName: store.displayName,
      categories: CERTIFICATE_CATEGORIES.map((certificateCategory) => {
        const categoryRecords = records.filter((record) => record.storeId === store.storeId && record.certificateCategory === certificateCategory);
        return { certificateCategory, ...evaluateCertificateCategoryResult(categoryRecords, issues.get(`${store.storeId}\u0000${certificateCategory}`)), records: categoryRecords };
      }),
    }));
    return {
      ...(complete ? completeDataSet(items) : incompleteDataSet(items)),
      unknownTypeRecords: records.filter((record) => record.certificateCategory === null),
    };
  }

  async function getOverviewScoreData({ scope, attentionScope }: OverviewScoreDataQuery): Promise<OverviewScoreData> {
    const referenceDay = formatBusinessDate(referenceDate.toISOString());
    return produceOverviewScoreData(requestedStores(scope, stores), requestedStores(attentionScope ?? scope, stores),
      mockData.supportedMonths, (month) => {
        if (month === mockData.supportedMonths.at(-1)) return referenceDay;
        const [year, number] = month.split("-").map(Number);
        return new Date(Date.UTC(year, number, 0)).toISOString().slice(0, 10);
      }, {
        performance: getKpiDomainResults,
        goals: getStoreGoalDomainResults,
        certificates: async (context, referenceDate) => (await getCertificates({ context, referenceDate })).items,
      });
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
