import type { CSSProperties } from "react";
import type { CanvasElement, ImageFilters } from "./types";

export const DEFAULT_FILTERS: ImageFilters = { brightness: 1, contrast: 1, saturate: 1, grayscale: 0, blur: 0 };
export const DEFAULT_SHADOW = { color: "rgba(0,0,0,0.55)", blur: 24, x: 0, y: 8 };

/** CSS filter for a picture's colour corrections; nothing when everything is unchanged */
export function filterCss(f: ImageFilters | undefined): string {
  if (!f) return "";
  const parts: string[] = [];
  if (f.brightness !== 1) parts.push(`brightness(${f.brightness})`);
  if (f.contrast !== 1) parts.push(`contrast(${f.contrast})`);
  if (f.saturate !== 1) parts.push(`saturate(${f.saturate})`);
  if (f.grayscale > 0) parts.push(`grayscale(${f.grayscale})`);
  if (f.blur > 0) parts.push(`blur(${f.blur}px)`);
  return parts.join(" ");
}

/**
 * Shadow, outline and mirroring of an element, as styles for its content. Text gets a text-shadow
 * so the shadow follows the letters; everything else a drop-shadow that follows the shape.
 */
export function effectStyle(el: CanvasElement): CSSProperties {
  const style: CSSProperties = {};
  const filters: string[] = [];
  if (el.type === "image") {
    const f = filterCss(el.filters);
    if (f) filters.push(f);
  }
  if (el.shadow) {
    const { color, blur, x, y } = el.shadow;
    if (el.type === "text") style.textShadow = `${x}px ${y}px ${blur}px ${color}`;
    else filters.push(`drop-shadow(${x}px ${y}px ${blur}px ${color})`);
  }
  if (filters.length) style.filter = filters.join(" ");
  if (el.type === "text" && el.strokeWidth && el.strokeColor) {
    style.WebkitTextStroke = `${el.strokeWidth}px ${el.strokeColor}`;
    // The outline sits outside the fill, not over it
    style.paintOrder = "stroke fill";
  }
  if (el.flipX || el.flipY) style.transform = `scale(${el.flipX ? -1 : 1}, ${el.flipY ? -1 : 1})`;
  return style;
}

/** Name of an element in the layer list: its own name, else its text or label */
export function layerName(el: CanvasElement, fallback: string): string {
  if (el.layerName) return el.layerName;
  if (el.type === "text") return el.text.replace(/\s+/g, " ").trim().slice(0, 40) || fallback;
  if (el.type === "image" && el.label) return el.label;
  if (el.type === "score") return `${el.value} ${el.label}`.trim();
  return fallback;
}
