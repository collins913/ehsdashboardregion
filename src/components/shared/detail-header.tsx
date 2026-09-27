import type { ReactNode } from "react";
import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export function DetailHeader({
  title,
  subtitle,
  resultLabel,
  result,
}: {
  title: string;
  subtitle: string;
  resultLabel?: string;
  result?: ReactNode;
}) {
  return (
    <>
      <SheetHeader className="gap-1">
        <SheetTitle className="break-words text-lg font-semibold tracking-tight">
          {title}
        </SheetTitle>
        <SheetDescription className="break-words">{subtitle}</SheetDescription>
      </SheetHeader>
      {resultLabel && result !== undefined && result !== null ? (
        <div className="space-y-1 px-4">
          <p className="text-xs text-muted-foreground">{resultLabel}</p>
          <div>{result}</div>
        </div>
      ) : null}
    </>
  );
}
