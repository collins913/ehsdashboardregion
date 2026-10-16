"use server";
import { areaScopeId } from "@/data/contracts/kpi";
import { QueryError, queryFailure, type QueryOutcome } from "@/data/contracts/query-result";

import type { ActionsQuery, ActionsQueryResult } from "@/data/contracts/actions";
import type { EventsQuery, EventsQueryResult } from "@/data/contracts/events";
import type { EventAnalyticsQuery, EventAnalyticsResult } from "@/data/contracts/event-analytics";
import type { ActionAnalyticsQuery, ActionAnalyticsResult } from "@/data/contracts/action-analytics";
import type { EhsFilterContext, EhsStoreScope } from "@/data/contracts/kpi";
import { periodForMode, shanghaiYearMonth } from "@/data/contracts/kpi-period";
import type { Month } from "@/types/ehs";
import type { OverviewQuery, OverviewResult } from "@/data/contracts/overview";
import type {
  KpiDetailQuery,
  KpiDetailRecords,
  KpiTrainingDetailRecord,
  KpiDrillDetailRecord,
  KpiInspectionDetailRecord,
  KpiAstmDetailRecord,
} from "@/data/contracts/kpi-details";
import type { StoresQueryResult } from "@/data/contracts/stores";
import type { EnvironmentAnalyticsQuery, EnvironmentAnalyticsRepositoryQuery, EnvironmentAnalyticsResult, EnvironmentQueryResult } from "@/data/contracts/environment";
import type { CertificatesPageQueryResult } from "@/data/contracts/certificates";
import type {
  TakeChargeGoalsSummary,
  TakeChargeRecordsQuery,
  TakeChargeRecordsResult,
} from "@/data/contracts/take-charge";
import { createEhsRepository } from "@/data/repositories/create-ehs-repository.server";
import { buildKpiPageResult } from "@/features/kpi/build-kpi-rows";
import { prepareOverviewResult } from "@/features/overview/prepare-overview-result";
import { buildCertificateOverview } from "@/lib/rules/certificate-requirements";
import { authorizeBusinessScope, getAuthorizedFilterStores } from "@/lib/access/access-service.server";
import type { KpiPageResult } from "@/features/kpi/types";
import {
  parseActionAnalyticsQuery,
  parseActionsQuery,
  parseEhsFilterContext,
  parseEhsStoreScope,
  parseEnvironmentAnalyticsQuery,
  parseEventAnalyticsQuery,
  parseEventsQuery,
  parseKpiDetailQuery,
  parseQueryEnvelope,
  parseTakeChargeGoalsQuery,
  parseTakeChargeRecordsQuery,
} from "@/data/server/query-input-validation";
import { resolveBusinessReferenceDate, resolveDataSourceMode } from "@/data/server/data-source-mode.server";

function runtimeFor(referenceDateIso: string) {
  const referenceDate = resolveBusinessReferenceDate(referenceDateIso);
  return { referenceDate, repository: createEhsRepository(referenceDate) };
}

async function queryKpiRowsCore(input: { referenceDateIso: string; query: EhsFilterContext }): Promise<KpiPageResult> {
  const { referenceDateIso, query: context } = parseQueryEnvelope(input, parseEhsFilterContext);
  const authorized = { ...context, ...await authorizeBusinessScope(context) };
  const snapshot = await runtimeFor(referenceDateIso).repository.getKpiData(authorized);
  return buildKpiPageResult(authorized, snapshot);
}

function parseOverviewQuery(input: unknown): OverviewQuery | null {
  if (input === null || typeof input !== "object" || Array.isArray(input)) return null;
  const value = input as Record<string, unknown>;
  if (Object.keys(value).length !== 1 || !("context" in value)) return null;
  const context = parseEhsStoreScope(value.context);
  return context ? { context } : null;
}

async function queryOverviewCore(input: { referenceDateIso: string; query: OverviewQuery }): Promise<OverviewResult> {
  const { referenceDateIso, query } = parseQueryEnvelope(input, parseOverviewQuery);
  const authorizedScope = await authorizeBusinessScope(query.context);
  const context = { ...query.context, ...authorizedScope };
  let attentionScope = authorizedScope;
  if (query.context.store.kind === "INCLUDE" && query.context.store.values.length === 1) {
    const requestedStoreId = query.context.store.values[0];
    const authorizedStores = await getAuthorizedFilterStores();
    const selectedStore = authorizedStores.find((store) => store.storeId === requestedStoreId);
    if (selectedStore) {
      attentionScope = await authorizeBusinessScope({
        region: { kind: "INCLUDE", values: [selectedStore.region] },
        area: { kind: "INCLUDE", values: [areaScopeId(selectedStore.region, selectedStore.area)] },
        store: { kind: "ALL" },
      });
    }
  }
  const { referenceDate, repository } = runtimeFor(referenceDateIso);
  const data = await repository.getOverviewScoreData({ scope: authorizedScope, attentionScope });
  const { year, month } = shanghaiYearMonth(referenceDate);
  return prepareOverviewResult({
    referenceMonth: `${year}-${String(month).padStart(2, "0")}` as Month,
    stores: data.attentionStores,
    selectedStores: data.stores,
    attentionStores: data.attentionStores,
    contributions: data.contributions,
    context,
    requestedScope: query.context,
    availableMonths: data.months,
    sourceAvailability: data.availability,
  });
}

async function authorizeKpiDetailQuery(
  query: KpiDetailQuery,
): Promise<KpiDetailQuery> {
  const scope = await authorizeBusinessScope(query.context);
  if (scope.store.kind !== "INCLUDE" || !scope.store.values.includes(query.storeId)) {
    throw new QueryError("ACCESS_DENIED");
  }
  return { ...query, context: { ...query.context, ...scope } };
}

async function queryKpiTrainingDetailsCore(input: { referenceDateIso: string; query: KpiDetailQuery }): Promise<KpiDetailRecords<KpiTrainingDetailRecord>> {
  const { referenceDateIso, query } = parseQueryEnvelope(input, parseKpiDetailQuery);
  const authorized = await authorizeKpiDetailQuery(query);
  return runtimeFor(referenceDateIso).repository.getKpiTrainingDetails(authorized);
}

async function queryKpiDrillDetailsCore(input: { referenceDateIso: string; query: KpiDetailQuery }): Promise<KpiDetailRecords<KpiDrillDetailRecord>> {
  const { referenceDateIso, query } = parseQueryEnvelope(input, parseKpiDetailQuery);
  const authorized = await authorizeKpiDetailQuery(query);
  return runtimeFor(referenceDateIso).repository.getKpiDrillDetails(authorized);
}

async function queryKpiInspectionDetailsCore(input: { referenceDateIso: string; query: KpiDetailQuery }): Promise<KpiDetailRecords<KpiInspectionDetailRecord>> {
  const { referenceDateIso, query } = parseQueryEnvelope(input, parseKpiDetailQuery);
  const authorized = await authorizeKpiDetailQuery(query);
  return runtimeFor(referenceDateIso).repository.getKpiInspectionDetails(authorized);
}

async function queryKpiAstmDetailsCore(input: { referenceDateIso: string; query: KpiDetailQuery }): Promise<KpiDetailRecords<KpiAstmDetailRecord>> {
  const { referenceDateIso, query } = parseQueryEnvelope(input, parseKpiDetailQuery);
  const authorized = await authorizeKpiDetailQuery(query);
  return runtimeFor(referenceDateIso).repository.getKpiAstmDetails(authorized);
}

async function queryActionsCore(input: { referenceDateIso: string; query: ActionsQuery }): Promise<ActionsQueryResult> {
  const { referenceDateIso, query } = parseQueryEnvelope(input, parseActionsQuery);
  const authorizedQuery = { ...query, context: { ...query.context, ...await authorizeBusinessScope(query.context) } };
  return runtimeFor(referenceDateIso).repository.getActions(authorizedQuery);
}

async function queryActionsAnalyticsCore(input: { referenceDateIso: string; query: ActionAnalyticsQuery }): Promise<ActionAnalyticsResult> {
  const { referenceDateIso, query } = parseQueryEnvelope(input, parseActionAnalyticsQuery);
  const authorizedQuery = {
    ...query,
    context: { ...query.context, ...await authorizeBusinessScope(query.context) },
  };
  return runtimeFor(referenceDateIso).repository.getActionsAnalytics(authorizedQuery);
}

async function queryEventsCore(input: { referenceDateIso: string; query: EventsQuery }): Promise<EventsQueryResult> {
  const { referenceDateIso, query } = parseQueryEnvelope(input, parseEventsQuery);
  const authorizedQuery = { ...query, context: { ...query.context, ...await authorizeBusinessScope(query.context) } };
  return runtimeFor(referenceDateIso).repository.getEvents(authorizedQuery);
}

async function queryEventsAnalyticsCore(input: { referenceDateIso: string; query: EventAnalyticsQuery }): Promise<EventAnalyticsResult> {
  const { referenceDateIso, query } = parseQueryEnvelope(input, parseEventAnalyticsQuery);
  const authorizedQuery = {
    ...query,
    context: { ...query.context, ...await authorizeBusinessScope(query.context) },
  };
  return runtimeFor(referenceDateIso).repository.getEventsAnalytics(authorizedQuery);
}

async function queryTakeChargeGoalsCore(input: { referenceDateIso: string; query: EhsFilterContext }): Promise<TakeChargeGoalsSummary> {
  const { referenceDateIso, query: context } = parseQueryEnvelope(input, parseTakeChargeGoalsQuery);
  const authorizedContext = { ...context, ...await authorizeBusinessScope(context) };
  return runtimeFor(referenceDateIso).repository.getTakeChargeGoals({ context: authorizedContext });
}

async function queryTakeChargeRecordsCore(input: { referenceDateIso: string; query: TakeChargeRecordsQuery }): Promise<TakeChargeRecordsResult> {
  const { referenceDateIso, query } = parseQueryEnvelope(input, parseTakeChargeRecordsQuery);
  const authorizedQuery = { ...query, context: { ...query.context, ...await authorizeBusinessScope(query.context) } };
  return runtimeFor(referenceDateIso).repository.getTakeChargeRecords(authorizedQuery);
}

async function queryStoresCore(input: { referenceDateIso: string; query: EhsStoreScope }): Promise<StoresQueryResult> {
  const { referenceDateIso, query: context } = parseQueryEnvelope(input, parseEhsStoreScope);
  const authorizedContext = await authorizeBusinessScope(context);
  return runtimeFor(referenceDateIso).repository.getStores({ context: authorizedContext });
}

async function queryEnvironmentCore(input: { referenceDateIso: string; query: EhsStoreScope }): Promise<EnvironmentQueryResult> {
  const { referenceDateIso, query: context } = parseQueryEnvelope(input, parseEhsStoreScope);
  const authorizedContext = await authorizeBusinessScope(context);
  return runtimeFor(referenceDateIso).repository.getEnvironment({ context: authorizedContext });
}

async function queryEnvironmentAnalyticsCore(input: { referenceDateIso: string; query: EnvironmentAnalyticsQuery }): Promise<EnvironmentAnalyticsResult> {
  const { referenceDateIso, query } = parseQueryEnvelope(input, parseEnvironmentAnalyticsQuery);
  const authorizedQuery = {
    ...query,
    context: await authorizeBusinessScope(query.context),
  };
  const { referenceDate, repository } = runtimeFor(referenceDateIso);
  const repositoryQuery: EnvironmentAnalyticsRepositoryQuery = {
    ...authorizedQuery,
    period: periodForMode("THIS_MONTH", referenceDate),
  };
  return repository.getEnvironmentAnalytics(repositoryQuery);
}

async function queryCertificatesCore(input: { referenceDateIso: string; query: EhsStoreScope }): Promise<CertificatesPageQueryResult> {
  const { referenceDateIso, query: context } = parseQueryEnvelope(input, parseEhsStoreScope);
  const authorizedContext = await authorizeBusinessScope(context);
  const certificates = await runtimeFor(referenceDateIso).repository.getCertificates({ context: authorizedContext });
  return { ...certificates, overview: buildCertificateOverview(certificates) };
}

async function withQueryOutcome<T>(action: () => Promise<T>): Promise<QueryOutcome<T>> {
  try { return await action(); }
  catch (error) { return queryFailure(error); }
}

export async function queryKpiRows(input: { referenceDateIso: string; query: EhsFilterContext }): Promise<QueryOutcome<KpiPageResult>> { return withQueryOutcome(() => queryKpiRowsCore(input)); }
export async function queryOverview(input: { referenceDateIso: string; query: OverviewQuery }): Promise<QueryOutcome<OverviewResult>> { return withQueryOutcome(() => queryOverviewCore(input)); }
export async function queryKpiTrainingDetails(input: { referenceDateIso: string; query: KpiDetailQuery }): Promise<QueryOutcome<KpiDetailRecords<KpiTrainingDetailRecord>>> { return withQueryOutcome(() => queryKpiTrainingDetailsCore(input)); }
export async function queryKpiDrillDetails(input: { referenceDateIso: string; query: KpiDetailQuery }): Promise<QueryOutcome<KpiDetailRecords<KpiDrillDetailRecord>>> { return withQueryOutcome(() => queryKpiDrillDetailsCore(input)); }
export async function queryKpiInspectionDetails(input: { referenceDateIso: string; query: KpiDetailQuery }): Promise<QueryOutcome<KpiDetailRecords<KpiInspectionDetailRecord>>> { return withQueryOutcome(() => queryKpiInspectionDetailsCore(input)); }
export async function queryKpiAstmDetails(input: { referenceDateIso: string; query: KpiDetailQuery }): Promise<QueryOutcome<KpiDetailRecords<KpiAstmDetailRecord>>> { return withQueryOutcome(() => queryKpiAstmDetailsCore(input)); }
export async function queryActions(input: { referenceDateIso: string; query: ActionsQuery }): Promise<QueryOutcome<ActionsQueryResult>> { return withQueryOutcome(() => queryActionsCore(input)); }
export async function queryActionsAnalytics(input: { referenceDateIso: string; query: ActionAnalyticsQuery }): Promise<QueryOutcome<ActionAnalyticsResult>> { return withQueryOutcome(() => queryActionsAnalyticsCore(input)); }
export async function queryEvents(input: { referenceDateIso: string; query: EventsQuery }): Promise<QueryOutcome<EventsQueryResult>> { return withQueryOutcome(() => queryEventsCore(input)); }
export async function queryEventsAnalytics(input: { referenceDateIso: string; query: EventAnalyticsQuery }): Promise<QueryOutcome<EventAnalyticsResult>> { return withQueryOutcome(() => queryEventsAnalyticsCore(input)); }
export async function queryTakeChargeGoals(input: { referenceDateIso: string; query: EhsFilterContext }): Promise<QueryOutcome<TakeChargeGoalsSummary>> { return withQueryOutcome(() => queryTakeChargeGoalsCore(input)); }
export async function queryTakeChargeRecords(input: { referenceDateIso: string; query: TakeChargeRecordsQuery }): Promise<QueryOutcome<TakeChargeRecordsResult>> { return withQueryOutcome(() => queryTakeChargeRecordsCore(input)); }
export async function queryStores(input: { referenceDateIso: string; query: EhsStoreScope }): Promise<QueryOutcome<StoresQueryResult>> { return withQueryOutcome(() => queryStoresCore(input)); }
export async function queryEnvironment(input: { referenceDateIso: string; query: EhsStoreScope }): Promise<QueryOutcome<EnvironmentQueryResult>> { return withQueryOutcome(() => queryEnvironmentCore(input)); }
export async function queryEnvironmentAnalytics(input: { referenceDateIso: string; query: EnvironmentAnalyticsQuery }): Promise<QueryOutcome<EnvironmentAnalyticsResult>> { return withQueryOutcome(() => queryEnvironmentAnalyticsCore(input)); }
export async function queryCertificates(input: { referenceDateIso: string; query: EhsStoreScope }): Promise<QueryOutcome<CertificatesPageQueryResult>> { return withQueryOutcome(() => queryCertificatesCore(input)); }
