import { describe, expect, it, vi } from "vitest";
import { useEffect, useState } from "react";
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
import {
  OverflowTooltip,
  isTextOverflowing,
  startTextOverflowMeasurement,
} from "@/components/shared/overflow-tooltip";

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return { ...actual, useState: vi.fn(actual.useState), useEffect: vi.fn(actual.useEffect) };
});

describe("OverflowTooltip measurement", () => {
  it("detects fractional overflow when integer scrollWidth and clientWidth tie", () => {
    const selectNodeContents = vi.fn();
    const element = {
      clientWidth: 194,
      scrollWidth: 194,
      getBoundingClientRect: () => ({ width: 193.75 }),
      ownerDocument: {
        defaultView: null,
        createRange: () => ({ selectNodeContents, getBoundingClientRect: () => ({ width: 193.96875 }) }) as unknown as Range,
      },
    };
    expect(isTextOverflowing(element)).toBe(true);
    expect(selectNodeContents).toHaveBeenCalledWith(element);
    element.getBoundingClientRect = () => ({ width: 194 });
    expect(isTextOverflowing(element)).toBe(false);
  });

  it("tracks fitting, fractional, obvious and fitting again through the existing resize lifecycle", () => {
    let width = 194;
    let resize: (() => void) | undefined;
    const results: boolean[] = [];
    const element = {
      clientWidth: 194, scrollWidth: 194,
      getBoundingClientRect: () => ({ width }),
      ownerDocument: {
        defaultView: null,
        createRange: () => ({ selectNodeContents: vi.fn(), getBoundingClientRect: () => ({ width: 193.96875 }) }) as unknown as Range,
      },
    };
    const cleanup = startTextOverflowMeasurement({
      element, onChange: (value) => results.push(value),
      requestFrame: () => 1, cancelFrame: vi.fn(),
      createObserver: () => ({ observe: vi.fn(), disconnect: vi.fn() }),
      subscribeResize: (measure) => { resize = measure; return vi.fn(); },
    });
    width = 193.75;
    resize?.();
    width = element.clientWidth = 172;
    resize?.();
    width = element.clientWidth = 194;
    resize?.();
    expect(results).toEqual([false, true, false]);
    cleanup();
  });

  it("ignores floating-point noise but not real subpixel overflow", () => {
    let intrinsicWidth = 194 + Number.EPSILON * 194;
    const element = {
      clientWidth: 194, scrollWidth: 194,
      getBoundingClientRect: () => ({ width: 194 }),
      ownerDocument: {
        defaultView: null,
        createRange: () => ({ selectNodeContents: vi.fn(), getBoundingClientRect: () => ({ width: intrinsicWidth }) }) as unknown as Range,
      },
    };
    expect(isTextOverflowing(element)).toBe(false);
    intrinsicWidth = 194.001;
    expect(isTextOverflowing(element)).toBe(true);
  });
  it("corrects a fitting result on viewport resize and renders the Tooltip trigger", () => {
    const element = { clientWidth: 220, scrollWidth: 180 };
    let overflowing = false;
    let resize: (() => void) | undefined;
    const unsubscribe = vi.fn();
    const disconnect = vi.fn();
    const cancelFrame = vi.fn();
    const changes: boolean[] = [];
    const cleanup = startTextOverflowMeasurement({
      element,
      onChange: (value) => { overflowing = value; changes.push(value); },
      requestFrame: () => 1,
      cancelFrame,
      createObserver: () => ({ observe: vi.fn(), disconnect }),
      subscribeResize: (measure) => { resize = measure; return unsubscribe; },
    });
    // Controlled React state render: checks the actual component's branch without fake CSS layout.
    const render = () => {
      vi.mocked(useState).mockReturnValueOnce([null, vi.fn()]);
      vi.mocked(useState).mockReturnValueOnce([overflowing, vi.fn()]);
      vi.mocked(useEffect).mockImplementationOnce(() => undefined);
      return OverflowTooltip({ text: "超长门店名称" });
    };
    expect(render().type).toBe("span");
    element.clientWidth = 120;
    resize?.();
    const tooltip = render();
    expect(overflowing).toBe(true);
    expect(tooltip.type).toBe(Tooltip);
    expect(tooltip.props.children[0].type).toBe(TooltipTrigger);
    resize?.();
    expect(changes).toEqual([false, true]);
    element.clientWidth = 220;
    resize?.();
    expect(render().type).toBe("span");
    cleanup();
    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(disconnect).toHaveBeenCalledOnce();
    expect(cancelFrame).toHaveBeenCalledWith(1);
  });
  it("distinguishes overflowing and fitting text", () => {
    expect(isTextOverflowing({ clientWidth: 160, scrollWidth: 220 })).toBe(true);
    expect(isTextOverflowing({ clientWidth: 220, scrollWidth: 180 })).toBe(false);
    expect(isTextOverflowing({ clientWidth: 0, scrollWidth: 220 })).toBe(false);
  });

  it("measures immediately and again on the next animation frame", () => {
    const element = { clientWidth: 220, scrollWidth: 180 };
    const results: boolean[] = [];
    let frameCallback: FrameRequestCallback | undefined;

    const cleanup = startTextOverflowMeasurement({
      element,
      onChange: (result) => results.push(result),
      requestFrame: (callback) => {
        frameCallback = callback;
        return 7;
      },
      cancelFrame: vi.fn(),
      createObserver: () => ({ observe: vi.fn(), disconnect: vi.fn() }),
    });

    expect(results).toEqual([false]);
    element.clientWidth = 160;
    frameCallback?.(0);
    expect(results).toEqual([false, true]);
    cleanup();
  });

  it("remeasures on ResizeObserver changes and cleans up resources", () => {
    const element = { clientWidth: 160, scrollWidth: 220 };
    const results: boolean[] = [];
    let resizeCallback: ResizeObserverCallback | undefined;
    const observe = vi.fn();
    const disconnect = vi.fn();
    const cancelFrame = vi.fn();

    const cleanup = startTextOverflowMeasurement({
      element,
      onChange: (result) => results.push(result),
      requestFrame: () => 9,
      cancelFrame,
      createObserver: (callback) => {
        resizeCallback = callback;
        return { observe, disconnect };
      },
    });

    expect(observe).toHaveBeenCalledOnce();
    expect(results).toEqual([true]);

    element.scrollWidth = 140;
    resizeCallback?.([], {} as ResizeObserver);
    expect(results).toEqual([true, false]);

    resizeCallback?.([], {} as ResizeObserver);
    expect(results).toEqual([true, false]);

    cleanup();
    expect(cancelFrame).toHaveBeenCalledWith(9);
    expect(disconnect).toHaveBeenCalledOnce();
  });

  it("remeasures short-to-long and long-to-short text through final layout", () => {
    const element = { clientWidth: 180, scrollWidth: 120 };
    const frames = new Map<number, FrameRequestCallback>();
    let nextFrameId = 1;
    let resizeCallback: ResizeObserverCallback | undefined;
    let isOverflowing = false;
    const changes: boolean[] = [];
    const requestFrame = (callback: FrameRequestCallback) => {
      const id = nextFrameId++;
      frames.set(id, callback);
      return id;
    };
    const cancelFrame = (id: number) => frames.delete(id);
    const runFrame = (id: number) => {
      const callback = frames.get(id);
      frames.delete(id);
      callback?.(0);
    };
    const start = () =>
      startTextOverflowMeasurement({
        element,
        onChange: (next) => {
          if (next !== isOverflowing) {
            isOverflowing = next;
            changes.push(next);
          }
        },
        requestFrame,
        cancelFrame,
        createObserver: (callback) => {
          resizeCallback = callback;
          return { observe: vi.fn(), disconnect: vi.fn() };
        },
      });

    const cleanupShort = start();
    expect(isOverflowing).toBe(false);
    cleanupShort();

    const cleanupLong = start();
    element.clientWidth = 120;
    element.scrollWidth = 260;
    runFrame(2);
    expect(isOverflowing).toBe(true);

    cleanupLong();
    const cleanupBackToShort = start();
    element.scrollWidth = 90;
    runFrame(3);
    expect(isOverflowing).toBe(false);

    element.scrollWidth = 220;
    resizeCallback?.([], {} as ResizeObserver);
    expect(isOverflowing).toBe(true);
    expect(changes).toEqual([true, false, true]);
    cleanupBackToShort();
    expect(frames.size).toBe(0);
  });
});
