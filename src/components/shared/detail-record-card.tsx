import type { ReactNode } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function DetailRecordCard({
  header,
  children,
}: {
  header?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="min-w-0">
      {header ? <CardHeader>{header}</CardHeader> : null}
      <CardContent>{children}</CardContent>
    </Card>
  );
}
