import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

export function DetailAccordion({
  children,
  className,
  defaultValue = [],
}: {
  children: ReactNode;
  className?: string;
  defaultValue?: string[];
}) {
  return (
    <Accordion type="multiple" defaultValue={defaultValue} className={cn("min-w-0", className)}>
      {children}
    </Accordion>
  );
}

export function DetailAccordionItem({
  value,
  title,
  summary,
  count,
  disabled = false,
  attention = false,
  children,
  contentClassName,
}: {
  value: string;
  title: string;
  summary?: ReactNode;
  count?: number;
  disabled?: boolean;
  attention?: boolean;
  children: ReactNode;
  contentClassName?: string;
}) {
  return (
    <AccordionItem value={value} disabled={disabled}>
      <AccordionTrigger className="group hover:no-underline">
        <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-2">
            <span className="break-words group-hover:underline">{title}</span>
            {count !== undefined ? <Badge variant="secondary">{count}</Badge> : null}
          </span>
          {summary}
          {attention ? (
            <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-destructive" />
          ) : null}
        </span>
      </AccordionTrigger>
      <AccordionContent className={contentClassName}>{children}</AccordionContent>
    </AccordionItem>
  );
}
