import type { ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

// Summary ends before the official 16px chevron and 1px trigger border.
export const detailAccordionSummaryInsetClassName = "pl-px pr-[calc(1rem+1px)]";

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
    <Accordion type="multiple" defaultValue={defaultValue} className={cn("min-w-0 [&_[data-slot=accordion-content]]:[animation-duration:200ms] [&_[data-slot=accordion-content]]:[animation-timing-function:ease-in-out]", className)}>
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
  cardContent = false,
}: {
  value: string;
  title: string;
  summary?: ReactNode;
  count?: number;
  disabled?: boolean;
  attention?: boolean;
  children: ReactNode;
  contentClassName?: string;
  cardContent?: boolean;
}) {
  return (
    <AccordionItem value={value} disabled={disabled}>
      <AccordionTrigger animatedIcon className="group hover:no-underline">
        <span className="flex min-w-0 flex-1 items-start justify-between gap-2">
          <span className="flex min-w-0 items-start gap-2">
            <span className="break-words group-hover:underline">{title}</span>
            {count !== undefined ? <Badge variant="secondary">{count}</Badge> : null}
          </span>
          {summary}
          {attention ? (
            <CircleAlert role="img" aria-label="需要关注" className="size-4 shrink-0 text-destructive" />
          ) : null}
        </span>
      </AccordionTrigger>
      <AccordionContent
        viewportClassName={cardContent ? "-mx-4 px-4" : undefined}
        className={cn(cardContent && "pt-3 pb-4", contentClassName)}
      >{children}</AccordionContent>
    </AccordionItem>
  );
}
