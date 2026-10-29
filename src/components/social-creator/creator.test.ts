import { describe, expect, it } from "vitest";
import { snapAngle, snapRect } from "./snapping";
import { effectStyle, filterCss, layerName } from "./effects";
import { authorBadge, slideFromArticle, summaryLength } from "./articleSlide";
import { clipText, htmlToText } from "./articleSummary";
import { countLines, fitText } from "./textFit";
import { alignUnits, cloneElements, distributeUnits, idsInRect, restack, scaleElements, stylePatches, toggleIds, withGroup } from "./selection";
import { TEMPLATES, newSlide } from "./templates";
import type { CanvasElement } from "./types";

describe("snapping", () => {
  const canvas = { w: 1000, h: 1000 };

  it("snaps the centre to the canvas centre and reports the guide", () => {
    const r = snapRect({ x: 396, y: 100, w: 200, h: 100 }, [], canvas, 8);
    expect(r.x).toBe(400);
    expect(r.guides.v).toEqual([500]);
    expect(r.guides.h).toEqual([]);
    expect(r.y).toBe(100);
  });

  it("lines up with the edges of other elements", () => {
    const other = { x: 120, y: 300, w: 300, h: 80 };
    const r = snapRect({ x: 125, y: 386, w: 100, h: 50 }, [other], canvas, 8);
    expect(r.x).toBe(120);
    expect(r.y).toBe(380);
    expect(r.guides.v).toContain(120);
    expect(r.guides.h).toContain(380);
  });

  it("leaves elements alone that are not close to anything", () => {
    const r = snapRect({ x: 237, y: 611, w: 50, h: 50 }, [], canvas, 6);
    expect(r).toEqual({ x: 237, y: 611, guides: { v: [], h: [] } });
  });

  it("rounds rotation to 15° steps only when close", () => {
    expect(snapAngle(44, false)).toBe(45);
    expect(snapAngle(52, false)).toBe(52);
    expect(snapAngle(-3, false)).toBe(0);
    expect(snapAngle(44, true)).toBe(44);
    expect(snapAngle(362, false)).toBe(0);
  });
});

describe("effects", () => {
  const text = newSlide("ig-post", 1080, 1080, "review").elements.find((e) => e.type === "text") as CanvasElement;

  it("gives text a text shadow and an outline, other elements a drop shadow", () => {
    const shadow = { color: "#000", blur: 10, x: 0, y: 4 };
    expect(effectStyle({ ...text, shadow, strokeColor: "#fff", strokeWidth: 2 } as CanvasElement)).toMatchObject({ textShadow: "0px 4px 10px #000", WebkitTextStroke: "2px #fff" });
    const shape = { id: "s", type: "shape", x: 0, y: 0, w: 10, h: 10, fill: "#f00", radius: 0, borderColor: "#000", borderWidth: 0, shadow } as CanvasElement;
    expect(effectStyle(shape).filter).toBe("drop-shadow(0px 4px 10px #000)");
    expect(effectStyle({ ...shape, flipX: true } as CanvasElement).transform).toBe("scale(-1, 1)");
  });

  it("writes only the picture corrections that change something", () => {
    expect(filterCss({ brightness: 1, contrast: 1.2, saturate: 1, grayscale: 0, blur: 3 })).toBe("contrast(1.2) blur(3px)");
    expect(filterCss({ brightness: 1, contrast: 1, saturate: 1, grayscale: 0, blur: 0 })).toBe("");
  });

  it("names layers after their content", () => {
    expect(layerName({ ...text, layerName: undefined, text: "  Hallo\nWelt " } as CanvasElement, "Text")).toBe("Hallo Welt");
    expect(layerName({ ...text, layerName: "Titel" } as CanvasElement, "Text")).toBe("Titel");
  });
});

const FORMATS: [string, number, number][] = [["ig-post", 1080, 1080], ["ig-portrait", 1080, 1350], ["ig-story", 1080, 1920], ["x-post", 1200, 675], ["x-header", 1500, 500]];
const WATERMARKS = new Set(["Fragezeichen", "Anführungszeichen"]);

type Box = { x: number; y: number; w: number; h: number };
const overlap = (a: Box, b: Box, tol = 2) => a.x + tol < b.x + b.w && b.x + tol < a.x + a.w && a.y + tol < b.y + b.h && b.y + tol < a.y + a.h;

/** Text that fits its box (top-aligned, clipped below), and no text over other text or the logo */
function expectClean(elements: CanvasElement[], w: number, h: number, where: string) {
  for (const el of elements) {
    expect(el.x, where).toBeGreaterThanOrEqual(-1);
    expect(el.y, where).toBeGreaterThanOrEqual(-1);
    expect(el.x + el.w, where).toBeLessThanOrEqual(w + 1);
    expect(el.y + el.h, where).toBeLessThanOrEqual(h + 1);
    if (el.type === "text" && !WATERMARKS.has(el.layerName ?? "")) {
      const inner = el.w - el.padding * 2;
      const lines = countLines(el.text, { fontFamily: el.fontFamily, fontWeight: el.fontWeight, width: inner, maxHeight: 0, maxSize: el.fontSize, minSize: el.fontSize, lineHeight: el.lineHeight, letterSpacing: el.letterSpacing, uppercase: el.uppercase }, el.fontSize);
      expect(lines * el.fontSize * el.lineHeight + el.padding * 2, `${where}: "${el.text}" is cut off`).toBeLessThanOrEqual(el.h + el.fontSize * 0.35);
    }
  }
  const solid = elements.filter((e) => (e.type === "text" && !WATERMARKS.has(e.layerName ?? "")) || (e.type === "image" && e.layerName === "Logo"));
  const name = (e: CanvasElement) => (e.type === "text" ? e.text : e.layerName);
  for (let i = 0; i < solid.length; i++) {
    for (let j = i + 1; j < solid.length; j++) {
      expect(overlap(solid[i], solid[j]), `${where}: "${name(solid[i])}" overlaps "${name(solid[j])}"`).toBe(false);
    }
  }
}

describe("slides", () => {
  it("lays out every template in every format without clipped or overlapping text", () => {
    for (const tpl of TEMPLATES) {
      for (const [id, w, h] of FORMATS) {
        expectClean(newSlide(id, w, h, tpl.id).elements, w, h, `${tpl.id} ${id}`);
      }
    }
    expect(new Set(TEMPLATES.map((t) => t.id)).size).toBe(TEMPLATES.length);
  });

  it("turns an article into a slide with cover, category, headline and summary", () => {
    const summary = "Team Cherry liefert nach sieben Jahren: größer, härter und schöner als Hollow Knight.";
    const slide = slideFromArticle({ title: "Silksong im Test", category: "games", cover: "https://example.test/cover.jpg", summary }, "ig-story");
    expect(slide).toMatchObject({ width: 1080, height: 1920, background: { type: "image", image: "https://example.test/cover.jpg" } });
    const texts = slide.elements.filter((e) => e.type === "text").map((e) => (e.type === "text" ? e.text : ""));
    expect(texts).toEqual(expect.arrayContaining(["Games", "Silksong im Test", summary, "criticore.cc"]));
    // Category above the headline, the headline above the summary
    const y = (t: string) => slide.elements.find((e) => e.type === "text" && e.text === t)!.y;
    expect(y("Games")).toBeLessThan(y("Silksong im Test"));
    expect(y("Silksong im Test")).toBeLessThan(y(summary));
    const noCover = slideFromArticle({ title: "Ohne Bild", category: null, cover: null }, "x-post");
    expect(noCover.background.type).toBe("gradient");
    expect(noCover.elements.some((e) => e.layerName === "Zusammenfassung")).toBe(false);
  });

  it("keeps long headlines and summaries inside every format", () => {
    const title = "Hollow Knight: Silksong im großen Test: Team Cherry liefert nach sieben Jahren endlich ab, und das Warten hat sich gelohnt";
    const long = "Größer, härter und schöner als der Vorgänger: Silksong schickt Hornet durch ein neues Königreich voller Bosse, Werkzeuge und Geheimnisse, und das für 20 Euro. ";
    for (const [id, w, h] of FORMATS) {
      const slide = slideFromArticle({ title, category: "games", cover: null, summary: clipText(long.repeat(2), summaryLength(id)) }, id);
      expectClean(slide.elements, w, h, `article ${id}`);
    }
  });
});

describe("author on article slides", () => {
  const author = { userId: "11111111-2222-4333-8444-555555555555", name: "Maximiliane Schulte-Brandenburg", avatar: null };

  it("puts picture and name into the footer instead of the domain, in every format", () => {
    for (const [id, w, h] of FORMATS) {
      const slide = slideFromArticle({ title: "Silksong im Test", category: "games", cover: null, summary: "Kurz und gut.", author }, id);
      const texts = slide.elements.filter((e) => e.type === "text").map((e) => (e.type === "text" ? e.text : ""));
      expect(texts, id).toContain(author.name);
      expect(texts, id).not.toContain("criticore.cc");
      expectClean(slide.elements, w, h, `author ${id}`);
      const picture = slide.elements.find((e) => e.layerName === "Autor Bild")!;
      // A default picture when the profile has none, round and in one group with the name
      expect(picture).toMatchObject({ type: "image", radius: 9999, fit: "cover" });
      expect((picture as { src: string }).src).toBeTruthy();
      expect(picture.groupId).toBe(slide.elements.find((e) => e.layerName === "Autor")!.groupId);
    }
  });

  it("marks an opinion piece with MEINUNG instead of the category", () => {
    const slide = slideFromArticle({ title: "Warum Silksong zu schwer ist", category: "games", cover: null, type: "opinion", language: "de" }, "ig-post");
    const kicker = slide.elements.find((e) => e.layerName === "Meinung");
    expect(kicker).toMatchObject({ type: "text", text: "Meinung", uppercase: true });
    expect(slide.elements.some((e) => e.type === "text" && e.text === "Games")).toBe(false);
    const en = slideFromArticle({ title: "Why", category: "games", cover: null, type: "opinion", language: "en" }, "x-post");
    expect(en.elements.find((e) => e.layerName === "Meinung")).toMatchObject({ text: "Opinion" });
    const review = slideFromArticle({ title: "Silksong im Test", category: "games", cover: null, type: "review", language: "de" }, "ig-post");
    expect(review.elements.find((e) => e.layerName === "Meinung")).toMatchObject({ text: "Review · Meinung" });
    expectClean(review.elements, 1080, 1080, "review slide");
  });

  it("keeps the domain when the author is unknown", () => {
    const slide = slideFromArticle({ title: "Ohne Autor", category: null, cover: null }, "ig-post");
    expect(slide.elements.some((e) => e.type === "text" && e.text === "criticore.cc")).toBe(true);
  });

  it("aligns the badge to the right edge and shrinks long names instead of wrapping", () => {
    const [pic, name] = authorBadge(author, 1000, 100, 60, { align: "right", maxWidth: 300 });
    expect(name.x + name.w).toBe(1000);
    expect(pic.x + pic.w).toBeLessThan(name.x);
    expect(name.x + name.w - pic.x).toBeLessThanOrEqual(300 + 30);
  });
});

describe("text fitting", () => {
  const base = { fontFamily: "Inter", fontWeight: 700, width: 500, maxHeight: 200, maxSize: 80, minSize: 20, lineHeight: 1.1 };

  it("wraps at words and breaks words that are wider than the box", () => {
    expect(countLines("eins zwei drei", { ...base, width: 10_000 }, 40)).toBe(1);
    expect(countLines("eins zwei drei", { ...base, width: 120 }, 40)).toBe(3);
    expect(countLines("Donaudampfschifffahrtsgesellschaft", { ...base, width: 200 }, 40)).toBeGreaterThan(1);
    expect(countLines("a\nb", base, 40)).toBe(2);
  });

  it("shrinks the font until the text fits the height", () => {
    expect(fitText("Kurz", base).fontSize).toBe(80);
    const long = fitText("Eine sehr lange Überschrift, die bei voller Größe niemals in zwei Zeilen passt", base);
    expect(long.fontSize).toBeLessThan(80);
    expect(long.lines * long.fontSize * base.lineHeight).toBeLessThanOrEqual(base.maxHeight);
  });
});

describe("article summary", () => {
  it("reads article HTML as text with paragraph breaks", () => {
    expect(htmlToText("<p>Erster <strong>Absatz</strong>.</p><p>Zweiter&nbsp;Absatz.</p><figure><img src='x'><figcaption>Bild</figcaption></figure>")).toBe("Erster Absatz.\n\nZweiter Absatz.");
  });

  it("cuts after a sentence, else after a word", () => {
    expect(clipText("Kurz genug.", 50)).toBe("Kurz genug.");
    expect(clipText("Der erste Satz ist lang genug. Der zweite Satz passt nicht mehr hinein.", 50)).toBe("Der erste Satz ist lang genug.");
    expect(clipText("Ein einziger langer Satz ohne Punkt, der weiter und weiter geht", 30)).toBe("Ein einziger langer Satz ohne …");
  });
});

describe("selection", () => {
  const box = (id: string, x: number, y: number, w = 100, h = 50, extra: Partial<CanvasElement> = {}) =>
    ({ id, type: "shape", x, y, w, h, fill: "#fff", radius: 0, borderColor: "#000", borderWidth: 0, ...extra }) as CanvasElement;

  it("selects groups as a whole and toggles with Shift", () => {
    const els = [box("a", 0, 0, 100, 50, { groupId: "g" }), box("b", 200, 0, 100, 50, { groupId: "g" }), box("c", 0, 200)];
    expect(withGroup(els, "a")).toEqual(["a", "b"]);
    expect(withGroup(els, "c")).toEqual(["c"]);
    expect(toggleIds(["c"], ["a", "b"])).toEqual(["c", "a", "b"]);
    expect(toggleIds(["c", "a", "b"], ["a", "b"])).toEqual(["c"]);
  });

  it("picks what the marquee touches, without hidden or locked elements, groups completed", () => {
    const els = [box("a", 0, 0, 100, 50, { groupId: "g" }), box("b", 500, 500, 100, 50, { groupId: "g" }), box("c", 0, 100, 50, 50, { locked: true }), box("d", 60, 60, 20, 20, { hidden: true })];
    expect(idsInRect(els, { x: 50, y: 20, w: 100, h: 200 })).toEqual(["a", "b"]);
  });

  it("aligns units to the selection, and a single one to the slide", () => {
    const els = [box("a", 10, 0), box("b", 300, 40, 50), box("c", 120, 90, 100, 50, { groupId: "g" }), box("d", 260, 90, 100, 50, { groupId: "g" })];
    const left = alignUnits(els, "left", { w: 1000, h: 1000 });
    expect(left.a.x).toBe(10);
    expect(left.b.x).toBe(10);
    // The group moves as one: both members by the same distance
    expect(left.c.x).toBe(10);
    expect(left.d.x).toBe(150);
    expect(alignUnits([box("a", 10, 0)], "hcenter", { w: 1000, h: 1000 }).a.x).toBe(450);
  });

  it("distributes three or more with equal gaps", () => {
    const els = [box("a", 0, 0), box("b", 130, 0), box("c", 500, 0)];
    const d = distributeUnits(els, "h");
    expect(d.a.x).toBe(0);
    expect(d.b.x).toBe(250);
    expect(d.c.x).toBe(500);
    expect(distributeUnits(els.slice(0, 2), "h")).toEqual({});
  });

  it("scales a selection around the anchor, text sizes with it", () => {
    const text = newSlide("ig-post", 1080, 1080, "review").elements.find((e) => e.type === "text") as Extract<CanvasElement, { type: "text" }>;
    const p = scaleElements([{ ...text, x: 100, y: 100, w: 200, h: 50, fontSize: 40 }, box("s", 300, 150, 100, 100)], 2, { x: 100, y: 100 });
    expect(p[text.id]).toMatchObject({ x: 100, y: 100, w: 400, h: 100, fontSize: 80 });
    expect(p.s).toMatchObject({ x: 500, y: 200, w: 200, h: 200 });
  });

  it("copies get new ids, and copied groups their own group", () => {
    const [a, b] = cloneElements([box("a", 0, 0, 100, 50, { groupId: "g", locked: true }), box("b", 10, 10, 100, 50, { groupId: "g" })], 24, 24);
    expect(a.id).not.toBe("a");
    expect(a.groupId).toBeTruthy();
    expect(a.groupId).not.toBe("g");
    expect(a.groupId).toBe(b.groupId);
    expect(a).toMatchObject({ x: 24, y: 24, locked: false });
  });

  it("pastes the look onto elements of the same type, never place or content", () => {
    const from = box("a", 0, 0, 100, 50, { fill: "#f00", radius: 20, opacity: 0.5 });
    const p = stylePatches(from, [from, box("b", 300, 300)]);
    expect(p.a).toBeUndefined();
    expect(p.b).toMatchObject({ fill: "#f00", radius: 20, opacity: 0.5 });
    expect(p.b).not.toHaveProperty("x");
  });

  it("restacks several elements and keeps their order", () => {
    const els = ["a", "b", "c", "d"].map((id, i) => box(id, i, 0));
    const ids = (list: CanvasElement[]) => list.map((e) => e.id).join("");
    expect(ids(restack(els, ["a", "c"], "front"))).toBe("bdac");
    expect(ids(restack(els, ["b", "d"], "back"))).toBe("bdac");
    expect(ids(restack(els, ["a", "b"], 1))).toBe("cabd");
    expect(ids(restack(els, ["d"], -1))).toBe("abdc");
  });
});
