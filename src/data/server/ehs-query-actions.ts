"use server";

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
import { buildKpiRows } from "@/features/kpi/build-kpi-rows";
import { prepareOverviewResult } from "@/features/overview/prepare-overview-result";
import { buildCertificateOverview } from "@/lib/rules/certificate-requirements";
import { authorizeBusinessScope, getAuthorizedFilterStores } from "@/lib/access/access-service.server";
import type { KpiRow } from "@/features/kpi/types";
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

function repositoryFor(referenceDateIso: string) {
  return createEhsRepository(new Date(referenceDateIso));
}

export async function queryKpiRows(input: { referenceDateIso: string; query: EhsFilterContext }): Promise<readonly KpiRow[]> {
  const { referenceDateIso, query: context } = parseQueryEnvelope(input, parseEhsFilterContext);
  const authorized = { ...context, ...await authorizeBusinessScope(context) };
  const snapshot = await repositoryFor(referenceDateIso).getKpiData(authorized);
  return buildKpiRows(authorized, snapshot);
}

function parseOverviewQuery(input: unknown): OverviewQuery | null {
  if (input === null || typeof input !== "object" || Array.isArray(input)) return null;
  const value = input as Record<string, unknown>;
  if (Object.keys(value).length !== 1 || !("context" in value)) return null;
  const context = parseEhsStoreScope(value.context);
  return context ? { context } : null;
}

export async function queryOverview(input: { referenceDateIso: string; query: OverviewQuery }): Promise<OverviewResult> {
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
        area: { kind: "INCLUDE", values: [selectedStore.area] },
        store: { kind: "ALL" },
      });
    }
  }
  const data = await repositoryFor(referenceDateIso).getOverviewScoreData({ scope: authorizedScope, attentionScope });
  const { year, month } = shanghaiYearMonth(new Date(referenceDateIso));
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
  return {
    ...query,
    context: {
      ...query.context,
      ...await authorizeBusinessScope(query.context),
    },
  };
}

export async function queryKpiTrainingDetails(input: { referenceDateIso: string; query: KpiDetailQuery }): Promise<KpiDetailRecords<KpiTrainingDetailRecord>> {
  const { referenceDateIso, query } = parseQueryEnvelope(input, parseKpiDetailQuery);
  const authorized = await authorizeKpiDetailQuery(query);
  return repositoryFor(referenceDateIso).getKpiTrainingDetails(authorized);
}

export async function queryKpiDrillDetails(input: { referenceDateIso: string; query: KpiDetailQuery }): Promise<KpiDetailRecords<KpiDrillDetailRecord>> {
  const { referenceDateIso, query } = parseQueryEnvelope(input, parseKpiDetailQuery);
  const authorized = await authorizeKpiDetailQuery(query);
  return repositoryFor(referenceDateIso).getKpiDrillDetails(authorized);
}

export async function queryKpiInspectionDetails(input: { referenceDateIso: string; query: KpiDetailQuery }): Promise<KpiDetailRecords<KpiInspectionDetailRecord>> {
  const { referenceDateIso, query } = parseQueryEnvelope(input, parseKpiDetailQuery);
  const authorized = await authorizeKpiDetailQuery(query);
  return repositoryFor(referenceDateIso).getKpiInspectionDetails(authorized);
}

export async function queryKpiAstmDetails(input: { referenceDateIso: string; query: KpiDetailQuery }): Promise<KpiDetailRecords<KpiAstmDetailRecord>> {
  const { referenceDateIso, query } = parseQueryEnvelope(input, parseKpiDetailQuery);
  const authorized = await authorizeKpiDetailQuery(query);
  return repositoryFor(referenceDateIso).getKpiAstmDetails(authorized);
}

export async function queryActions(input: { referenceDateIso: string; query: ActionsQuery }): Promise<ActionsQueryResult> {
  const { referenceDateIso, query } = parseQueryEnvelope(input, parseActionsQuery);
  const authorizedQuery = { ...query, context: { ...query.context, ...await authorizeBusinessScope(query.context) } };
  return repositoryFor(referenceDateIso).getActions(authorizedQuery);
}

export async function queryActionsAnalytics(input: { referenceDateIso: string; query: ActionAnalyticsQuery }): Promise<ActionAnalyticsResult> {
  const { referenceDateIso, query } = parseQueryEnvelope(input, parseActionAnalyticsQuery);
  const authorizedQuery = {
    ...query,
    context: { ...query.context, ...await authorizeBusinessScope(query.context) },
  };
  return repositoryFor(referenceDateIso).getActionsAnalytics(authorizedQuery);
}

export async function queryEvents(input: { referenceDateIso: string; query: EventsQuery }): Promise<EventsQueryResult> {
  const { referenceDateIso, query } = parseQueryEnvelope(input, parseEventsQuery);
  const authorizedQuery = { ...query, context: { ...query.context, ...await authorizeBusinessScope(query.context) } };
  return repositoryFor(referenceDateIso).getEvents(authorizedQuery);
}

export async function queryEventsAnalytics(input: { referenceDateIso: string; query: EventAnalyticsQuery }): Promise<EventAnalyticsResult> {
  const { referenceDateIso, query } = parseQueryEnvelope(input, parseEventAnalyticsQuery);
  const authorizedQuery = {
    ...query,
    context: { ...query.context, ...await authorizeBusinessScope(query.context) },
  };
  return repositoryFor(referenceDateIso).getEventsAnalytics(authorizedQuery);
}

export async function queryTakeChargeGoals(input: { referenceDateIso: string; query: EhsFilterContext }): Promise<TakeChargeGoalsSummary> {
  const { referenceDateIso, query: context } = parseQueryEnvelope(input, parseTakeChargeGoalsQuery);
  const authorizedContext = { ...context, ...await authorizeBusinessScope(context) };
  return repositoryFor(referenceDateIso).getTakeChargeGoals({ context: authorizedContext });
}

export async function queryTakeChargeRecords(input: { referenceDateIso: string; query: TakeChargeRecordsQuery }): Promise<TakeChargeRecordsResult> {
  const { referenceDateIso, query } = parseQueryEnvelope(input, parseTakeChargeRecordsQuery);
  const authorizedQuery = { ...query, context: { ...query.context, ...await authorizeBusinessScope(query.context) } };
  return repositoryFor(referenceDateIso).getTakeChargeRecords(authorizedQuery);
}

export async function queryStores(input: { referenceDateIso: string; query: EhsStoreScope }): Promise<StoresQueryResult> {
  const { referenceDateIso, query: context } = parseQueryEnvelope(input, parseEhsStoreScope);
  const authorizedContext = await authorizeBusinessScope(context);
  return repositoryFor(referenceDateIso).getStores({ context: authorizedContext });
}

export async function queryEnvironment(input: { referenceDateIso: string; query: EhsStoreScope }): Promise<EnvironmentQueryResult> {
  const { referenceDateIso, query: context } = parseQueryEnvelope(input, parseEhsStoreScope);
  const authorizedContext = await authorizeBusinessScope(context);
  return repositoryFor(referenceDateIso).getEnvironment({ context: authorizedContext });
}

export async function queryEnvironmentAnalytics(input: { referenceDateIso: string; query: EnvironmentAnalyticsQuery }): Promise<EnvironmentAnalyticsResult> {
  const { referenceDateIso, query } = parseQueryEnvelope(input, parseEnvironmentAnalyticsQuery);
  const authorizedQuery = {
    ...query,
    context: await authorizeBusinessScope(query.context),
  };
  const repositoryQuery: EnvironmentAnalyticsRepositoryQuery = {
    ...authorizedQuery,
    period: periodForMode("THIS_MONTH", new Date(referenceDateIso)),
  };
  return repositoryFor(referenceDateIso).getEnvironmentAnalytics(repositoryQuery);
}

export async function queryCertificates(input: { referenceDateIso: string; query: EhsStoreScope }): Promise<CertificatesPageQueryResult> {
  const { referenceDateIso, query: context } = parseQueryEnvelope(input, parseEhsStoreScope);
  const authorizedContext = await authorizeBusinessScope(context);
  const certificates = await repositoryFor(referenceDateIso).getCertificates({ context: authorizedContext });
  return { ...certificates, overview: buildCertificateOverview(certificates) };
}
