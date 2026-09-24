import type { ReactNode } from "react";
import type { NormalizedActionRecord } from "@/data/contracts/actions";
import { ActionStatusDisplay } from "@/features/actions/action-status-display";
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

export function ActionDetailContent({
  record,
}: {
  record: NormalizedActionRecord;
}) {
  return (
    <div className="space-y-6 px-4 pb-4">
      <dl className="grid gap-4 sm:grid-cols-2">
        <DetailField label="行动项编号">{record.actionId}</DetailField>
        <DetailField label="状态">
          <ActionStatusDisplay status={record.sourceStatus} />
        </DetailField>
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
      </dl>

      <section className="space-y-2">
        <h3 className="font-medium">问题</h3>
        <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
          {record.problem}
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="font-medium">行动项</h3>
        <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
          {record.action}
        </p>
      </section>
    </div>
  );
}
