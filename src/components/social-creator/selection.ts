import { uid } from "./templateKit";
import type { CanvasElement } from "./types";

/**
 * Working with several elements at once, Canva-style: groups act as one, a selection has one box
 * around it, and aligning, distributing and scaling treat each group as a single unit.
 */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Patches = Record<string, Partial<CanvasElement>>;

/** Box around all given elements (their unrotated boxes) */
export function unionBox(els: Rect[]): Rect | null {
  if (!els.length) return null;
  const x = Math.min(...els.map((e) => e.x));
  const y = Math.min(...els.map((e) => e.y));
  const r = Math.max(...els.map((e) => e.x + e.w));
  const b = Math.max(...els.map((e) => e.y + e.h));
  return { x, y, w: r - x, h: b - y };
}

/** The ids a click on this element selects: the whole group if it is in one */
export function withGroup(elements: CanvasElement[], id: string): string[] {
  const el = elements.find((e) => e.id === id);
  if (!el?.groupId) return [id];
  return elements.filter((e) => e.groupId === el.groupId).map((e) => e.id);
}

/** Adds the ids, or removes them when they are all selected already (Shift-click) */
export function toggleIds(selected: string[], ids: string[]): string[] {
  const all = ids.every((id) => selected.includes(id));
  return all ? selected.filter((id) => !ids.includes(id)) : [...selected, ...ids.filter((id) => !selected.includes(id))];
}

/** Visible, unlocked elements the marquee touches, groups completed */
export function idsInRect(elements: CanvasElement[], rect: Rect): string[] {
  const hit = elements.filter((e) => !e.hidden && !e.locked && e.x < rect.x + rect.w && e.x + e.w > rect.x && e.y < rect.y + rect.h && e.y + e.h > rect.y);
  const ids = new Set(hit.map((e) => e.id));
  for (const e of hit) if (e.groupId) for (const m of elements) if (m.groupId === e.groupId) ids.add(m.id);
  return elements.filter((e) => ids.has(e.id)).map((e) => e.id);
}

/** Selected elements split into units: one per group, one per loose element */
export function units(els: CanvasElement[]): CanvasElement[][] {
  const groups = new Map<string, CanvasElement[]>();
  const out: CanvasElement[][] = [];
  for (const e of els) {
    if (!e.groupId) {
      out.push([e]);
      continue;
    }
    const g = groups.get(e.groupId);
    if (g) g.push(e);
    else {
      const list = [e];
      groups.set(e.groupId, list);
      out.push(list);
    }
  }
  return out;
}

/** What the selection allows: several units can be grouped and aligned to each other, three distributed */
export function selectionInfo(elements: CanvasElement[]) {
  const parts = units(elements);
  return {
    multi: parts.length > 1,
    canGroup: parts.length > 1,
    canUngroup: elements.some((e) => e.groupId),
    canDistribute: parts.length > 2,
    locked: elements.length > 0 && elements.every((e) => e.locked),
  };
}

const shift = (unit: CanvasElement[], dx: number, dy: number, into: Patches) => {
  for (const e of unit) into[e.id] = { x: Math.round(e.x + dx), y: Math.round(e.y + dy) };
};

export type AlignTo = "left" | "hcenter" | "right" | "top" | "vcenter" | "bottom";

/** Lines the units up on the selection's box (several) or on the slide (one unit) */
export function alignUnits(els: CanvasElement[], to: AlignTo, slide: { w: number; h: number }): Patches {
  const list = units(els.filter((e) => !e.locked));
  const frame = list.length > 1 ? unionBox(els)! : { x: 0, y: 0, w: slide.w, h: slide.h };
  const patches: Patches = {};
  for (const unit of list) {
    const b = unionBox(unit)!;
    const dx = to === "left" ? frame.x - b.x : to === "hcenter" ? frame.x + frame.w / 2 - (b.x + b.w / 2) : to === "right" ? frame.x + frame.w - (b.x + b.w) : 0;
    const dy = to === "top" ? frame.y - b.y : to === "vcenter" ? frame.y + frame.h / 2 - (b.y + b.h / 2) : to === "bottom" ? frame.y + frame.h - (b.y + b.h) : 0;
    shift(unit, dx, dy, patches);
  }
  return patches;
}

/** Equal gaps between the units, from the first to the last along the axis; needs three */
export function distributeUnits(els: CanvasElement[], axis: "h" | "v"): Patches {
  const list = units(els.filter((e) => !e.locked)).map((u) => ({ u, b: unionBox(u)! }));
  if (list.length < 3) return {};
  const pos = (b: Rect) => (axis === "h" ? b.x : b.y);
  const size = (b: Rect) => (axis === "h" ? b.w : b.h);
  list.sort((a, b) => pos(a.b) + size(a.b) / 2 - (pos(b.b) + size(b.b) / 2));
  const start = pos(list[0].b);
  const end = Math.max(...list.map((i) => pos(i.b) + size(i.b)));
  const gap = (end - start - list.reduce((s, i) => s + size(i.b), 0)) / (list.length - 1);
  const patches: Patches = {};
  let cursor = start;
  for (const { u, b } of list) {
    const d = cursor - pos(b);
    shift(u, axis === "h" ? d : 0, axis === "v" ? d : 0, patches);
    cursor += size(b) + gap;
  }
  return patches;
}

/**
 * Scales elements around an anchor point by `k`, like dragging a corner of the selection box:
 * positions and sizes, and with them font sizes, paddings, radii and outlines.
 */
export function scaleElements(els: CanvasElement[], k: number, anchor: { x: number; y: number }): Patches {
  const patches: Patches = {};
  for (const e of els) {
    const p: Partial<CanvasElement> = {
      x: anchor.x + (e.x - anchor.x) * k,
      y: anchor.y + (e.y - anchor.y) * k,
      w: Math.max(4, e.w * k),
      h: Math.max(4, e.h * k),
    };
    if (e.type === "text") Object.assign(p, { fontSize: Math.max(4, e.fontSize * k), padding: e.padding * k, letterSpacing: e.letterSpacing * k, ...(e.strokeWidth ? { strokeWidth: e.strokeWidth * k } : {}), ...(e.radius < 999 ? { radius: e.radius * k } : {}) });
    if (e.type === "shape") Object.assign(p, { borderWidth: e.borderWidth * k, ...(e.radius < 999 ? { radius: e.radius * k } : {}) });
    if (e.type === "image" && e.radius < 999) Object.assign(p, { radius: e.radius * k });
    if (e.shadow) Object.assign(p, { shadow: { ...e.shadow, blur: e.shadow.blur * k, x: e.shadow.x * k, y: e.shadow.y * k } });
    patches[e.id] = p;
  }
  return patches;
}

/** Copies with new ids; groups among them get new group ids, so the copy is its own group */
export function cloneElements(els: CanvasElement[], dx: number, dy: number): CanvasElement[] {
  const groupMap = new Map<string, string>();
  return els.map((e) => {
    let groupId = e.groupId;
    if (groupId) {
      if (!groupMap.has(groupId)) groupMap.set(groupId, `g_${uid()}`);
      groupId = groupMap.get(groupId);
    }
    return { ...e, id: uid(), x: e.x + dx, y: e.y + dy, groupId, locked: false } as CanvasElement;
  });
}

/** Everything about the look of an element, nothing about its place or content */
const STYLE_KEYS: Record<CanvasElement["type"], string[]> = {
  text: ["fontSize", "fontWeight", "color", "align", "fontFamily", "lineHeight", "letterSpacing", "uppercase", "italic", "bgColor", "padding", "radius", "strokeColor", "strokeWidth"],
  shape: ["fill", "radius", "borderColor", "borderWidth"],
  image: ["fit", "radius", "filters"],
  icon: ["color", "strokeWidth", "fill"],
  score: ["color", "bgColor"],
};
const COMMON_STYLE = ["opacity", "shadow"];

/** "Paste style": the look of `from` for every target of the same type */
export function stylePatches(from: CanvasElement, targets: CanvasElement[]): Patches {
  const patches: Patches = {};
  for (const t of targets) {
    if (t.id === from.id) continue;
    const keys = [...COMMON_STYLE, ...(t.type === from.type ? STYLE_KEYS[t.type] : [])];
    const p: Record<string, unknown> = {};
    for (const k of keys) {
      const v = (from as unknown as Record<string, unknown>)[k];
      p[k] = v && typeof v === "object" ? { ...(v as object) } : v;
    }
    patches[t.id] = p as Partial<CanvasElement>;
  }
  return patches;
}

/** New stacking order: the selected elements one step, or all the way, to the front or back, keeping their order */
export function restack(elements: CanvasElement[], ids: string[], dir: "front" | "back" | 1 | -1): CanvasElement[] {
  const set = new Set(ids);
  const picked = elements.filter((e) => set.has(e.id));
  if (!picked.length) return elements;
  const rest = elements.filter((e) => !set.has(e.id));
  if (dir === "front") return [...rest, ...picked];
  if (dir === "back") return [...picked, ...rest];
  const out = [...elements];
  // One step: move each selected element past its neighbour that is not selected
  const order = dir === 1 ? [...out.keys()].reverse() : [...out.keys()];
  for (const i of order) {
    const j = i + dir;
    if (!set.has(out[i].id) || j < 0 || j >= out.length || set.has(out[j].id)) continue;
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
