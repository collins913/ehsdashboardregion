import { DetailField, DetailFields } from "@/components/shared/detail-field";
import { StatusDisplay } from "@/components/shared/status-display";
import type { NormalizedEventRecord } from "@/data/contracts/events";
import { formatBusinessDateTime } from "@/lib/format-business-date-time";

export function EventDetailContent({
  record,
  showStatus = true,
  showHeading = true,
}: {
  record: NormalizedEventRecord;
  showStatus?: boolean;
  showHeading?: boolean;
}) {
  const fields = (
    <DetailFields className="sm:grid-cols-2">
      <DetailField label="事件类型" className="sm:col-span-2">{record.eventType}</DetailField>
      <DetailField label="提交人">{record.submittedBy}</DetailField>
      <DetailField label="事件时间">{formatBusinessDateTime(record.eventDate)}</DetailField>
      <DetailField label="事件描述" className="sm:col-span-2">{record.description}</DetailField>
    </DetailFields>
  );
  if (!showHeading) return fields;
  return (
    <div className="space-y-4">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <p className="min-w-0 break-words text-base font-medium">{record.eventId}</p>
        {showStatus ? <StatusDisplay status={record.recordState} /> : null}
      </div>
      {fields}
    </div>
  );
}
