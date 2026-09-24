import type { ReactNode } from "react";
import { StatusDisplay } from "@/components/shared/status-display";
import type { NormalizedEventRecord } from "@/data/contracts/events";
import { formatBusinessDateTime } from "@/lib/format-business-date-time";

function DetailField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words">{children}</dd>
    </div>
  );
}

function astmAccidentLabel(value: string | null | undefined): string {
  if (value === "Yes") return "是";
  if (value === "No") return "否";
  return "—";
}

export function EventDetailContent({
  record,
}: {
  record: NormalizedEventRecord;
}) {
  return (
    <div className="space-y-6 px-4 pb-4">
      <dl className="space-y-4">
        <DetailField label="事件编号">{record.eventId}</DetailField>
        <div className="grid gap-4 sm:grid-cols-2">
          <DetailField label="事件类型">{record.eventType}</DetailField>
          <DetailField label="状态">
            <StatusDisplay status={record.recordState} />
          </DetailField>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <DetailField label="提交人">{record.submittedBy}</DetailField>
          <DetailField label="提交时间">
            {formatBusinessDateTime(record.eventDate)}
          </DetailField>
        </div>
        <DetailField label="事件描述">
          <span className="whitespace-pre-wrap">{record.description}</span>
        </DetailField>
        <DetailField label="ASTM 事故">
          {astmAccidentLabel(record.astmInjuryIllness)}
        </DetailField>
      </dl>
    </div>
  );
}
