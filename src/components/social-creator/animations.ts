export type AnimType =
  | "none"
  | "fade"
  | "slide-up"
  | "slide-down"
  | "slide-left"
  | "slide-right"
  | "zoom-in"
  | "zoom-out"
  | "pop"
  | "rotate-in";

export interface ElementAnimation {
  type: AnimType;
  /** delay before the animation starts, in milliseconds */
  delay: number;
  /** animation duration in milliseconds */
  duration: number;
}

export const ANIM_OPTIONS: { value: AnimType; label: string }[] = [
  { value: "none", label: "Keine" },
  { value: "fade", label: "Einblenden" },
  { value: "slide-up", label: "Von unten" },
  { value: "slide-down", label: "Von oben" },
  { value: "slide-left", label: "Von rechts" },
  { value: "slide-right", label: "Von links" },
  { value: "zoom-in", label: "Heranzoomen" },
  { value: "zoom-out", label: "Herauszoomen" },
  { value: "pop", label: "Pop" },
  { value: "rotate-in", label: "Drehen" },
];

export const DEFAULT_ANIM: ElementAnimation = { type: "none", delay: 0, duration: 700 };

/** Extra hold time (ms) after the last animation finished, used for video length. */
export const HOLD_MS = 1500;
export const MIN_DURATION_MS = 2000;

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function easeOutBack(t: number) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

export interface AnimResult {
  opacity: number;
  transform: string;
}

/**
 * Compute the animated opacity/transform for an element at a given timeline
 * position (ms). When `time` is null the element is shown in its final state.
 */
export function computeAnim(anim: ElementAnimation | undefined, time: number | null): AnimResult {
  if (time == null || !anim || anim.type === "none" || anim.duration <= 0) {
    return { opacity: 1, transform: "" };
  }
  const start = anim.delay;
  const raw = time <= start ? 0 : time >= start + anim.duration ? 1 : (time - start) / anim.duration;

  switch (anim.type) {
    case "fade":
      return { opacity: easeOutCubic(raw), transform: "" };
    case "slide-up": {
      const e = easeOutCubic(raw);
      return { opacity: e, transform: `translateY(${(1 - e) * 80}px)` };
    }
    case "slide-down": {
      const e = easeOutCubic(raw);
      return { opacity: e, transform: `translateY(${(1 - e) * -80}px)` };
    }
    case "slide-left": {
      const e = easeOutCubic(raw);
      return { opacity: e, transform: `translateX(${(1 - e) * 120}px)` };
    }
    case "slide-right": {
      const e = easeOutCubic(raw);
      return { opacity: e, transform: `translateX(${(1 - e) * -120}px)` };
    }
    case "zoom-in": {
      const e = easeOutCubic(raw);
      return { opacity: e, transform: `scale(${0.6 + 0.4 * e})` };
    }
    case "zoom-out": {
      const e = easeOutCubic(raw);
      return { opacity: e, transform: `scale(${1.4 - 0.4 * e})` };
    }
    case "pop": {
      const e = easeOutBack(raw);
      return { opacity: easeOutCubic(Math.min(1, raw * 2)), transform: `scale(${e})` };
    }
    case "rotate-in": {
      const e = easeOutCubic(raw);
      return { opacity: e, transform: `rotate(${(1 - e) * -25}deg) scale(${0.8 + 0.2 * e})` };
    }
    default:
      return { opacity: 1, transform: "" };
  }
}

/** Total animated length of a slide in ms (last animation end + hold). */
export function slideDurationMs(elements: { anim?: ElementAnimation }[]): number {
  let maxEnd = 0;
  for (const el of elements) {
    if (el.anim && el.anim.type !== "none") {
      maxEnd = Math.max(maxEnd, el.anim.delay + el.anim.duration);
    }
  }
  return Math.max(MIN_DURATION_MS, maxEnd + HOLD_MS);
}
