"use client"

import type { ReactNode } from "react"
import { Info } from "lucide-react"
import { CardHeader, CardTitle } from "@/components/ui/card"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"

export function OverviewSectionHeader({ title, description, className, action }: {
  title: string
  description?: ReactNode
  className?: string
  action?: ReactNode
}) {
  return <CardHeader className={className}>
    <div className="flex items-center justify-between gap-3">
      <CardTitle className="text-lg font-semibold tracking-tight">
        {description ? <HoverCard openDelay={125} closeDelay={100}>
          <HoverCardTrigger asChild>
            <button type="button" aria-label={`${title}说明`} className="inline-flex items-center gap-1.5 rounded-sm text-left hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              <span>{title}</span><Info className="size-3.5 text-muted-foreground" aria-hidden="true" />
            </button>
          </HoverCardTrigger>
          <HoverCardContent side="bottom" align="start">{description}</HoverCardContent>
        </HoverCard> : title}
      </CardTitle>
      {action}
    </div>
  </CardHeader>
}
