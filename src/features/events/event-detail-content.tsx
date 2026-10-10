import { DetailField } from "@/components/shared/detail-field";
import { StatusDisplay } from "@/components/shared/status-display";
import type { NormalizedEventRecord } from "@/data/contracts/events";
import { formatBusinessDateTime } from "@/lib/format-business-date-time";

export function EventDetailContent({
  record,
  showStatus = true,
}: {
  record: NormalizedEventRecord;
  showStatus?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <p className="min-w-0 break-words text-base font-medium">{record.eventId}</p>
        {showStatus ? <StatusDisplay status={record.recordState} /> : null}
      </div>
      <dl className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <DetailField label="事件类型">{record.eventType}</DetailField>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <DetailField label="提交人">{record.submittedBy}</DetailField>
          <DetailField label="事件时间">
            {formatBusinessDateTime(record.eventDate)}
          </DetailField>
        </div>
        <DetailField label="事件描述">
          <span className="whitespace-pre-wrap">{record.description}</span>
        </DetailField>
      </dl>
    </div>
  );
}
