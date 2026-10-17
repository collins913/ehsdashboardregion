"use client";
import { unwrapQueryOutcome, type QueryOutcome } from "@/data/contracts/query-result";

import { useCallback } from "react";
import { AsyncQueryFeedback } from "@/components/shared/async-query-feedback";
import { DataAvailabilityDisplay } from "@/components/shared/data-availability-display";
import { DetailField } from "@/components/shared/detail-field";
import { DetailHeader } from "@/components/shared/detail-header";
import { DetailRecordCard } from "@/components/shared/detail-record-card";
import { StatusDisplay } from "@/components/shared/status-display";
import { CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  KpiDetailQuery,
  KpiDetailRecords,
  KpiTrainingDetailRecord,
  KpiDrillDetailRecord,
  KpiInspectionDetailRecord,
  KpiAstmDetailRecord,
} from "@/data/contracts/kpi-details";
import type { EhsFilterContext } from "@/data/contracts/kpi";
import type { KpiRow } from "@/features/kpi/types";
import { EventDetailContent } from "@/features/events/event-detail-content";
import { useLatestAsyncQuery } from "@/hooks/use-latest-async-query";
import {
  formatBusinessDate,
  formatBusinessMonth,
} from "@/lib/format-business-date-time";

type QueryEnvelope = { referenceDateIso: string; query: KpiDetailQuery };

export type KpiDetailQueries = {
  training: (input: QueryEnvelope) => Promise<QueryOutcome<KpiDetailRecords<KpiTrainingDetailRecord>>>;
  drill: (input: QueryEnvelope) => Promise<QueryOutcome<KpiDetailRecords<KpiDrillDetailRecord>>>;
  inspections: (input: QueryEnvelope) => Promise<QueryOutcome<KpiDetailRecords<KpiInspectionDetailRecord>>>;
  astmEvents: (input: QueryEnvelope) => Promise<QueryOutcome<KpiDetailRecords<KpiAstmDetailRecord>>>;
};

export type KpiDetailCategory = keyof KpiDetailQueries;

export interface KpiDetailSelection {
  category: KpiDetailCategory;
  row: KpiRow;
  scopeKey: string;
}

type LoadedKpiDetails =
  | { category: "training"; result: KpiDetailRecords<KpiTrainingDetailRecord> }
  | { category: "drill"; result: KpiDetailRecords<KpiDrillDetailRecord> }
  | { category: "inspections"; result: KpiDetailRecords<KpiInspectionDetailRecord> }
  | { category: "astmEvents"; result: KpiDetailRecords<KpiAstmDetailRecord> };

const categoryLabels: Record<KpiDetailCategory, string> = {
  training: "培训",
  drill: "演练",
  inspections: "检查",
  astmEvents: "事件",
};

function displayValue(value: string | number | null): string {
  return value === null || value === "" ? "—" : String(value);
}

function SummaryResult(selection: KpiDetailSelection) {
  switch (selection.category) {
    case "training":
      return selection.row.training.availability === "INCOMPLETE" || selection.row.training.availability === "UNAVAILABLE"
        ? <DataAvailabilityDisplay availability={selection.row.training.availability} description={selection.row.training.diagnostics?.join("；")} />
        : <StatusDisplay status={selection.row.training.result} />;
    case "drill":
      return selection.row.drill.availability === "INCOMPLETE" || selection.row.drill.availability === "UNAVAILABLE"
        ? <DataAvailabilityDisplay availability={selection.row.drill.availability} />
        : <StatusDisplay status={selection.row.drill.result} />;
    case "inspections":
      return selection.row.inspections.availability === "INCOMPLETE" || selection.row.inspections.availability === "UNAVAILABLE"
        ? <DataAvailabilityDisplay availability={selection.row.inspections.availability} description={selection.row.inspections.diagnostics?.join("；")} />
        : <StatusDisplay status={selection.row.inspections.result} />;
    case "astmEvents":
      return selection.row.astmEvents.availability === "INCOMPLETE" || selection.row.astmEvents.availability === "UNAVAILABLE"
        ? <DataAvailabilityDisplay availability={selection.row.astmEvents.availability} />
        : selection.row.astmEvents.result
          ? <StatusDisplay status={selection.row.astmEvents.result} />
          : null;
  }
}

function Field({
  label,
  value,
}: {
  label: string;
  value: string | number | null;
}) {
  return (
    <DetailField label={label}>{displayValue(value)}</DetailField>
  );
}

function TrainingCard({ record }: { record: KpiTrainingDetailRecord }) {
  const incompletePeople = record.incompletePeople?.join("、") ?? null;
  return (
    <DetailRecordCard header={<CardTitle>{record.trainingName}</CardTitle>}>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <Field label="时间" value={formatBusinessMonth(record.month)} />
          <Field label="完成率" value={record.completionRate === null ? null : `${record.completionRate}%`} />
          <div className="col-span-2">
            <Field label="未完成人员" value={incompletePeople} />
          </div>
        </dl>
    </DetailRecordCard>
  );
}

function DrillCard({ record }: { record: KpiDrillDetailRecord }) {
  return (
    <DetailRecordCard header={<CardTitle>{record.drillName}</CardTitle>} action={<StatusDisplay status={record.completionResult} label={displayValue(record.status)} />}>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <Field label="时间" value={formatBusinessMonth(record.month)} />
        </dl>
    </DetailRecordCard>
  );
}

function InspectionCard({ record }: { record: KpiInspectionDetailRecord }) {
  return (
    <DetailRecordCard header={<CardTitle>{record.inspectionName}</CardTitle>} action={<StatusDisplay status={record.completionResult} label={displayValue(record.status)} />}>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <Field label="检查编号" value={record.inspectionNumber} />
          <Field label="截止日期" value={record.dueDate === null ? null : formatBusinessDate(record.dueDate)} />
          <div className="col-span-2">
            <Field label="检查人" value={record.inspector} />
          </div>
        </dl>
    </DetailRecordCard>
  );
}

function DetailRecords({
  data,
}: {
  data: LoadedKpiDetails;
}) {
  if (data.result.availability === "UNAVAILABLE") {
    return <DataAvailabilityDisplay availability="UNAVAILABLE" />;
  }
  if (data.result.availability === "CONFIRMED_EMPTY") {
    const emptyLabels: Record<KpiDetailCategory, string> = {
      training: "当前周期暂无培训明细",
      drill: "当前周期暂无演练明细",
      inspections: "当前周期暂无检查明细",
      astmEvents: "当前周期无 ASTM 事件",
    };
    return <p className="text-sm text-muted-foreground">{emptyLabels[data.category]}</p>;
  }

  const warning = data.result.availability === "INCOMPLETE"
    ? <DataAvailabilityDisplay availability="INCOMPLETE" />
    : null;

  if (data.category === "training") {
    return (
      <div className="space-y-3">
        {warning}
        {data.result.items.map((record, index) => (
          <TrainingCard key={`${record.month}-${record.trainingName}-${index}`} record={record} />
        ))}
      </div>
    );
  }
  if (data.category === "drill") {
    return (
      <div className="space-y-3">
        {warning}
        {data.result.items.map((record, index) => (
          <DrillCard key={`${record.month}-${record.drillName}-${index}`} record={record} />
        ))}
      </div>
    );
  }
  if (data.category === "inspections") {
    return (
      <div className="space-y-3">
        {warning}
        {data.result.items.map((record, index) => (
          <InspectionCard key={`${record.dueDate ?? "missing"}-${record.inspectionName}-${index}`} record={record} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {warning}
      {data.result.items.map((record) => (
        <DetailRecordCard key={record.eventId}>
          <EventDetailContent record={record} />
        </DetailRecordCard>
      ))}
    </div>
  );
}

export function KpiDetailSheet({
  selection,
  open,
  onOpenChange,
  context,
  referenceDateIso,
  queries,
  summaryPending,
}: {
  selection: KpiDetailSelection | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: EhsFilterContext;
  referenceDateIso: string;
  queries: KpiDetailQueries;
  summaryPending: boolean;
}) {
  const queryInput =
    open && selection
      ? {
          referenceDateIso,
          query: { context, storeId: selection.row.store.storeId },
        }
      : null;
  const queryKey = queryInput === null || selection === null
    ? null
    : JSON.stringify([open, selection.row.store.storeId, selection.category, context, referenceDateIso]);
  const load = useCallback(async (): Promise<LoadedKpiDetails> => {
    switch (selection!.category) {
      case "training":
        return { category: "training", result: unwrapQueryOutcome(await queries.training(queryInput!)) };
      case "drill":
        return { category: "drill", result: unwrapQueryOutcome(await queries.drill(queryInput!)) };
      case "inspections":
        return { category: "inspections", result: unwrapQueryOutcome(await queries.inspections(queryInput!)) };
      case "astmEvents":
        return { category: "astmEvents", result: unwrapQueryOutcome(await queries.astmEvents(queryInput!)) };
    }
  }, [queries, queryKey]);
  const queryState = useLatestAsyncQuery(queryKey, queryInput === null ? null : load);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <DetailHeader
          title={selection ? categoryLabels[selection.category] : ""}
          subtitle={selection?.row.store.displayName ?? ""}
          resultLabel="当前结果"
          result={selection
            ? summaryPending
              ? <Skeleton className="h-6 w-20" aria-label="正在更新当前结果" />
              : SummaryResult(selection) ?? undefined
            : undefined}
        />
        {selection ? (
          <div className="space-y-4 px-4 pb-4">
            <section className="space-y-3" aria-label="记录明细">
              <h3 className="text-sm font-medium">记录</h3>
              {queryState.status === "LOADING" ? (
                <AsyncQueryFeedback status="LOADING" />
              ) : queryState.status === "ERROR" ? (
                <AsyncQueryFeedback status="ERROR" errorCode={queryState.errorCode} />
              ) : queryState.status === "SUCCESS" && queryState.data ? (
                <DetailRecords data={queryState.data} />
              ) : null}
            </section>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
