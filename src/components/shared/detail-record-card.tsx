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
    <Card className="min-w-0 gap-0 p-4 shadow-none">
      {header ? <CardHeader className="p-0 pb-3">{header}</CardHeader> : null}
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  );
}
