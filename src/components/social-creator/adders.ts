import { uid } from "./templates";
import type { CanvasElement, Slide, TextElement } from "./types";

const BRAND = "'Glacial Indifference', Inter, system-ui, sans-serif";

/** New elements land in the middle of the slide, sized to it */
export function useAdders(slide: Slide, onAdd: (el: CanvasElement) => void) {
  const { width: W, height: H } = slide;
  const S = Math.min(W, H);
  const cx = W / 2;
  const cy = H / 2;
  return {
    addText: (text: string, opts: Partial<TextElement> = {}) =>
      onAdd({
        id: uid(), type: "text", text,
        x: cx - W * 0.4, y: cy - H * 0.06, w: W * 0.8, h: H * 0.12,
        fontSize: Math.round(S * 0.045), fontWeight: 700, color: "#efedf4",
        align: "left", fontFamily: BRAND, lineHeight: 1.1, letterSpacing: 0,
        uppercase: false, italic: false, bgColor: null, padding: 0, radius: 0, ...opts,
      }),
    addImage: (src: string, label?: string, fit: "cover" | "contain" = "contain") =>
      onAdd({
        id: uid(), type: "image", src, label, fit,
        x: cx - S * 0.2, y: cy - S * 0.1, w: S * 0.4, h: S * 0.2, radius: fit === "cover" ? 16 : 0,
      }),
    addPoster: (src: string, label?: string) =>
      onAdd({
        id: uid(), type: "image", src, label, fit: "cover",
        x: cx - S * 0.2, y: cy - S * 0.3, w: S * 0.4, h: S * 0.6, radius: 16,
      }),
    addIcon: (name: string) =>
      onAdd({
        id: uid(), type: "icon", name, color: "#5c9dff", strokeWidth: 2, fill: false,
        x: cx - S * 0.08, y: cy - S * 0.08, w: S * 0.16, h: S * 0.16,
      }),
    addShape: (patch: Partial<Extract<CanvasElement, { type: "shape" }>>) =>
      onAdd({
        id: uid(), type: "shape", fill: "#5c9dff",
        x: cx - W * 0.2, y: cy - H * 0.1, w: W * 0.4, h: H * 0.2, radius: 0, borderColor: "#000000", borderWidth: 0,
        ...patch,
      }),
    addScore: (value = 8.5, label = "Score") =>
      onAdd({
        id: uid(), type: "score", value, label, color: "#ffffff", bgColor: "#4ab588",
        x: cx - S * 0.15, y: cy - S * 0.15, w: S * 0.3, h: S * 0.3,
      }),
  };
}
