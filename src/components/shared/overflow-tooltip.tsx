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

type TextOverflowElement = {
  clientWidth: number;
  scrollWidth: number;
  getBoundingClientRect?: () => Pick<DOMRect, "width">;
  ownerDocument?: Pick<Document, "createRange" | "defaultView">;
};

export function isTextOverflowing(element: TextOverflowElement) {
  if (element.clientWidth <= 0) return false;
  if (element.scrollWidth > element.clientWidth) return true;
  if (!element.ownerDocument || !element.getBoundingClientRect) return false;

  // Integer scroll/client widths can tie even when CSS ellipsis clips fractional text width.
  const range = element.ownerDocument.createRange();
  range.selectNodeContents(element as unknown as Node);
  const intrinsicWidth = range.getBoundingClientRect().width;
  const style = element.ownerDocument.defaultView?.getComputedStyle(element as Element);
  const horizontalInset = style
    ? [style.paddingLeft, style.paddingRight, style.borderLeftWidth, style.borderRightWidth]
        .reduce((sum, value) => sum + (Number.parseFloat(value) || 0), 0)
    : 0;
  const availableWidth = element.getBoundingClientRect().width - horizontalInset;
  // Scale-relative IEEE-754 noise allowance, not a CSS-pixel overflow tolerance.
  const epsilon = Number.EPSILON * Math.max(1, intrinsicWidth, availableWidth) * 8;
  return availableWidth > 0 && intrinsicWidth - availableWidth > epsilon;
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
  subscribeResize,
}: {
  element: TextOverflowElement;
  onChange: (isOverflowing: boolean) => void;
  requestFrame: (callback: FrameRequestCallback) => number;
  cancelFrame: (frameId: number) => void;
  createObserver: (callback: ResizeObserverCallback) => OverflowObserver;
  subscribeResize?: (measure: () => void) => () => void;
}) {
  let previousResult: boolean | undefined;
  const measure = () => {
    const nextResult = isTextOverflowing(element);

    if (nextResult !== previousResult) {
      previousResult = nextResult;
      onChange(nextResult);
    }
  };

  measure();
  const frameId = requestFrame(measure);
  const observer = createObserver(measure);
  observer.observe(element as Element);
  const unsubscribeResize = subscribeResize?.(measure);

  return () => {
    cancelFrame(frameId);
    observer.disconnect();
    unsubscribeResize?.();
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
      subscribeResize: (measure) => {
        window.addEventListener("resize", measure);
        return () => window.removeEventListener("resize", measure);
      },
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
