"use client";

import { useEffect, useRef, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type OverflowTooltipProps = {
  text: string;
  className?: string;
  focusable?: boolean;
};

export function OverflowTooltip({
  text,
  className,
  focusable = true,
}: OverflowTooltipProps) {
  const textRef = useRef<HTMLSpanElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const element = textRef.current;
    if (!element) return;

    const updateOverflow = () => {
      setIsOverflowing(element.scrollWidth > element.clientWidth);
    };

    updateOverflow();
    const resizeObserver = new ResizeObserver(updateOverflow);
    resizeObserver.observe(element);

    return () => resizeObserver.disconnect();
  }, [isOverflowing, text]);

  const label = (
    <span
      ref={textRef}
      className={cn("block min-w-0 truncate", className)}
      tabIndex={focusable && isOverflowing ? 0 : undefined}
    >
      {text}
    </span>
  );

  if (!isOverflowing) return label;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{label}</TooltipTrigger>
      <TooltipContent>{text}</TooltipContent>
    </Tooltip>
  );
}
