import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { attachDetailCardHover, DetailRecordCard } from "./detail-record-card";

class HoverTarget extends EventTarget {
  rect = { left: 100, top: 200, width: 400, height: 200 };
  getBoundingClientRect = vi.fn(() => this.rect);
  dataset: Record<string, string> = {};
  style = {
    transform: "",
    removeProperty: (name: string) => { if (name === "transform") this.style.transform = ""; },
  };
}

let container: HoverTarget;
let card: HoverTarget;
let viewport: EventTarget;
let media: EventTarget & { matches: boolean };
let frames: Map<number, FrameRequestCallback>;
let cleanup: (() => void) | undefined;

function move(type: string, x: number, y: number, pointerType = "mouse") {
  container.dispatchEvent(Object.assign(new Event(type), { clientX: x, clientY: y, pointerType }));
}
function flushFrame() {
  const pending = [...frames.values()];
  frames.clear();
  pending.forEach((callback) => callback(0));
}
function attach(enabled = true) {
  cleanup = attachDetailCardHover(container as unknown as HTMLDivElement, card as unknown as HTMLDivElement, enabled);
}

beforeEach(() => {
  container = new HoverTarget(); card = new HoverTarget();
  viewport = new EventTarget();
  media = Object.assign(new EventTarget(), { matches: true });
  frames = new Map();
  let nextFrame = 0;
  vi.stubGlobal("window", Object.assign(viewport, { matchMedia: () => media }));
  vi.stubGlobal("requestAnimationFrame", vi.fn((callback: FrameRequestCallback) => {
    const id = nextFrame++;
    frames.set(id, callback);
    return id;
  }));
  vi.stubGlobal("cancelAnimationFrame", vi.fn((id: number) => frames.delete(id)));
});
afterEach(() => { cleanup?.(); cleanup = undefined; vi.unstubAllGlobals(); });

describe("shared detail card hover lifecycle", () => {
  it("uses the latest real pointer position and stops scheduling when idle", () => {
    attach();
    move("pointerenter", 300, 300);
    move("pointermove", 500, 400);
    expect(frames.size).toBe(1);
    flushFrame();
    const rotation = card.style.transform.match(/rotateX\(([-\d.]+)deg\) rotateY\(([-\d.]+)deg\)/)!;
    expect(Number(rotation[1])).toBeCloseTo(-3.5);
    expect(Number(rotation[2])).toBeCloseTo(7);
    expect(card.style.transform).toContain("scale3d(1.025, 1.025, 1.025)");
    expect(card.dataset.tilting).toBe("true");
    expect(frames.size).toBe(0);
  });

  it("reads current stable wrapper bounds and limits rotation on tall records", () => {
    attach();
    move("pointerenter", 300, 300);
    flushFrame();
    container.rect.top = 400;
    move("pointermove", 300, 500);
    flushFrame();
    expect(card.style.transform).toContain("rotateX(0deg) rotateY(0deg)");
    expect(card.getBoundingClientRect).not.toHaveBeenCalled();
    move("pointermove", 9000, -9000);
    flushFrame();
    expect(card.style.transform).toContain("rotateX(10deg) rotateY(10deg)");
  });

  it.each(["pointerleave", "pointercancel", "scroll", "blur", "change"])("resets on %s and cancels even frame zero", (event) => {
    attach();
    move("pointerenter", 500, 400);
    const target = event === "scroll" || event === "blur" ? viewport : event === "change" ? media : container;
    target.dispatchEvent(new Event(event));
    expect(frames.size).toBe(0);
    expect(card.dataset.tilting).toBe("false");
    expect(card.style.transform).toContain("scale3d(1, 1, 1)");
  });

  it("does not animate for touch or coarse pointers", () => {
    attach();
    move("pointerenter", 300, 300, "touch");
    media.matches = false;
    move("pointerenter", 300, 300);
    expect(frames.size).toBe(0);
    expect(card.style.transform).toBe("");
  });

  it("skips animation for reduced motion", () => {
    attach(false);
    move("pointerenter", 500, 400);
    expect(frames.size).toBe(0);
    expect(card.style.transform).toBe("");
  });

  it("removes transforms, queued work and listeners on unmount or preference change", () => {
    attach();
    move("pointerenter", 500, 400);
    flushFrame();
    move("pointermove", 200, 200);
    cleanup!(); cleanup = undefined;
    move("pointerenter", 500, 400);
    viewport.dispatchEvent(new Event("scroll"));
    expect(frames.size).toBe(0);
    expect(card.style.transform).toBe("");
    expect(card.dataset.tilting).toBeUndefined();
  });
});


describe("shared detail record Item composition", () => {
  it("keeps actions inside the header and lets the body occupy a separate full-width row", () => {
    const markup = renderToStaticMarkup(createElement(DetailRecordCard, {
      header: "记录标题",
      action: createElement("span", null, "已完成"),
      children: createElement("p", null, "记录正文"),
    }));
    expect(markup).toContain('data-slot="item"');
    expect(markup).toContain('data-variant="outline"');
    expect(markup).toContain('data-slot="item-header"');
    expect(markup).toContain('data-slot="item-title"');
    expect(markup).toContain("记录标题");
    expect(markup).toContain("<p>记录正文</p>");
    const contentClasses = [...markup.matchAll(/data-slot="item-content" class="([^"]*)"/g)].map((match) => match[1].split(" "));
    expect(contentClasses).toHaveLength(2);
    expect(contentClasses[0]).toContain("gap-1");
    // Body is a full flex row after the header, never a sibling column of the action.
    expect(contentClasses[1]).toContain("w-full");
    expect(contentClasses[1]).toContain("flex-none");
    expect(contentClasses[1]).toContain("gap-3");
    expect(markup.indexOf('data-slot="item-actions"')).toBeLessThan(markup.indexOf("<p>记录正文</p>"));
    expect(markup).toContain("self-start");
    expect(markup).not.toContain('data-slot="card-header"');
    expect(markup).not.toContain('data-slot="card-content"');
    expect(markup).toContain("data-[tilting=true]:shadow-sm");
  });

  it("keeps headerless record fields without inventing a title or action", () => {
    const markup = renderToStaticMarkup(createElement(DetailRecordCard, {
      children: createElement("dl", null, createElement("dt", null, "字段"), createElement("dd", null, "内容")),
    }));
    expect(markup).toContain("<dl><dt>字段</dt><dd>内容</dd></dl>");
    expect(markup).toContain('data-slot="item-content"');
    expect(markup).not.toContain('data-slot="item-title"');
    expect(markup).not.toContain('data-slot="item-actions"');
  });
});


describe("shared record body typography", () => {
  it("owns description styling and keeps long record text fully visible", () => {
    const text = "辅助说明".repeat(40);
    const markup = renderToStaticMarkup(createElement(DetailRecordCard, { header: "记录标题", description: text }));
    const body = markup.match(/data-slot="item"[^>]*class="([^"]*)"/)![1].split(" ");
    expect(body).toContain("text-sm");
    expect(body).toContain("leading-normal");
    expect(body).toContain("font-normal");
    expect(markup).toContain('data-slot="item-description"');
    expect(markup).toContain("text-muted-foreground");
    expect(markup).toContain("line-clamp-none");
    expect(markup).toContain(text);
    expect(markup).toContain('data-slot="item-title"');
  });
});
