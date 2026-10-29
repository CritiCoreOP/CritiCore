import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { findTextRange } from "./textRange";

let editor: Editor | null = null;
const make = (content: string) => (editor = new Editor({ extensions: [StarterKit], content }));

describe("findTextRange", () => {
  afterEach(() => editor?.destroy());

  it("finds a quote across bold and plain text and replaces just that part", () => {
    const e = make("<h2>Fazit</h2><p>Ein <strong>sehr guter</strong> Teil mit Fehlerr am Ende.</p>");
    const range = findTextRange(e.state.doc, "guter Teil mit Fehlerr");
    expect(range).not.toBeNull();
    e.chain().insertContentAt(range!, { type: "text", text: "guter Teil mit Fehler" }).run();
    expect(e.getText()).toContain("Ein sehr guter Teil mit Fehler am Ende.");
    expect(e.getText()).toContain("Fazit");
  });

  it("returns null for text that is not there or spans two paragraphs", () => {
    const e = make("<p>Erster Absatz.</p><p>Zweiter Absatz.</p>");
    expect(findTextRange(e.state.doc, "Dritter")).toBeNull();
    expect(findTextRange(e.state.doc, "Absatz. Zweiter")).toBeNull();
    expect(findTextRange(e.state.doc, "")).toBeNull();
  });

  it("finds text in headings and list items", () => {
    const e = make("<h2>Grafik und Sound</h2><ul><li><p>Stabile 60 FPS</p></li></ul>");
    expect(e.state.doc.textBetween(...Object.values(findTextRange(e.state.doc, "und Sound")!) as [number, number])).toBe("und Sound");
    expect(e.state.doc.textBetween(...Object.values(findTextRange(e.state.doc, "60 FPS")!) as [number, number])).toBe("60 FPS");
  });
});
