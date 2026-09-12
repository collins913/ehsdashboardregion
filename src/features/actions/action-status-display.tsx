import { StatusDisplay } from "@/components/shared/status-display";
import type { ParsedActionStatus } from "@/types/ehs";
import { getActionStatusPresentation } from "@/features/actions/action-status-presentation";

export function ActionStatusDisplay({
  status,
}: {
  status: ParsedActionStatus;
}) {
  const presentation = getActionStatusPresentation(status);

  return (
    <StatusDisplay
      status={presentation.visualStatus}
      label={presentation.label}
    />
  );
}
