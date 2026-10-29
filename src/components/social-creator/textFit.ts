/**
 * Font size at which a text fits its box. Text on the canvas is top-aligned and clipped at the
 * box edge, so templates size headlines and summaries here instead of hoping a length fits.
 * Widths come from canvas text measurement; without a canvas (tests) from an average glyph width.
 */

export interface FitOptions {
  fontFamily: string;
  fontWeight: number;
  /** Box width in slide pixels */
  width: number;
  /** Height the text may take at most */
  maxHeight: number;
  maxSize: number;
  minSize: number;
  lineHeight: number;
  letterSpacing?: number;
  uppercase?: boolean;
}

export interface Fit {
  fontSize: number;
  lines: number;
  /** Box height for the fitted text, with a little room for descenders */
  height: number;
}

let ctx: CanvasRenderingContext2D | null | undefined;

function context(): CanvasRenderingContext2D | null {
  if (ctx !== undefined) return ctx;
  // jsdom has no canvas and logs an error for every attempt
  if (typeof document === "undefined" || /jsdom/i.test(navigator.userAgent)) return (ctx = null);
  try {
    ctx = document.createElement("canvas").getContext("2d");
  } catch {
    ctx = null;
  }
  return ctx;
}

function measurer(o: FitOptions, size: number): (s: string) => number {
  const c = context();
  const spacing = o.letterSpacing ?? 0;
  if (c) {
    c.font = `${o.fontWeight} ${size}px ${o.fontFamily}`;
    return (s) => c.measureText(s).width + spacing * s.length;
  }
  const avg = (o.fontWeight >= 600 ? 0.56 : 0.5) * (o.uppercase ? 1.15 : 1);
  return (s) => s.length * size * avg + spacing * s.length;
}

/** Width of one line of text at this size */
export function textWidth(value: string, fontFamily: string, fontWeight: number, size: number, letterSpacing = 0, uppercase = false): number {
  const measure = measurer({ fontFamily, fontWeight, width: 0, maxHeight: 0, maxSize: size, minSize: size, lineHeight: 1, letterSpacing, uppercase }, size);
  return measure(uppercase ? value.toUpperCase() : value);
}

/** Lines the text wraps into at this size, the way the canvas wraps it (words, then long words) */
export function countLines(text: string, o: FitOptions, size: number): number {
  const measure = measurer(o, size);
  // A few percent slack: canvas and DOM metrics differ slightly, and a clipped line is worse than a small gap
  const max = o.width * 0.97;
  const source = o.uppercase ? text.toUpperCase() : text;
  let lines = 0;
  for (const paragraph of source.split("\n")) {
    let line = "";
    lines++;
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (measure(next) <= max) {
        line = next;
        continue;
      }
      if (line) lines++;
      // A word wider than the box breaks inside, like `word-break: break-word`
      let rest = word;
      while (measure(rest) > max && rest.length > 1) {
        let cut = rest.length - 1;
        while (cut > 1 && measure(rest.slice(0, cut)) > max) cut--;
        rest = rest.slice(cut);
        lines++;
      }
      line = rest;
    }
  }
  return Math.max(1, lines);
}

export function fitText(text: string, o: FitOptions): Fit {
  let size = o.maxSize;
  let lines = countLines(text, o, size);
  while (size > o.minSize && lines * size * o.lineHeight > o.maxHeight) {
    size = Math.max(o.minSize, Math.floor(size * 0.95));
    lines = countLines(text, o, size);
  }
  const fontSize = Math.round(size);
  return { fontSize, lines, height: Math.ceil(lines * fontSize * o.lineHeight + fontSize * 0.2) };
}
