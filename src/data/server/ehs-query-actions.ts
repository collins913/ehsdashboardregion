"use server";
import { areaScopeId } from "@/data/contracts/kpi";
import { QueryError, queryErrorCode, queryFailure, type QueryOutcome } from "@/data/contracts/query-result";

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
import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";
import { recordOperationalEvent } from "@/data/server/monitoring/monitoring-service.server";
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

function stableString(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableString).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${key}:${stableString(item)}`).join(",")}}`;
  return JSON.stringify(value) ?? "null";
}

function summarizeAvailability(value: unknown) {
  const counts = { INCOMPLETE: 0, UNAVAILABLE: 0 };
  const visit = (current: unknown, depth: number) => {
    if (depth > 3 || !current || typeof current !== "object") return;
    if (Array.isArray(current)) { for (const item of current.slice(0, 500)) visit(item, depth + 1); return; }
    const record = current as Record<string, unknown>;
    if (record.availability === "INCOMPLETE" || record.availability === "UNAVAILABLE") counts[record.availability] += 1;
    for (const [key, item] of Object.entries(record)) {
      if (key === "availability" || key === "reason") continue;
      if (Array.isArray(item) || (item && typeof item === "object")) visit(item, depth + 1);
    }
  };
  visit(value, 0);
  return counts;
}

async function withOperationalCapture<T>(component: string, action: () => Promise<T>, scope?: unknown): Promise<QueryOutcome<T>> {
  const scopeId = scope === undefined ? null : createHash("sha256").update(stableString(scope)).digest("hex").slice(0, 20);
  try {
    const result = await action();
    const counts = summarizeAvailability(result);
    if (counts.UNAVAILABLE || counts.INCOMPLETE) {
      const unavailable = counts.UNAVAILABLE > 0;
      const mock = resolveDataSourceMode() === "mock";
      await recordOperationalEvent({
        environment: process.env.NODE_ENV ?? "unknown", source: mock ? "Mock Repository" : "Production Repository", component,
        severity: unavailable ? "ERROR" : "WARNING", errorCode: unavailable ? "REQUIRED_DATA_UNAVAILABLE" : "SOURCE_DATA_INCOMPLETE",
        safeMessage: unavailable ? "请求范围内存在不可用的数据源。" : mock ? "模拟数据查询结果包含不完整项。" : "请求范围内存在不完整的数据项。",
        phenomenon: `数据结果包含 ${counts.UNAVAILABLE} 个不可用项、${counts.INCOMPLETE} 个不完整项。`,
        causeStatus: "UNKNOWN", knownCause: null,
        impact: { kind: "DOMAIN", id: scopeId, summary: `影响范围：${component} 当前查询范围。` },
        actionTaken: "保留领域诊断与 DataAvailability 原始语义，没有将其转换为业务结果。",
        nextStep: mock ? "检查模拟数据中的缺失、无效值及覆盖范围；此记录不代表生产数据故障。" : "检查来源覆盖、门店映射和企业数据 Adapter。", correlationId: randomUUID(),
        relatedBatchId: null, relatedJobId: null, relatedDomain: null,
        diagnostics: [
          ...(counts.UNAVAILABLE ? [{ code: "REQUIRED_DATA_UNAVAILABLE", severity: "ERROR" as const, message: `查询结果包含 ${counts.UNAVAILABLE} 个不可用项。` }] : []),
          ...(counts.INCOMPLETE ? [{ code: "SOURCE_DATA_INCOMPLETE", severity: "WARNING" as const, message: `查询结果包含 ${counts.INCOMPLETE} 个不完整项。` }] : []),
        ],
      });
    }
    return result;
  }
  catch (error) {
    const code = queryErrorCode(error);
    const expected = code !== "SERVICE_UNAVAILABLE";
    await recordOperationalEvent({
      environment: process.env.NODE_ENV ?? "unknown", source: "Server Action", component,
      severity: expected ? "INFO" : "ERROR",
      errorCode: expected ? code : "SERVER_ACTION_FAILED",
      safeMessage: expected ? "请求未通过身份、权限或参数校验。" : "服务器处理数据请求时发生异常。",
      phenomenon: expected ? "请求在服务端边界被拒绝。" : "Server Action 未能完成请求。",
      causeStatus: expected ? "KNOWN" : "UNKNOWN", knownCause: expected ? "服务端身份、权限或输入校验未通过。" : null,
      impact: { kind: "DOMAIN", id: scopeId ?? component, summary: `影响范围：${component} 数据请求。` },
      actionTaken: "未向客户端返回原始异常堆栈或内部消息。", nextStep: expected ? "检查当前登录身份与请求参数。" : "管理员请在系统监控中查看关联诊断。",
      correlationId: randomUUID(), relatedBatchId: null, relatedJobId: null, relatedDomain: null, diagnostics: [],
    });
    return queryFailure(error);
  }
}

function monitoringScope(input: unknown): unknown {
  return input !== null && typeof input === "object" && "query" in input ? input.query : input;
}

export async function queryKpiRows(input: { referenceDateIso: string; query: EhsFilterContext }): Promise<QueryOutcome<KpiPageResult>> { return withOperationalCapture("KPI 查询", () => queryKpiRowsCore(input), monitoringScope(input)); }
export async function queryOverview(input: { referenceDateIso: string; query: OverviewQuery }): Promise<QueryOutcome<OverviewResult>> { return withOperationalCapture("Overview 查询", () => queryOverviewCore(input), monitoringScope(input)); }
export async function queryKpiTrainingDetails(input: { referenceDateIso: string; query: KpiDetailQuery }): Promise<QueryOutcome<KpiDetailRecords<KpiTrainingDetailRecord>>> { return withOperationalCapture("Training 明细查询", () => queryKpiTrainingDetailsCore(input), monitoringScope(input)); }
export async function queryKpiDrillDetails(input: { referenceDateIso: string; query: KpiDetailQuery }): Promise<QueryOutcome<KpiDetailRecords<KpiDrillDetailRecord>>> { return withOperationalCapture("Drill 明细查询", () => queryKpiDrillDetailsCore(input), monitoringScope(input)); }
export async function queryKpiInspectionDetails(input: { referenceDateIso: string; query: KpiDetailQuery }): Promise<QueryOutcome<KpiDetailRecords<KpiInspectionDetailRecord>>> { return withOperationalCapture("Inspection 明细查询", () => queryKpiInspectionDetailsCore(input), monitoringScope(input)); }
export async function queryKpiAstmDetails(input: { referenceDateIso: string; query: KpiDetailQuery }): Promise<QueryOutcome<KpiDetailRecords<KpiAstmDetailRecord>>> { return withOperationalCapture("ASTM 明细查询", () => queryKpiAstmDetailsCore(input), monitoringScope(input)); }
export async function queryActions(input: { referenceDateIso: string; query: ActionsQuery }): Promise<QueryOutcome<ActionsQueryResult>> { return withOperationalCapture("Actions 查询", () => queryActionsCore(input), monitoringScope(input)); }
export async function queryActionsAnalytics(input: { referenceDateIso: string; query: ActionAnalyticsQuery }): Promise<QueryOutcome<ActionAnalyticsResult>> { return withOperationalCapture("Actions Analytics 查询", () => queryActionsAnalyticsCore(input), monitoringScope(input)); }
export async function queryEvents(input: { referenceDateIso: string; query: EventsQuery }): Promise<QueryOutcome<EventsQueryResult>> { return withOperationalCapture("Events 查询", () => queryEventsCore(input), monitoringScope(input)); }
export async function queryEventsAnalytics(input: { referenceDateIso: string; query: EventAnalyticsQuery }): Promise<QueryOutcome<EventAnalyticsResult>> { return withOperationalCapture("Events Analytics 查询", () => queryEventsAnalyticsCore(input), monitoringScope(input)); }
export async function queryTakeChargeGoals(input: { referenceDateIso: string; query: EhsFilterContext }): Promise<QueryOutcome<TakeChargeGoalsSummary>> { return withOperationalCapture("Take Charge Goals 查询", () => queryTakeChargeGoalsCore(input), monitoringScope(input)); }
export async function queryTakeChargeRecords(input: { referenceDateIso: string; query: TakeChargeRecordsQuery }): Promise<QueryOutcome<TakeChargeRecordsResult>> { return withOperationalCapture("Take Charge 记录查询", () => queryTakeChargeRecordsCore(input), monitoringScope(input)); }
export async function queryStores(input: { referenceDateIso: string; query: EhsStoreScope }): Promise<QueryOutcome<StoresQueryResult>> { return withOperationalCapture("Stores 查询", () => queryStoresCore(input), monitoringScope(input)); }
export async function queryEnvironment(input: { referenceDateIso: string; query: EhsStoreScope }): Promise<QueryOutcome<EnvironmentQueryResult>> { return withOperationalCapture("Environment 查询", () => queryEnvironmentCore(input), monitoringScope(input)); }
export async function queryEnvironmentAnalytics(input: { referenceDateIso: string; query: EnvironmentAnalyticsQuery }): Promise<QueryOutcome<EnvironmentAnalyticsResult>> { return withOperationalCapture("Environment Analytics 查询", () => queryEnvironmentAnalyticsCore(input), monitoringScope(input)); }
export async function queryCertificates(input: { referenceDateIso: string; query: EhsStoreScope }): Promise<QueryOutcome<CertificatesPageQueryResult>> { return withOperationalCapture("Certificates 查询", () => queryCertificatesCore(input), monitoringScope(input)); }
