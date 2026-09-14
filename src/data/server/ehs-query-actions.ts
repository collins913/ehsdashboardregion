"use server";

import type { ActionsQuery, ActionsQueryResult } from "@/data/contracts/actions";
import type { EventsQuery, EventsQueryResult } from "@/data/contracts/events";
import type { EhsFilterContext } from "@/data/contracts/kpi";
import type { StoresQueryResult } from "@/data/contracts/stores";
import type {
  TakeChargeGoalsSummary,
  TakeChargeRecordsQuery,
  TakeChargeRecordsResult,
} from "@/data/contracts/take-charge";
import { createEhsRepository } from "@/data/repositories/create-ehs-repository.server";
import { buildKpiRows } from "@/features/kpi/build-kpi-rows";
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
  const snapshot = await repositoryFor(referenceDateIso).getKpiData(context);
  return buildKpiRows(context, snapshot);
}

export async function queryActions({
  referenceDateIso,
  query,
}: QueryEnvelope<ActionsQuery>): Promise<ActionsQueryResult> {
  return repositoryFor(referenceDateIso).getActions(query);
}

export async function queryEvents({
  referenceDateIso,
  query,
}: QueryEnvelope<EventsQuery>): Promise<EventsQueryResult> {
  return repositoryFor(referenceDateIso).getEvents(query);
}

export async function queryTakeChargeGoals({
  referenceDateIso,
  query: context,
}: QueryEnvelope<EhsFilterContext>): Promise<TakeChargeGoalsSummary> {
  return repositoryFor(referenceDateIso).getTakeChargeGoals({ context });
}

export async function queryTakeChargeRecords({
  referenceDateIso,
  query,
}: QueryEnvelope<TakeChargeRecordsQuery>): Promise<TakeChargeRecordsResult> {
  return repositoryFor(referenceDateIso).getTakeChargeRecords(query);
}

export async function queryStores({
  referenceDateIso,
  query: context,
}: QueryEnvelope<EhsFilterContext>): Promise<StoresQueryResult> {
  return repositoryFor(referenceDateIso).getStores({ context });
}
