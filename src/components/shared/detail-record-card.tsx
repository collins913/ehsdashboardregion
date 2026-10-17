import type { ReactNode } from "react";
import { Card, CardAction, CardContent, CardHeader } from "@/components/ui/card";

export function DetailRecordCard({
  header,
  action,
  children,
}: {
  header?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="min-w-0">
      {header || action ? <CardHeader>{header}{action ? <CardAction>{action}</CardAction> : null}</CardHeader> : null}
      <CardContent>{children}</CardContent>
    </Card>
  );
}
