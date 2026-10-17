"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Item, ItemActions, ItemContent, ItemDescription, ItemHeader, ItemTitle } from "@/components/ui/item";
import { usePrefersReducedMotion } from "@/components/shared/use-analytics-motion";

// A stable wrapper supplies bounds while the Card itself tilts.
export function attachDetailCardHover(
  container: HTMLDivElement | null,
  card: HTMLDivElement | null,
  enabled: boolean,
) {
  if (!container || !card || !enabled) return () => {};
  const hover = window.matchMedia("(hover: hover) and (pointer: fine)");
  const scrollOptions = { capture: true, passive: true };
  let frame: number | null = null;
  let position = { x: 0, y: 0 };
  const clamp = (angle: number) => Math.max(-10, Math.min(10, angle));

  const reset = () => {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    card.dataset.tilting = "false";
    card.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)";
  };
  const move = (event: PointerEvent) => {
    if (event.pointerType !== "mouse" || !hover.matches) return;
    position = { x: event.clientX, y: event.clientY };
    card.dataset.tilting = "true";
    if (frame !== null) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      const rect = container.getBoundingClientRect();
      const rotateX = clamp(-(position.y - rect.top - rect.height / 2) * 0.035);
      const rotateY = clamp((position.x - rect.left - rect.width / 2) * 0.035);
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.025, 1.025, 1.025)`;
    });
  };

  container.addEventListener("pointerenter", move);
  container.addEventListener("pointermove", move);
  container.addEventListener("pointerleave", reset);
  container.addEventListener("pointercancel", reset);
  window.addEventListener("blur", reset);
  window.addEventListener("scroll", reset, scrollOptions);
  hover.addEventListener("change", reset);
  return () => {
    reset();
    card.style.removeProperty("transform");
    delete card.dataset.tilting;
    container.removeEventListener("pointerenter", move);
    container.removeEventListener("pointermove", move);
    container.removeEventListener("pointerleave", reset);
    container.removeEventListener("pointercancel", reset);
    window.removeEventListener("blur", reset);
    window.removeEventListener("scroll", reset, scrollOptions);
    hover.removeEventListener("change", reset);
  };
}

export function DetailRecordCard({
  header,
  action,
  description,
  children,
}: {
  header?: ReactNode;
  action?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  useEffect(() => attachDetailCardHover(containerRef.current, cardRef.current, !reducedMotion), [reducedMotion]);

  return (
    <div ref={containerRef} className="min-w-0">
      <Item ref={cardRef} variant="outline" className="min-w-0 gap-3 bg-card leading-normal font-normal transition-[transform,box-shadow] duration-200 ease-out data-[tilting=true]:shadow-sm data-[tilting=true]:will-change-transform data-[tilting=false]:duration-500 motion-reduce:transform-none! motion-reduce:shadow-none! motion-reduce:transition-none!">
        {header || description != null || action ? (
          <ItemHeader data-detail-record-heading className="items-start">
            <ItemContent className="min-w-0">
              {header ? <ItemTitle>{header}</ItemTitle> : null}
              {description != null ? <ItemDescription className="line-clamp-none break-words">{description}</ItemDescription> : null}
            </ItemContent>
            {action ? <ItemActions className="shrink-0 self-start">{action}</ItemActions> : null}
          </ItemHeader>
        ) : null}
        {children != null && children !== false ? (
          <ItemContent className="min-w-0 w-full flex-none gap-3">
            {children}
          </ItemContent>
        ) : null}
      </Item>
    </div>
  );
}
