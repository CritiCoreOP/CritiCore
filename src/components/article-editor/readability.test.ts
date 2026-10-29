import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { analyzeReadability, splitSentences } from "./readability";

let editor: Editor | null = null;
const make = (content: string) => (editor = new Editor({ extensions: [StarterKit], content }));

const LONG =
  "Das neue Spiel bietet eine riesige offene Welt mit vielen Nebenaufgaben, die man in seinem eigenen Tempo erkunden kann, während die Hauptgeschichte sich langsam entfaltet und dabei immer wieder überraschende Wendungen nimmt.";

describe("splitSentences", () => {
  it("does not end a sentence at abbreviations or dates", () => {
    const text = "Es erscheint am 7. Oktober, z. B. für PC. Der Preis liegt bei ca. 70 Euro! Wirklich?";
    const parts = splitSentences(text).map(([s, e]) => text.slice(s, e));
    expect(parts).toEqual(["Es erscheint am 7. Oktober, z. B. für PC.", "Der Preis liegt bei ca. 70 Euro!", "Wirklich?"]);
  });
});

describe("analyzeReadability", () => {
  afterEach(() => editor?.destroy());

  it("counts words and sentences and flags a long sentence in running text", () => {
    const e = make(`<h2>Ein Titel</h2><p>Kurzer Satz. ${LONG}</p>`);
    const report = analyzeReadability(e.state.doc, "de");
    expect(report.sentences).toBe(3);
    const long = report.hints.filter((h) => h.kind === "long");
    expect(long).toHaveLength(1);
    expect(e.state.doc.textBetween(long[0].from, long[0].to)).toBe(LONG);
    expect(long[0].words).toBeGreaterThan(25);
  });

  it("finds fillers and stock phrases as whole words, also across formatting", () => {
    const e = make("<p>Das ist <strong>eigentlich</strong> ein atemberaubend gutes Spiel. Eigentümlich ist es nicht.</p>");
    const hints = analyzeReadability(e.state.doc, "de").hints;
    expect(hints.map((h) => [h.kind, e.state.doc.textBetween(h.from, h.to)])).toEqual([
      ["filler", "eigentlich"],
      ["cliche", "atemberaubend"],
    ]);
  });

  it("uses the article language and skips sentence checks for Thai", () => {
    const e = make("<p>It is basically a groundbreaking game.</p>");
    expect(analyzeReadability(e.state.doc, "en").hints.map((h) => h.kind)).toEqual(["filler", "cliche"]);
    expect(analyzeReadability(e.state.doc, "th").sentenceCheck).toBe(false);
  });
});
