/** Smart guides: a dragged element snaps to the canvas and to the other elements */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Guides {
  /** x positions of vertical guide lines */
  v: number[];
  /** y positions of horizontal guide lines */
  h: number[];
}

export interface SnapResult {
  x: number;
  y: number;
  guides: Guides;
}

/** Start, centre and end of a rect along one axis */
const stops = (start: number, size: number) => [start, start + size / 2, start + size];

/** The closest target within `threshold` for any of the moving stops, and the shift that reaches it */
function bestShift(moving: number[], targets: number[], threshold: number): { shift: number; lines: number[] } {
  let best: number | null = null;
  for (const m of moving) {
    for (const t of targets) {
      const d = t - m;
      if (Math.abs(d) <= threshold && (best === null || Math.abs(d) < Math.abs(best))) best = d;
    }
  }
  if (best === null) return { shift: 0, lines: [] };
  // Every line the snapped element now touches, so equal distances show all their guides
  const lines = targets.filter((t) => moving.some((m) => Math.abs(m + best! - t) < 0.5));
  return { shift: best, lines: Array.from(new Set(lines)) };
}

export function snapRect(moving: Rect, others: Rect[], canvas: { w: number; h: number }, threshold: number): SnapResult {
  const xTargets = [...stops(0, canvas.w), ...others.flatMap((o) => stops(o.x, o.w))];
  const yTargets = [...stops(0, canvas.h), ...others.flatMap((o) => stops(o.y, o.h))];
  const sx = bestShift(stops(moving.x, moving.w), xTargets, threshold);
  const sy = bestShift(stops(moving.y, moving.h), yTargets, threshold);
  return { x: moving.x + sx.shift, y: moving.y + sy.shift, guides: { v: sx.lines, h: sy.lines } };
}

/** Rotation snaps to 15° steps when it is close to one, so straight and diagonal angles are easy to hit */
export function snapAngle(deg: number, free: boolean): number {
  const normalized = ((Math.round(deg) % 360) + 360) % 360;
  if (free) return normalized;
  const step = Math.round(normalized / 15) * 15;
  return Math.abs(step - normalized) <= 4 ? step % 360 : normalized;
}
