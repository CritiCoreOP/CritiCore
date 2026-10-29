/** Layout maths for images in articles; no editor dependency, so it is easy to test */

export type ImageAlign = "center" | "left" | "right";

export const IMAGE_ALIGNS: ImageAlign[] = ["left", "center", "right"];
/** Narrower than this an image is a stamp, not a picture */
export const MIN_IMAGE_WIDTH = 15;
export const MAX_IMAGES_PER_ROW = 4;
/** Floating images start at half the column; a full-width float would push all text below it */
export const FLOAT_DEFAULT_WIDTH = 50;
/** Assumed for images whose size is not known yet: a typical 3:2 photo */
const DEFAULT_RATIO = 1.5;

export const round1 = (n: number) => Math.round(n * 10) / 10;

export const clampWidth = (width: number) => Math.min(100, Math.max(MIN_IMAGE_WIDTH, width));

// Widths a layout usually wants; a drag that ends close to one lands on it
const SNAPS = [25, 100 / 3, 50, 200 / 3, 75, 100];

/** Rounds a dragged width, snapping to quarters and thirds within `tolerance` percent */
export function snapWidth(width: number, tolerance = 1.5): number {
  const w = clampWidth(width);
  for (const s of SNAPS) if (Math.abs(w - s) <= tolerance) return round1(s);
  return Math.round(w);
}

/**
 * New width in percent while dragging a resize handle. A centred image grows on both sides, so
 * one pixel of drag is two pixels of width; the left handle grows the image when dragged left.
 */
export function widthFromDrag({
  start,
  dx,
  container,
  align,
  side,
}: {
  start: number;
  dx: number;
  container: number;
  align: ImageAlign;
  side: "left" | "right";
}): number {
  if (container <= 0) return start;
  const direction = side === "left" ? -1 : 1;
  const factor = align === "center" ? 2 : 1;
  return snapWidth(start + ((dx * direction * factor) / container) * 100);
}

/** Usable aspect ratio (width / height), or null for missing and absurd values */
export function validRatio(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n >= 0.1 && n <= 10 ? Math.round(n * 1000) / 1000 : null;
}

/**
 * Widths in percent for images side by side, proportional to their aspect ratios: that makes them
 * equally tall without cropping any of them.
 */
export function rowWidths(ratios: (number | null | undefined)[]): number[] {
  const r = ratios.map((x) => validRatio(x) ?? DEFAULT_RATIO);
  const sum = r.reduce((a, b) => a + b, 0);
  return r.map((x) => round1((x / sum) * 100));
}
