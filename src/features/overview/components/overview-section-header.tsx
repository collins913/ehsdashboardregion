"use client"

import type { ReactNode } from "react"
import { Info } from "lucide-react"
import { CardHeader } from "@/components/ui/card"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"

export function OverviewSectionHeader({ title, description, subtitle, className, action, headingLevel = 2 }: {
  title: string
  description?: ReactNode
  subtitle?: ReactNode
  className?: string
  action?: ReactNode
  headingLevel?: 2 | 3
}) {
  const Heading = headingLevel === 3 ? "h3" : "h2"
  return <CardHeader className={className}>
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-1">
        <Heading className={headingLevel === 3 ? "text-sm font-medium leading-5 tracking-tight" : "text-lg font-semibold leading-6 tracking-tight"}>
          {description ? <HoverCard openDelay={125} closeDelay={100}>
            <HoverCardTrigger asChild>
              <button type="button" aria-label={`${title}说明`} className="inline-flex items-center gap-1.5 rounded-sm text-left hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                <span>{title}</span><Info className="size-3.5 text-muted-foreground" aria-hidden="true" />
              </button>
            </HoverCardTrigger>
            <HoverCardContent side="bottom" align="start">{description}</HoverCardContent>
          </HoverCard> : title}
        </Heading>
        {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  </CardHeader>
}
