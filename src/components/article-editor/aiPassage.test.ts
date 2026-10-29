import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { passageHtml, replaceWithHtml, trimmedSelection } from "./aiPassage";
import { findTextRange } from "./textRange";

let editor: Editor | null = null;
const make = (content: string) => (editor = new Editor({ extensions: [StarterKit], content }));

describe("AI passage round trip", () => {
  afterEach(() => editor?.destroy());

  it("sends a partial selection with its link and merges the answer back into the paragraph", () => {
    const e = make('<p>Vorher. Laut <a href="https://example.com/news">Bericht</a> kommt es bald. Nachher.</p>');
    const range = findTextRange(e.state.doc, "Laut Bericht kommt es bald.")!;
    // Inside one paragraph the passage is inline HTML
    expect(passageHtml(e, range)).toBe('Laut <a target="_blank" rel="noopener noreferrer nofollow" href="https://example.com/news">Bericht</a> kommt es bald.');

    replaceWithHtml(e, range, '<p>Dem <a href="https://example.com/news">Bericht</a> zufolge erscheint es bald.</p>');
    expect(e.state.doc.childCount).toBe(1);
    expect(e.getText()).toBe("Vorher. Dem Bericht zufolge erscheint es bald. Nachher.");
    expect(e.getHTML()).toContain('href="https://example.com/news"');
  });

  it("keeps two selected paragraphs as two paragraphs", () => {
    const e = make("<p>Eins alt.</p><p>Zwei alt.</p><p>Drei.</p>");
    const from = findTextRange(e.state.doc, "Eins alt.")!.from;
    const to = findTextRange(e.state.doc, "Zwei alt.")!.to;
    replaceWithHtml(e, { from, to }, "<p>Eins neu.</p><p>Zwei neu.</p>");
    expect(e.getText()).toBe("Eins neu.\n\nZwei neu.\n\nDrei.");
  });

  it("drops scripts and handlers from the answer and undoes in one step", () => {
    const e = make("<p>Alt.</p>");
    const range = findTextRange(e.state.doc, "Alt.")!;
    replaceWithHtml(e, range, '<p>Neu<img src="x" onerror="alert(1)"><script>alert(2)</script>.</p>');
    expect(e.getHTML()).not.toMatch(/onerror|script/);
    e.commands.undo();
    expect(e.getText()).toBe("Alt.");
  });

  it("leaves the spaces around a selection in place", () => {
    const e = make("<p>Das ist ein Satz hier.</p>");
    const r = findTextRange(e.state.doc, " ein Satz ")!;
    e.commands.setTextSelection(r);
    const trimmed = trimmedSelection(e);
    expect(e.state.doc.textBetween(trimmed.from, trimmed.to)).toBe("ein Satz");
    replaceWithHtml(e, trimmed, "<p>eine Zeile</p>");
    expect(e.getText()).toBe("Das ist eine Zeile hier.");
  });
});
