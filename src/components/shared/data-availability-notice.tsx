import { queryErrorMessage, type QueryErrorCode } from "@/data/contracts/query-result";
import type { DataAvailability } from "@/data/contracts/kpi";

export function DataAvailabilityNotice({
  availability,
  subject,
  queryErrorCode,
}: {
  availability: DataAvailability;
  subject: string;
  queryErrorCode?: QueryErrorCode;
}) {
  if (availability === "AVAILABLE" || availability === "CONFIRMED_EMPTY") return null;

  return (
    <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
      {queryErrorCode ? queryErrorMessage(queryErrorCode) : availability === "INCOMPLETE"
        ? `${subject}数据不完整，当前结果可能缺少记录。`
        : `${subject}数据不可用。`}
    </div>
  );
}
