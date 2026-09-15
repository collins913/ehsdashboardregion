"use client";

import { useEffect, useState } from "react";
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

export function isTextOverflowing({
  clientWidth,
  scrollWidth,
}: {
  clientWidth: number;
  scrollWidth: number;
}) {
  return clientWidth > 0 && scrollWidth > clientWidth;
}

type OverflowObserver = {
  observe: (element: Element) => void;
  disconnect: () => void;
};

export function startTextOverflowMeasurement({
  element,
  onChange,
  requestFrame,
  cancelFrame,
  createObserver,
}: {
  element: Pick<HTMLElement, "clientWidth" | "scrollWidth">;
  onChange: (isOverflowing: boolean) => void;
  requestFrame: (callback: FrameRequestCallback) => number;
  cancelFrame: (frameId: number) => void;
  createObserver: (callback: ResizeObserverCallback) => OverflowObserver;
}) {
  let previousResult: boolean | undefined;
  const measure = () => {
    const nextResult = isTextOverflowing({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    });

    if (nextResult !== previousResult) {
      previousResult = nextResult;
      onChange(nextResult);
    }
  };

  measure();
  let postLayoutFrameId: number | null = null;
  const frameId = requestFrame(() => {
    measure();
    postLayoutFrameId = requestFrame(measure);
  });
  const observer = createObserver(measure);
  observer.observe(element as Element);

  return () => {
    cancelFrame(frameId);
    if (postLayoutFrameId !== null) {
      cancelFrame(postLayoutFrameId);
    }
    observer.disconnect();
  };
}

export function OverflowTooltip({
  text,
  className,
  focusable = true,
}: OverflowTooltipProps) {
  const [textElement, setTextElement] = useState<HTMLSpanElement | null>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    if (!textElement) return;

    return startTextOverflowMeasurement({
      element: textElement,
      onChange: (nextResult) =>
        setIsOverflowing((current) =>
          current === nextResult ? current : nextResult,
        ),
      requestFrame: requestAnimationFrame,
      cancelFrame: cancelAnimationFrame,
      createObserver: (callback) => new ResizeObserver(callback),
    });
  }, [text, textElement]);

  const label = (
    <span
      ref={setTextElement}
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
