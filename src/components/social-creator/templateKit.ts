import { BRAND_LOGOS } from "./brandAssets";
import { fitText, textWidth, type FitOptions } from "./textFit";
import type { IconElement, ImageElement, ScoreElement, ShapeElement, SlideBackground, TextElement } from "./types";

/**
 * Building blocks of the templates: brand colours and fonts, a frame that knows the format's safe
 * area, and element builders with the defaults filled in. Every size derives from the short side,
 * so a template looks the same on a square post, a story and a 3:1 header.
 */

let counter = 0;
export const uid = () => `el_${Date.now().toString(36)}_${(counter++).toString(36)}`;

export const BRAND = "'Glacial Indifference', Inter, system-ui, sans-serif";
export const BODY = "Inter, system-ui, -apple-system, sans-serif";

// Templates measure text on a canvas to size it, which is only right once the fonts are loaded;
// start loading them as soon as the creator's code is there
if (typeof document !== "undefined" && document.fonts && !/jsdom/i.test(navigator.userAgent)) {
  for (const font of ["700 40px 'Glacial Indifference'", "400 40px 'Glacial Indifference'", "400 40px Inter", "500 40px Inter", "600 40px Inter", "700 40px Inter"]) {
    void document.fonts.load(font).catch(() => undefined);
  }
}

export const C = {
  ink: "#0d0f14",
  night: "#121722",
  paper: "#f1f0f5",
  muted: "#a9b1c4",
  blue: "#5c9dff",
  blueDeep: "#1252c2",
  red: "#e5483d",
  green: "#3fbf86",
  amber: "#f2b33d",
};

const LOGO_RATIO = 998 / 207;
export const logoSrc = (key: string) => BRAND_LOGOS.find((l) => l.key === key)?.src || "";

export interface Frame {
  w: number;
  h: number;
  /** Short side; every size is a share of it */
  s: number;
  /** Margin to the edge */
  m: number;
  /** 1.5:1 and wider */
  wide: boolean;
  /** 2.4:1 and wider (X header) */
  ultra: boolean;
  /** 9:16 stories: Instagram and TikTok put their own interface over the top and bottom */
  tall: boolean;
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export function frame(w: number, h: number): Frame {
  const s = Math.min(w, h);
  const m = Math.round(s * 0.075);
  const ratio = w / h;
  const tall = ratio <= 0.66;
  return {
    w, h, s, m,
    wide: ratio >= 1.5,
    ultra: ratio >= 2.4,
    tall,
    top: tall ? Math.round(h * 0.14) : m,
    bottom: tall ? Math.round(h * 0.8) : h - m,
    left: m,
    right: w - m,
  };
}

export const bg = (gradient: string, color = C.ink): SlideBackground => ({ type: "gradient", color, gradient, image: null, imageFit: "cover", imageOpacity: 1 });

type TextOpts = Partial<Omit<TextElement, "id" | "type" | "text" | "x" | "y" | "w" | "h">>;

export function text(value: string, x: number, y: number, w: number, h: number, o: TextOpts = {}): TextElement {
  return {
    id: uid(), type: "text", text: value, x, y, w, h,
    fontSize: 40, fontWeight: 700, color: C.paper, align: "left", fontFamily: BRAND, lineHeight: 1.1, letterSpacing: 0,
    uppercase: false, italic: false, bgColor: null, padding: 0, radius: 0,
    ...o,
  };
}

export function shape(x: number, y: number, w: number, h: number, fill: string, o: Partial<Omit<ShapeElement, "id" | "type">> = {}): ShapeElement {
  return { id: uid(), type: "shape", x, y, w, h, fill, radius: 0, borderColor: "#000000", borderWidth: 0, ...o };
}

export function icon(name: string, x: number, y: number, size: number, color: string, o: Partial<Omit<IconElement, "id" | "type" | "name">> = {}): IconElement {
  return { id: uid(), type: "icon", name, x, y, w: size, h: size, color, strokeWidth: 2, fill: false, ...o };
}

export function score(value: number, x: number, y: number, size: number, o: Partial<Omit<ScoreElement, "id" | "type" | "value">> = {}): ScoreElement {
  return { id: uid(), type: "score", value, x, y, w: size, h: size, label: "Score", color: C.ink, bgColor: C.green, ...o };
}

export function image(src: string, x: number, y: number, w: number, h: number, o: Partial<Omit<ImageElement, "id" | "type" | "src">> = {}): ImageElement {
  return { id: uid(), type: "image", src, x, y, w, h, fit: "contain", radius: 0, ...o };
}

/** The CritiCore wordmark at a given height */
export function logo(x: number, y: number, height: number, key = "criticore-full"): ImageElement {
  return image(logoSrc(key), x, y, Math.round(height * LOGO_RATIO), height, { label: "CritiCore", layerName: "Logo" });
}
export const logoWidth = (height: number) => Math.round(height * LOGO_RATIO);

/**
 * Text sized to fit `maxHeight`: the font shrinks from `maxSize` until it does, and the box gets
 * exactly the height the lines need, so blocks can be stacked from the bottom up.
 */
export function fitted(value: string, x: number, y: number, w: number, maxHeight: number, fit: Omit<FitOptions, "width" | "maxHeight" | "fontFamily" | "fontWeight" | "lineHeight"> & { fontFamily?: string; fontWeight?: number; lineHeight?: number }, o: TextOpts = {}): TextElement {
  const fontFamily = fit.fontFamily ?? o.fontFamily ?? BRAND;
  const fontWeight = fit.fontWeight ?? o.fontWeight ?? 700;
  const lineHeight = fit.lineHeight ?? o.lineHeight ?? 1.08;
  const r = fitText(value, { ...fit, fontFamily, fontWeight, lineHeight, width: w, maxHeight, letterSpacing: o.letterSpacing, uppercase: o.uppercase });
  return text(value, x, y, w, Math.min(maxHeight + r.fontSize * 0.2, r.height), { ...o, fontFamily, fontWeight, lineHeight, fontSize: r.fontSize });
}

/** One-line label on a coloured pill, as wide as its text */
export function pill(value: string, x: number, y: number, fontSize: number, fill: string, color: string, o: TextOpts = {}): TextElement {
  const pad = Math.round(fontSize * 0.55);
  const spacing = o.letterSpacing ?? Math.round(fontSize * 0.12);
  const width = Math.ceil(textWidth(value, o.fontFamily ?? BRAND, 700, fontSize, spacing, o.uppercase ?? true) + pad * 2 + fontSize * 0.8);
  return text(value, x, y, width, Math.round(fontSize + pad * 2), {
    fontSize, color, bgColor: fill, padding: pad, radius: 999, align: "center", lineHeight: 1, letterSpacing: spacing, uppercase: true, ...o,
  });
}

/** Logo bottom left and the domain bottom right; returns the y where content has to stop */
export function footer(f: Frame, o: { center?: boolean; domain?: boolean; color?: string } = {}) {
  const lh = Math.round(f.s * (f.ultra ? 0.075 : 0.058));
  const y = f.bottom - lh;
  const els = [];
  if (o.center) {
    els.push(logo(Math.round((f.w - logoWidth(lh)) / 2), y, lh));
  } else {
    els.push(logo(f.left, y, lh));
    if (o.domain !== false) {
      const size = Math.round(f.s * (f.ultra ? 0.042 : 0.03));
      els.push(text("criticore.cc", f.right - f.s * 0.5, y + (lh - size * 1.2) / 2, f.s * 0.5, Math.round(size * 1.3), { fontFamily: BODY, fontWeight: 600, fontSize: size, color: o.color ?? C.muted, align: "right", lineHeight: 1.2, letterSpacing: 0.5, layerName: "Domain" }));
    }
  }
  return { elements: els, top: y - Math.round(f.s * 0.05) };
}
