import { queryErrorMessage, type ErrorDiagnostics, type QueryErrorCode } from "@/data/contracts/query-result";
import type { DataAvailability } from "@/data/contracts/kpi";

export function DataAvailabilityNotice({
  availability,
  subject,
  queryErrorCode,
  diagnostics,
}: {
  availability: DataAvailability;
  subject: string;
  queryErrorCode?: QueryErrorCode;
  diagnostics?: ErrorDiagnostics;
}) {
  if (availability === "AVAILABLE" || availability === "CONFIRMED_EMPTY") return null;

  return (
    <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
      {queryErrorCode ? queryErrorMessage(queryErrorCode, diagnostics) : availability === "INCOMPLETE"
        ? `${subject}数据不完整，当前结果可能缺少记录。`
        : `${subject}数据不可用。`}
    </div>
  );
}
