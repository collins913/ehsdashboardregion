"use client";

import { useEffect, useRef, useState } from "react";
import { ANALYTICS_NUMBER_ANIMATION_DURATION } from "@/components/shared/analytics-layout";
import { usePrefersReducedMotion } from "@/components/shared/use-analytics-motion";

const defaultFormatter = (value: number) => Math.round(value).toLocaleString();

export function AnimatedNumber({
  value,
  duration = ANALYTICS_NUMBER_ANIMATION_DURATION,
  formatter = defaultFormatter,
}: {
  value: number | null;
  duration?: number;
  formatter?: (value: number) => string;
}) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [displayedValue, setDisplayedValue] = useState(value);
  const displayedValueRef = useRef(value);

  useEffect(() => {
    const from = displayedValueRef.current;
    if (Object.is(value, from)) return;
    if (value === null || from === null || prefersReducedMotion || duration <= 0) {
      displayedValueRef.current = value;
      setDisplayedValue(value);
      return;
    }

    const startedAt = performance.now();
    let frame = 0;
    const update = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      const nextValue = from + (value - from) * eased;
      displayedValueRef.current = nextValue;
      setDisplayedValue(progress === 1 ? value : nextValue);
      if (progress < 1) frame = requestAnimationFrame(update);
    };

    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [duration, prefersReducedMotion, value]);

  return displayedValue === null ? "—" : formatter(displayedValue);
}
