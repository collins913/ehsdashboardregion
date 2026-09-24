"use server";

import type { ActionsQuery, ActionsQueryResult } from "@/data/contracts/actions";
import type { EventsQuery, EventsQueryResult } from "@/data/contracts/events";
import type { EhsFilterContext, EhsStoreScope } from "@/data/contracts/kpi";
import type {
  KpiDetailQuery,
  KpiDetailRecords,
  KpiTrainingDetailRecord,
  KpiDrillDetailRecord,
  KpiInspectionDetailRecord,
  KpiAstmDetailRecord,
} from "@/data/contracts/kpi-details";
import type { StoresQueryResult } from "@/data/contracts/stores";
import type { EnvironmentQueryResult } from "@/data/contracts/environment";
import type { CertificatesQueryResult } from "@/data/contracts/certificates";
import type {
  TakeChargeGoalsSummary,
  TakeChargeRecordsQuery,
  TakeChargeRecordsResult,
} from "@/data/contracts/take-charge";
import { createEhsRepository } from "@/data/repositories/create-ehs-repository.server";
import { buildKpiRows } from "@/features/kpi/build-kpi-rows";
import { authorizeBusinessScope } from "@/lib/access/access-service.server";
import type { KpiRow } from "@/features/kpi/types";

type QueryEnvelope<T> = {
  referenceDateIso: string;
  query: T;
};

function repositoryFor(referenceDateIso: string) {
  return createEhsRepository(new Date(referenceDateIso));
}

export async function queryKpiRows({
  referenceDateIso,
  query: context,
}: QueryEnvelope<EhsFilterContext>): Promise<readonly KpiRow[]> {
  const authorized = { ...context, ...await authorizeBusinessScope(context) };
  const snapshot = await repositoryFor(referenceDateIso).getKpiData(authorized);
  return buildKpiRows(authorized, snapshot);
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

export async function queryKpiTrainingDetails({
  referenceDateIso,
  query,
}: QueryEnvelope<KpiDetailQuery>): Promise<KpiDetailRecords<KpiTrainingDetailRecord>> {
  const authorized = await authorizeKpiDetailQuery(query);
  return repositoryFor(referenceDateIso).getKpiTrainingDetails(authorized);
}

export async function queryKpiDrillDetails({
  referenceDateIso,
  query,
}: QueryEnvelope<KpiDetailQuery>): Promise<KpiDetailRecords<KpiDrillDetailRecord>> {
  const authorized = await authorizeKpiDetailQuery(query);
  return repositoryFor(referenceDateIso).getKpiDrillDetails(authorized);
}

export async function queryKpiInspectionDetails({
  referenceDateIso,
  query,
}: QueryEnvelope<KpiDetailQuery>): Promise<KpiDetailRecords<KpiInspectionDetailRecord>> {
  const authorized = await authorizeKpiDetailQuery(query);
  return repositoryFor(referenceDateIso).getKpiInspectionDetails(authorized);
}

export async function queryKpiAstmDetails({
  referenceDateIso,
  query,
}: QueryEnvelope<KpiDetailQuery>): Promise<KpiDetailRecords<KpiAstmDetailRecord>> {
  const authorized = await authorizeKpiDetailQuery(query);
  return repositoryFor(referenceDateIso).getKpiAstmDetails(authorized);
}

export async function queryActions({
  referenceDateIso,
  query,
}: QueryEnvelope<ActionsQuery>): Promise<ActionsQueryResult> {
  return repositoryFor(referenceDateIso).getActions({ ...query, context: { ...query.context, ...await authorizeBusinessScope(query.context) } });
}

export async function queryEvents({
  referenceDateIso,
  query,
}: QueryEnvelope<EventsQuery>): Promise<EventsQueryResult> {
  return repositoryFor(referenceDateIso).getEvents({ ...query, context: { ...query.context, ...await authorizeBusinessScope(query.context) } });
}

export async function queryTakeChargeGoals({
  referenceDateIso,
  query: context,
}: QueryEnvelope<EhsFilterContext>): Promise<TakeChargeGoalsSummary> {
  return repositoryFor(referenceDateIso).getTakeChargeGoals({ context: { ...context, ...await authorizeBusinessScope(context) } });
}

export async function queryTakeChargeRecords({
  referenceDateIso,
  query,
}: QueryEnvelope<TakeChargeRecordsQuery>): Promise<TakeChargeRecordsResult> {
  return repositoryFor(referenceDateIso).getTakeChargeRecords({ ...query, context: { ...query.context, ...await authorizeBusinessScope(query.context) } });
}

export async function queryStores({
  referenceDateIso,
  query: context,
}: QueryEnvelope<EhsStoreScope>): Promise<StoresQueryResult> {
  return repositoryFor(referenceDateIso).getStores({ context: await authorizeBusinessScope(context) });
}

export async function queryEnvironment({ referenceDateIso, query: context }: QueryEnvelope<EhsStoreScope>): Promise<EnvironmentQueryResult> {
  return repositoryFor(referenceDateIso).getEnvironment({ context: await authorizeBusinessScope(context) });
}

export async function queryCertificates({ referenceDateIso, query: context }: QueryEnvelope<EhsStoreScope>): Promise<CertificatesQueryResult> {
  return repositoryFor(referenceDateIso).getCertificates({ context: await authorizeBusinessScope(context) });
}
