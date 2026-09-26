"use client";

import { useCallback } from "react";
import { AsyncQueryFeedback } from "@/components/shared/async-query-feedback";
import { DataAvailabilityDisplay } from "@/components/shared/data-availability-display";
import { StatusDisplay } from "@/components/shared/status-display";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { formatBusinessPeriod } from "@/lib/format-business-period";

type QueryEnvelope = { referenceDateIso: string; query: KpiDetailQuery };

export type KpiDetailQueries = {
  training: (input: QueryEnvelope) => Promise<KpiDetailRecords<KpiTrainingDetailRecord>>;
  drill: (input: QueryEnvelope) => Promise<KpiDetailRecords<KpiDrillDetailRecord>>;
  inspections: (input: QueryEnvelope) => Promise<KpiDetailRecords<KpiInspectionDetailRecord>>;
  astmEvents: (input: QueryEnvelope) => Promise<KpiDetailRecords<KpiAstmDetailRecord>>;
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

function SummaryResult({
  selection,
}: {
  selection: KpiDetailSelection;
}) {
  switch (selection.category) {
    case "training":
      return selection.row.training.availability === "INCOMPLETE" || selection.row.training.availability === "UNAVAILABLE"
        ? <DataAvailabilityDisplay availability={selection.row.training.availability} />
        : <StatusDisplay status={selection.row.training.result} />;
    case "drill":
      return selection.row.drill.availability === "INCOMPLETE" || selection.row.drill.availability === "UNAVAILABLE"
        ? <DataAvailabilityDisplay availability={selection.row.drill.availability} />
        : <StatusDisplay status={selection.row.drill.result} />;
    case "inspections":
      return selection.row.inspections.availability === "INCOMPLETE" || selection.row.inspections.availability === "UNAVAILABLE"
        ? <DataAvailabilityDisplay availability={selection.row.inspections.availability} />
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
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words">{displayValue(value)}</dd>
    </div>
  );
}

function TrainingCard({ record }: { record: KpiTrainingDetailRecord }) {
  const incompletePeople = record.incompletePeople?.join("、") ?? null;
  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4">
        <CardTitle className="text-sm leading-normal">{record.trainingName}</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <Field label="时间" value={formatBusinessMonth(record.month)} />
          <Field label="完成率" value={record.completionRate} />
          <div className="col-span-2">
            <Field label="未完成人员" value={incompletePeople} />
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

function DrillCard({ record }: { record: KpiDrillDetailRecord }) {
  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4">
        <CardTitle className="text-sm leading-normal">{record.drillName}</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <Field label="时间" value={formatBusinessMonth(record.month)} />
          <Field label="状态" value={record.status} />
        </dl>
      </CardContent>
    </Card>
  );
}

function InspectionCard({ record }: { record: KpiInspectionDetailRecord }) {
  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4">
        <CardTitle className="text-sm leading-normal">{record.inspectionName}</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div className="col-span-2">
            <Field label="检查人" value={record.inspector} />
          </div>
          <Field label="截止日期" value={record.dueDate === null ? null : formatBusinessDate(record.dueDate)} />
          <Field label="状态" value={record.status} />
        </dl>
      </CardContent>
    </Card>
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
        <EventDetailContent key={record.eventId} record={record} />
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
        return { category: "training", result: await queries.training(queryInput!) };
      case "drill":
        return { category: "drill", result: await queries.drill(queryInput!) };
      case "inspections":
        return { category: "inspections", result: await queries.inspections(queryInput!) };
      case "astmEvents":
        return { category: "astmEvents", result: await queries.astmEvents(queryInput!) };
    }
  }, [queries, queryKey]);
  const queryState = useLatestAsyncQuery(queryKey, queryInput === null ? null : load);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{selection ? categoryLabels[selection.category] : ""}</SheetTitle>
          <SheetDescription>{selection?.row.store.displayName ?? ""}</SheetDescription>
        </SheetHeader>
        {selection ? (
          <div className="space-y-6 px-4 pb-4">
            <dl className="space-y-4">
              <Field
                label={selection.category === "astmEvents" ? "统计周期" : "周期"}
                value={formatBusinessPeriod(context.period)}
              />
              <div>
                <dt className="text-xs text-muted-foreground">当前结果</dt>
                <dd className="mt-1">
                  {summaryPending ? (
                    <Skeleton className="h-6 w-20" aria-label="正在更新当前结果" />
                  ) : (
                    <SummaryResult selection={selection} />
                  )}
                </dd>
              </div>
            </dl>
            <section className="space-y-3" aria-label="记录明细">
              <h3 className="text-sm font-medium">记录</h3>
              {queryState.status === "LOADING" ? (
                <AsyncQueryFeedback status="LOADING" />
              ) : queryState.status === "ERROR" ? (
                <AsyncQueryFeedback status="ERROR" />
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
