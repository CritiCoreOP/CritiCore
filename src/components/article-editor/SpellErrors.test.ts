import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { applyCorrections, getSpellErrors, locateCorrections, SpellErrors, spellErrorAt } from "./SpellErrors";
import { findAllTextRanges } from "./textRange";

let editor: Editor | null = null;
const make = (content: string) => (editor = new Editor({ extensions: [StarterKit, SpellErrors], content }));

describe("locateCorrections", () => {
  afterEach(() => editor?.destroy());

  it("uses the context, so a correct word elsewhere stays untouched", () => {
    const e = make("<p>Ich glaube, das es gut ist. Das Spiel, das wir testen.</p>");
    const errors = locateCorrections(e.state.doc, [
      { original: "das", correction: "dass", reason: "Konjunktion", context: "glaube, das es gut" },
    ]);
    expect(errors).toHaveLength(1);
    expect(e.state.doc.textBetween(errors[0].from, errors[0].to)).toBe("das");
    applyCorrections(e, [{ original: "das", correction: "dass", reason: "", context: "glaube, das es gut" }]);
    expect(e.getText()).toBe("Ich glaube, dass es gut ist. Das Spiel, das wir testen.");
  });

  it("without context only places a word that occurs once", () => {
    const e = make("<p>Das Spiell ist gut, das Spiel auch, das ist klar.</p>");
    expect(locateCorrections(e.state.doc, [{ original: "Spiell", correction: "Spiel", reason: "" }])).toHaveLength(1);
    expect(locateCorrections(e.state.doc, [{ original: "das", correction: "dass", reason: "" }])).toHaveLength(0);
  });

  it("keeps bold and links when the error is inside them", () => {
    const e = make('<p>Ein <strong>fantastischs</strong> Spiel von <a href="https://example.com">Nintedo</a>.</p>');
    applyCorrections(e, [
      { original: "fantastischs", correction: "fantastisches", reason: "", context: "Ein fantastischs Spiel" },
      { original: "Nintedo", correction: "Nintendo", reason: "", context: "Spiel von Nintedo" },
    ]);
    expect(e.getHTML()).toContain("<strong>fantastisches</strong>");
    expect(e.getHTML()).toContain('href="https://example.com"');
    expect(e.getHTML()).toContain(">Nintendo</a>");
  });

  it("finds whole words only when asked", () => {
    const e = make("<p>dass das</p>");
    expect(findAllTextRanges(e.state.doc, "das")).toHaveLength(2);
    expect(findAllTextRanges(e.state.doc, "das", { wholeWord: true })).toHaveLength(1);
  });
});

describe("SpellErrors extension", () => {
  afterEach(() => editor?.destroy());

  const setup = () => {
    const e = make("<p>Erster Fehlr hier.</p><p>Noch ein Feler dort.</p>");
    e.commands.setSpellErrors(
      locateCorrections(e.state.doc, [
        { original: "Fehlr", correction: "Fehler", reason: "Tippfehler", context: "Erster Fehlr hier" },
        { original: "Feler", correction: "Fehler", reason: "Tippfehler", context: "ein Feler dort" },
      ]),
    );
    return e;
  };

  it("underlines the errors and follows edits before them", () => {
    const e = setup();
    expect(e.view.dom.querySelectorAll(".spell-error")).toHaveLength(2);
    e.commands.insertContentAt(1, "Mein ");
    const errors = getSpellErrors(e.state);
    expect(errors.map((x) => e.state.doc.textBetween(x.from, x.to))).toEqual(["Fehlr", "Feler"]);
  });

  it("drops an error whose word was changed by hand", () => {
    const e = setup();
    const [first] = getSpellErrors(e.state);
    e.commands.insertContentAt({ from: first.from, to: first.to }, "Irrtum");
    expect(getSpellErrors(e.state).map((x) => x.original)).toEqual(["Feler"]);
  });

  it("applies all corrections as one undo step", () => {
    const e = setup();
    e.commands.applySpellErrors();
    expect(e.getText()).toBe("Erster Fehler hier.\n\nNoch ein Fehler dort.");
    expect(getSpellErrors(e.state)).toHaveLength(0);
    e.commands.undo();
    expect(e.getText()).toBe("Erster Fehlr hier.\n\nNoch ein Feler dort.");
  });

  it("applies or dismisses a single error and finds the one under the cursor", () => {
    const e = setup();
    const [first, second] = getSpellErrors(e.state);
    e.commands.setTextSelection(first.from + 2);
    expect(spellErrorAt(e)?.id).toBe(first.id);
    e.commands.dismissSpellErrors([first.id]);
    e.commands.applySpellErrors([second.id]);
    expect(e.getText()).toBe("Erster Fehlr hier.\n\nNoch ein Fehler dort.");
    expect(getSpellErrors(e.state)).toHaveLength(0);
  });
});
