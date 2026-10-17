import { DetailField, DetailFields } from "@/components/shared/detail-field";
import type { NormalizedActionRecord } from "@/data/contracts/actions";
import { ActionStatusDisplay } from "@/features/actions/action-status-display";
import { formatBusinessDateTime } from "@/lib/format-business-date-time";

export function ActionDetailContent({
  record,
  showStatus = true,
  showHeading = true,
}: {
  record: NormalizedActionRecord;
  showStatus?: boolean;
  showHeading?: boolean;
}) {
  const fields = (
    <DetailFields className="sm:grid-cols-2">
      <DetailField label="提交人">{record.submittedBy}</DetailField>
      <DetailField label="提交时间">
        {formatBusinessDateTime(record.submittedDate)}
      </DetailField>
      <DetailField label="负责人">{record.owner}</DetailField>
      <DetailField label="截止时间">
        {formatBusinessDateTime(record.dueDate)}
      </DetailField>
      <div className="sm:col-span-2">
        <DetailField label="关闭时间">
          {formatBusinessDateTime(record.closedDate)}
        </DetailField>
      </div>
      <DetailField label="问题" className="sm:col-span-2">
        {record.problem}
      </DetailField>
      <DetailField label="行动项" className="sm:col-span-2">
        {record.action}
      </DetailField>
    </DetailFields>
  );
  if (!showHeading) return fields;
  return (
    <div className="space-y-4">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <p className="min-w-0 break-words text-base font-medium">{record.actionId}</p>
        {showStatus ? <ActionStatusDisplay status={record.sourceStatus} /> : null}
      </div>
      {fields}
    </div>
  );
}
