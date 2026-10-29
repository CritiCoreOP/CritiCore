import type { CanvasElement, Slide, SlideBackground } from "./types";
import { BODY, C, bg, fitted, footer, frame, icon, logo, pill, score, shape, text, uid, type Frame } from "./templateKit";

export { uid };

export interface TemplateResult {
  background: SlideBackground;
  elements: CanvasElement[];
}

export interface TemplateDef {
  id: string;
  label: string;
  description: string;
  build: (w: number, h: number) => TemplateResult;
}

/** Sizes that are read, as shares of the short side; the 3:1 header gets a little more */
const sizes = (f: Frame) => {
  const k = f.ultra ? 1.3 : 1;
  return { kicker: Math.round(f.s * 0.032 * k), body: Math.round(f.s * 0.034 * k), gap: Math.round(f.s * 0.035) };
};

/** Headline, optional lead below, both fitted; stacked upwards from `bottom` */
function stackUp(f: Frame, o: { x: number; w: number; bottom: number; topLimit: number; kicker?: CanvasElement; headline: string; lead?: string; headMax: number; headMin?: number; leadLines?: number; headColor?: string; leadColor?: string; align?: "left" | "center" }) {
  const z = sizes(f);
  const els: CanvasElement[] = [];
  let y = o.bottom;
  if (o.lead) {
    const lines = o.leadLines ?? 2;
    const lead = fitted(o.lead, o.x, 0, o.w, Math.round(z.body * 1.35 * lines), { maxSize: z.body, minSize: Math.round(z.body * 0.8), fontFamily: BODY, fontWeight: 400, lineHeight: 1.35 }, { color: o.leadColor ?? C.muted, align: o.align ?? "left", layerName: "Text" });
    lead.y = y - lead.h;
    y = lead.y - z.gap * 0.7;
    els.push(lead);
  }
  const kickerH = o.kicker ? o.kicker.h + z.gap * 0.6 : 0;
  const head = fitted(o.headline, o.x, 0, o.w, Math.max(f.s * 0.1, y - o.topLimit - kickerH), { maxSize: o.headMax, minSize: o.headMin ?? Math.round(f.s * 0.045), lineHeight: 1.06 }, { color: o.headColor ?? C.paper, align: o.align ?? "left", layerName: "Überschrift" });
  head.y = Math.round(y - head.h);
  els.push(head);
  if (o.kicker) {
    o.kicker.y = Math.round(head.y - z.gap * 0.6 - o.kicker.h);
    els.push(o.kicker);
  }
  return els.reverse();
}

export const TEMPLATES: TemplateDef[] = [
  {
    id: "blank",
    label: "Leer",
    description: "Leere Vorlage zum freien Gestalten",
    build: () => ({
      background: { type: "color", color: "#14161c", gradient: "linear-gradient(155deg, #111318 0%, #161b24 45%, #131519 100%)", image: null, imageFit: "cover", imageOpacity: 1 },
      elements: [],
    }),
  },
  {
    id: "review",
    label: "Review / Score",
    description: "Bewertung mit Score-Badge & Logo",
    build: (w, h) => {
      const f = frame(w, h);
      const z = sizes(f);
      const els: CanvasElement[] = [];
      const lh = Math.round(f.s * (f.ultra ? 0.075 : 0.058));
      // Score: top right on posts and stories, centred on the right in wide formats
      const sc = Math.round(f.wide ? (f.bottom - f.top) * 0.62 : f.s * 0.27);
      const ring = Math.round(f.s * 0.022);
      const scX = f.right - sc - ring;
      const scY = f.wide ? Math.round((f.h - sc) / 2) : f.top + ring;
      els.push(shape(scX - ring, scY - ring, sc + ring * 2, sc + ring * 2, "rgba(63,191,134,0.08)", { radius: 9999, borderColor: "rgba(63,191,134,0.45)", borderWidth: Math.max(2, Math.round(f.s * 0.004)), layerName: "Ring" }));
      els.push(score(8.5, scX, scY, sc, { layerName: "Score" }));
      els.push(logo(f.left, f.top, lh));
      const colW = f.wide ? scX - ring - f.left - f.s * 0.08 : f.right - f.left;
      const domain = Math.round(f.s * (f.ultra ? 0.042 : 0.03));
      els.push(text("criticore.cc", f.left, f.bottom - domain * 1.3, f.s * 0.5, Math.round(domain * 1.3), { fontFamily: BODY, fontWeight: 600, fontSize: domain, color: C.muted, lineHeight: 1.2, layerName: "Domain" }));
      els.push(
        ...stackUp(f, {
          x: f.left, w: colW, bottom: f.bottom - domain * 1.3 - z.gap,
          topLimit: f.wide ? f.top + lh + z.gap : scY + sc + ring + z.gap,
          kicker: pill("Im Test", f.left, 0, z.kicker, C.blue, C.ink),
          headline: "Titel des Spiels oder Films", headMax: Math.round(f.s * (f.ultra ? 0.13 : 0.1)),
          lead: f.ultra ? undefined : "Fazit in einem Satz: was das Spiel stark macht und wo es schwächelt.",
        }),
      );
      return { background: bg("radial-gradient(120% 90% at 88% 0%, #1f4583 0%, #121722 52%, #0b0d12 100%)"), elements: els };
    },
  },
  {
    id: "breaking",
    label: "Breaking News",
    description: "Eilmeldung mit Banner",
    build: (w, h) => {
      const f = frame(w, h);
      const z = sizes(f);
      const els: CanvasElement[] = [];
      // Red band across the full width, the label left in it
      const bandH = Math.round(f.s * (f.ultra ? 0.16 : 0.1));
      const bandY = f.tall ? f.top : 0;
      els.push(shape(0, bandY, w, bandH, `linear-gradient(90deg, ${C.red} 0%, #c7372e 100%)`, { layerName: "Banner" }));
      const label = Math.round(bandH * 0.36);
      els.push(icon("Radio", f.left, bandY + (bandH - label * 1.3) / 2, Math.round(label * 1.3), "#ffffff", { strokeWidth: 2.5 }));
      els.push(text("Breaking News", f.left + label * 1.8, bandY + (bandH - label * 1.15) / 2, w * 0.6, Math.round(label * 1.2), { fontSize: label, color: "#ffffff", uppercase: true, letterSpacing: Math.round(label * 0.14), lineHeight: 1.1 }));
      const ft = footer(f);
      els.push(...ft.elements);
      // Accent line left of the headline block
      const bar = Math.max(4, Math.round(f.s * 0.01));
      const block = stackUp(f, {
        x: f.left + bar * 4, w: f.right - f.left - bar * 4, bottom: ft.top, topLimit: bandY + bandH + z.gap * 1.5,
        headline: "Hier kommt die wichtigste Schlagzeile des Tages", headMax: Math.round(f.s * (f.ultra ? 0.12 : 0.095)),
        lead: f.ultra ? undefined : "Was passiert ist und was es bedeutet, in ein bis zwei Sätzen.",
      });
      const first = block[0];
      const last = block[block.length - 1];
      els.push(shape(f.left, first.y + bar, bar, last.y + last.h - first.y - bar, C.red, { radius: bar, layerName: "Akzent" }));
      els.push(...block);
      return { background: bg("radial-gradient(110% 70% at 0% 0%, #3a1416 0%, #12131a 55%, #0b0c10 100%)"), elements: els };
    },
  },
  {
    id: "quote",
    label: "Zitat",
    description: "Großes Zitat mit Quellenangabe",
    build: (w, h) => {
      const f = frame(w, h);
      const z = sizes(f);
      const els: CanvasElement[] = [];
      const mark = Math.round(f.s * (f.wide ? 0.62 : 0.55));
      els.push(text("“", f.right - mark * 0.62, f.top - mark * 0.12, mark * 0.62, Math.round(mark * 0.7), { fontSize: mark, fontFamily: "Georgia, 'Times New Roman', serif", color: "rgba(92,157,255,0.22)", lineHeight: 1, layerName: "Anführungszeichen" }));
      const ft = footer(f);
      els.push(...ft.elements);
      const attrib = Math.round(z.body * 0.95);
      const nameY = ft.top - attrib * 1.3 * 2 - z.gap * 0.2;
      els.push(shape(f.left, nameY - z.gap * 0.9, Math.round(f.s * 0.07), Math.max(4, Math.round(f.s * 0.007)), C.blue, { radius: 99, layerName: "Linie" }));
      els.push(text("CritiCore Redaktion", f.left, nameY, f.right - f.left, Math.round(attrib * 1.3), { fontFamily: BODY, fontWeight: 600, fontSize: attrib, color: C.paper, lineHeight: 1.3 }));
      els.push(text("zu Titel des Spiels oder Films", f.left, nameY + attrib * 1.3, f.right - f.left, Math.round(attrib * 1.3), { fontFamily: BODY, fontWeight: 400, fontSize: attrib, color: C.muted, lineHeight: 1.3 }));
      const quote = fitted("„Das beste Spiel des Jahres. Ein absolutes Meisterwerk.“", f.left, 0, (f.right - f.left) * (f.wide ? 0.82 : 1), nameY - z.gap * 2 - (f.top + mark * 0.3), { maxSize: Math.round(f.s * (f.ultra ? 0.11 : 0.085)), minSize: Math.round(f.s * 0.045), lineHeight: 1.12 }, { layerName: "Zitat" });
      quote.y = Math.round(nameY - z.gap * 2 - quote.h);
      els.push(quote);
      return { background: bg("radial-gradient(90% 80% at 100% 0%, #1b2f55 0%, #121722 50%, #0b0d12 100%)"), elements: els };
    },
  },
  {
    id: "announce",
    label: "Ankündigung",
    description: "Zentrierte Ankündigung mit Icon",
    build: (w, h) => {
      const f = frame(w, h);
      const z = sizes(f);
      const els: CanvasElement[] = [];
      const cx = w / 2;
      const ic = Math.round(f.s * (f.ultra ? 0.16 : 0.12));
      const ft = footer(f, { center: true });
      // Rings around the icon give depth without a picture
      const iconY = f.wide ? f.top : Math.round(f.top + (ft.top - f.top) * 0.12);
      for (const [i, r] of [ic * 1.5, ic * 2.3, ic * 3.2].entries()) {
        const d = Math.round(r * 2);
        const y = iconY + ic / 2 - d / 2;
        if (y < 0 || cx - d / 2 < 0 || y + d > h) continue;
        els.push(shape(Math.round(cx - d / 2), Math.round(y), d, d, "transparent", { radius: 9999, borderColor: `rgba(255,255,255,${0.16 - i * 0.04})`, borderWidth: Math.max(2, Math.round(f.s * 0.003)), layerName: "Ring" }));
      }
      els.push(icon("Sparkles", Math.round(cx - ic / 2), iconY, ic, "#ffffff", { strokeWidth: 1.75 }));
      const colW = Math.min(f.right - f.left, f.s * (f.wide ? 1.6 : 0.86));
      const x = Math.round(cx - colW / 2);
      els.push(...ft.elements);
      els.push(
        ...stackUp(f, {
          x, w: colW, bottom: ft.top - z.gap, topLimit: iconY + ic + z.gap * 1.2, align: "center",
          kicker: (() => { const p = pill("Bald auf CritiCore", 0, 0, z.kicker, "rgba(255,255,255,0.16)", "#ffffff"); p.x = Math.round(cx - p.w / 2); return p; })(),
          headline: "Etwas Großes kommt", headMax: Math.round(f.s * (f.ultra ? 0.14 : 0.11)),
          lead: "Bleib dran: am Freitag um 18 Uhr auf criticore.cc", leadColor: "rgba(255,255,255,0.82)", leadLines: f.ultra ? 1 : 2,
        }),
      );
      return { background: bg("radial-gradient(110% 85% at 50% 0%, #3d7bff 0%, #1252c2 42%, #0a1a40 100%)", C.blueDeep), elements: els };
    },
  },
  {
    id: "release",
    label: "Release-Termin",
    description: "Erscheinungsdatum groß, mit Titel",
    build: (w, h) => {
      const f = frame(w, h);
      const z = sizes(f);
      const els: CanvasElement[] = [];
      const ft = footer(f);
      els.push(...ft.elements);
      // Calendar sheet: month on a blue strip, the day big below
      const cw = Math.round(f.s * (f.wide ? 0.42 : 0.34));
      const ch = Math.round(cw * 1.12);
      const cardX = f.left;
      const cardY = f.wide ? Math.round((f.h - ch) / 2) : f.top;
      const strip = Math.round(ch * 0.26);
      const r = Math.round(cw * 0.1);
      els.push(shape(cardX, cardY, cw, ch, C.paper, { radius: r, layerName: "Kalenderblatt", shadow: { color: "rgba(0,0,0,0.45)", blur: Math.round(f.s * 0.04), x: 0, y: Math.round(f.s * 0.015) } }));
      els.push(shape(cardX, cardY, cw, strip, C.blue, { radius: r, layerName: "Monatsleiste" }));
      els.push(shape(cardX, cardY + strip - r, cw, r, C.blue, { layerName: "Monatsleiste unten" }));
      const month = Math.round(strip * 0.42);
      els.push(text("Oktober", cardX, cardY + (strip - month * 1.1) / 2, cw, Math.round(month * 1.15), { fontSize: month, color: C.ink, align: "center", uppercase: true, letterSpacing: Math.round(month * 0.12), lineHeight: 1.1 }));
      const day = Math.round((ch - strip) * 0.62);
      els.push(text("24", cardX, cardY + strip + (ch - strip - day) / 2, cw, Math.round(day * 1.02), { fontSize: day, color: C.ink, align: "center", lineHeight: 1, letterSpacing: -Math.round(day * 0.03) }));
      const textX = f.wide ? cardX + cw + f.s * 0.08 : f.left;
      els.push(
        ...stackUp(f, {
          x: textX, w: f.right - textX, bottom: f.wide ? cardY + ch : ft.top, topLimit: f.wide ? f.top : cardY + ch + z.gap * 1.2,
          kicker: pill("Erscheint am 24.10.", textX, 0, z.kicker, C.blue, C.ink),
          headline: "Titel des Spiels, Films oder der Serie", headMax: Math.round(f.s * (f.ultra ? 0.12 : 0.085)),
          lead: "PS5, Xbox Series X|S und PC", leadLines: 1,
        }),
      );
      return { background: bg("radial-gradient(100% 80% at 0% 0%, #17305c 0%, #121722 55%, #0b0d12 100%)"), elements: els };
    },
  },
  {
    id: "toplist",
    label: "Top-Liste",
    description: "Fünf Plätze untereinander",
    build: (w, h) => {
      const f = frame(w, h);
      const z = sizes(f);
      const els: CanvasElement[] = [];
      const ft = footer(f);
      els.push(...ft.elements);
      const kick = pill("Top 5", f.left, f.top, z.kicker, C.blue, C.ink);
      els.push(kick);
      const title = fitted("Die besten Spiele der Woche", f.left, kick.y + kick.h + z.gap * 0.6, f.right - f.left, f.s * (f.ultra ? 0.14 : 0.2), { maxSize: Math.round(f.s * (f.ultra ? 0.11 : 0.075)), minSize: Math.round(f.s * 0.045) }, { layerName: "Überschrift" });
      els.push(title);
      const cols = f.wide ? 2 : 1;
      const top = title.y + title.h + z.gap;
      const perCol = Math.ceil(5 / cols);
      const rowH = Math.floor((ft.top - top) / perCol);
      const colW = (f.right - f.left - (cols - 1) * f.s * 0.08) / cols;
      for (let i = 0; i < 5; i++) {
        const col = Math.floor(i / perCol);
        const x = Math.round(f.left + col * (colW + f.s * 0.08));
        const y = Math.round(top + (i % perCol) * rowH);
        const box = Math.round(Math.min(rowH * 0.74, f.s * 0.11));
        const by = y + Math.round((rowH - box) / 2);
        els.push(shape(x, by, box, box, i === 0 ? C.blue : "rgba(255,255,255,0.07)", { radius: Math.round(box * 0.24), borderColor: "rgba(255,255,255,0.1)", borderWidth: i === 0 ? 0 : 2, layerName: `Platz ${i + 1}` }));
        const n = Math.round(box * 0.52);
        els.push(text(String(i + 1), x, by + (box - n * 1.05) / 2, box, Math.round(n * 1.1), { fontSize: n, color: i === 0 ? C.ink : C.blue, align: "center", lineHeight: 1.05 }));
        const name = Math.round(Math.min(box * 0.56, f.s * 0.052));
        els.push(text(`Titel auf Platz ${i + 1}`, x + box + f.s * 0.035, by + (box - name * 1.15) / 2, colW - box - f.s * 0.035, Math.round(name * 1.2), { fontSize: name, color: C.paper, lineHeight: 1.15 }));
        if (i % perCol !== perCol - 1 && i !== 4) els.push(shape(x, y + rowH - 1, colW, 2, "rgba(255,255,255,0.07)", { layerName: "Trennlinie" }));
      }
      return { background: bg("linear-gradient(165deg, #172235 0%, #121722 45%, #0b0d12 100%)"), elements: els };
    },
  },
  {
    id: "question",
    label: "Community-Frage",
    description: "Frage an die Community mit Aufruf",
    build: (w, h) => {
      const f = frame(w, h);
      const z = sizes(f);
      const els: CanvasElement[] = [];
      // A huge question mark as a watermark, cut by the right edge of its box
      const qs = Math.round(f.s * (f.wide ? 0.95 : 0.8));
      els.push(text("?", w - qs * 0.62, f.wide ? (h - qs) / 2 : f.top - qs * 0.08, qs * 0.62, qs, { fontSize: qs, color: "rgba(92,157,255,0.13)", lineHeight: 1, layerName: "Fragezeichen" }));
      const ft = footer(f);
      els.push(...ft.elements);
      const cta = pill("Schreibt es in die Kommentare", f.left, 0, Math.round(z.body * 0.82), C.paper, C.ink, { uppercase: false, letterSpacing: 0, fontFamily: BODY, fontWeight: 700 });
      cta.y = Math.round(ft.top - cta.h);
      els.push(cta);
      els.push(icon("MessageCircle", f.left, f.top, Math.round(f.s * (f.ultra ? 0.1 : 0.075)), C.blue, { strokeWidth: 2 }));
      const q = fitted("Welches Spiel hat euch dieses Jahr am meisten überrascht?", f.left, 0, (f.right - f.left) * (f.wide ? 0.78 : 1), cta.y - z.gap * 1.4 - (f.top + f.s * 0.12), { maxSize: Math.round(f.s * (f.ultra ? 0.12 : 0.095)), minSize: Math.round(f.s * 0.045), lineHeight: 1.08 }, { layerName: "Frage" });
      q.y = Math.round(cta.y - z.gap * 1.4 - q.h);
      els.push(q);
      return { background: bg("radial-gradient(90% 75% at 100% 0%, #173a6e 0%, #121722 55%, #0b0d12 100%)"), elements: els };
    },
  },
  {
    id: "versus",
    label: "Duell",
    description: "Zwei Seiten gegeneinander, für Umfragen",
    build: (w, h) => {
      const f = frame(w, h);
      const z = sizes(f);
      const els: CanvasElement[] = [];
      // One diagonal cut through the middle, drawn by the gradient's hard stop
      els.push(shape(0, 0, w, h, `linear-gradient(${f.wide ? 100 : 104}deg, #1a5fd6 0%, #1252c2 49.9%, #c93a31 50.1%, #e5483d 100%)`, { layerName: "Flächen" }));
      els.push(shape(0, 0, w, h, "linear-gradient(180deg, rgba(10,12,18,0) 45%, rgba(10,12,18,0.55) 100%)", { layerName: "Verlauf" }));
      const vs = Math.round(f.s * (f.ultra ? 0.24 : 0.17));
      // Each side ends well before the VS circle in the middle
      const half = w / 2 - f.m - vs / 2 - f.s * 0.05;
      const labelMax = Math.round(f.s * (f.ultra ? 0.12 : 0.085));
      const sideY = f.tall ? f.top + (f.bottom - f.top) * 0.3 : f.top + (f.bottom - f.top) * 0.28;
      const side = (label: string, x: number, align: "left" | "right") => {
        const k = text("Team", x, sideY, half, Math.round(z.kicker * 1.3), { fontSize: z.kicker, color: "rgba(255,255,255,0.75)", uppercase: true, letterSpacing: Math.round(z.kicker * 0.2), align, lineHeight: 1.2 });
        const t = fitted(label, x, sideY + k.h + z.gap * 0.4, half, Math.round(labelMax * 1.04), { maxSize: labelMax, minSize: Math.round(f.s * 0.04), lineHeight: 1.04 }, { align, color: "#ffffff", layerName: label });
        return [k, t];
      };
      els.push(...side("Option A", f.left, "left"), ...side("Option B", w - f.m - half, "right"));
      const vsY = Math.round(f.h / 2 - vs / 2);
      els.push(shape(Math.round(w / 2 - vs / 2), vsY, vs, vs, C.paper, { radius: 9999, borderColor: C.ink, borderWidth: Math.round(vs * 0.06), layerName: "VS-Kreis" }));
      const vf = Math.round(vs * 0.36);
      els.push(text("VS", Math.round(w / 2 - vs / 2), vsY + (vs - vf * 1.05) / 2, vs, Math.round(vf * 1.1), { fontSize: vf, color: C.ink, align: "center", lineHeight: 1.05, letterSpacing: 1 }));
      const ft = footer(f, { center: true });
      els.push(...ft.elements);
      if (!f.ultra) {
        const cta = Math.round(z.body * 0.85);
        els.push(text("Stimmt in den Kommentaren ab: A oder B?", f.left, ft.top - cta * 1.3, f.right - f.left, Math.round(cta * 1.35), { fontFamily: BODY, fontWeight: 600, fontSize: cta, color: "#ffffff", align: "center", lineHeight: 1.3 }));
      }
      return { background: bg("linear-gradient(100deg, #1252c2 50%, #e5483d 50%)"), elements: els };
    },
  },
  {
    id: "facts",
    label: "Kurz erklärt",
    description: "Drei Punkte zum Thema, für Karussells",
    build: (w, h) => {
      const f = frame(w, h);
      const z = sizes(f);
      const els: CanvasElement[] = [];
      const ft = footer(f);
      els.push(...ft.elements);
      const kick = pill("Kurz erklärt", f.left, f.top, z.kicker, C.blue, C.ink);
      els.push(kick);
      const title = fitted("Das Wichtigste zum Thema in drei Punkten", f.left, kick.y + kick.h + z.gap * 0.6, f.right - f.left, f.s * (f.ultra ? 0.14 : 0.22), { maxSize: Math.round(f.s * (f.ultra ? 0.1 : 0.075)), minSize: Math.round(f.s * 0.045) }, { layerName: "Überschrift" });
      els.push(title);
      const points = ["Der wichtigste Punkt, in einem kurzen Satz erklärt.", "Was sich ändert oder was neu dazukommt.", "Was noch offen ist und wann es mehr gibt."];
      const cols = f.wide ? 3 : 1;
      const top = title.y + title.h + z.gap * 1.2;
      const gapX = f.s * 0.05;
      const colW = (f.right - f.left - (cols - 1) * gapX) / cols;
      const rowH = cols === 1 ? (ft.top - top) / 3 : ft.top - top;
      points.forEach((p, i) => {
        const x = Math.round(f.left + (cols === 1 ? 0 : i * (colW + gapX)));
        const y = Math.round(top + (cols === 1 ? i * rowH : 0));
        const dot = Math.round(f.s * (f.ultra ? 0.07 : 0.055));
        els.push(shape(x, y, dot, dot, "rgba(92,157,255,0.16)", { radius: 9999, borderColor: C.blue, borderWidth: Math.max(2, Math.round(dot * 0.06)), layerName: `Punkt ${i + 1}` }));
        const n = Math.round(dot * 0.48);
        els.push(text(String(i + 1), x, y + (dot - n * 1.05) / 2, dot, Math.round(n * 1.1), { fontSize: n, color: C.blue, align: "center", lineHeight: 1.05 }));
        const tx = cols === 1 ? x + dot + f.s * 0.035 : x;
        const ty = cols === 1 ? y : y + dot + z.gap * 0.6;
        const tw = cols === 1 ? colW - dot - f.s * 0.035 : colW;
        els.push(fitted(p, tx, ty, tw, (cols === 1 ? rowH : rowH - dot - z.gap * 0.6) - z.gap * 0.5, { maxSize: Math.round(z.body * (cols === 1 ? 1.2 : 1.45)), minSize: Math.round(z.body * 0.75), fontFamily: BODY, fontWeight: 500, lineHeight: 1.32 }, { color: C.paper, layerName: `Punkt ${i + 1} Text` }));
      });
      return { background: bg("linear-gradient(165deg, #172235 0%, #121722 45%, #0b0d12 100%)"), elements: els };
    },
  },
];

export const newSlide = (formatId: string, w: number, h: number, templateId = "blank"): Slide => {
  const tpl = TEMPLATES.find((t) => t.id === templateId) || TEMPLATES[0];
  const { background, elements } = tpl.build(w, h);
  return { id: uid(), formatId, width: w, height: h, background, elements };
};
