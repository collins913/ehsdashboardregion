import { describe, expect, it, vi } from "vitest";
import {
  isTextOverflowing,
  startTextOverflowMeasurement,
} from "@/components/shared/overflow-tooltip";

describe("OverflowTooltip measurement", () => {
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
    runFrame(2);
    element.clientWidth = 120;
    element.scrollWidth = 260;
    runFrame(3);
    expect(isOverflowing).toBe(true);

    cleanupLong();
    const cleanupBackToShort = start();
    runFrame(4);
    element.scrollWidth = 90;
    runFrame(5);
    expect(isOverflowing).toBe(false);

    element.scrollWidth = 220;
    resizeCallback?.([], {} as ResizeObserver);
    expect(isOverflowing).toBe(true);
    expect(changes).toEqual([true, false, true]);
    cleanupBackToShort();
    expect(frames.size).toBe(0);
  });
});
